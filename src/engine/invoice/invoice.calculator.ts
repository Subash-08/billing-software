import {
  InvoiceCalculationInput,
  InvoiceCalculationResult,
  CalculatedInvoiceItem,
  CalculatedAdditionalCharge,
} from './invoice.types';
import { calculateLineGst } from '../gst/gst.calculator';
import { paiseToRupees } from '@/lib/money';
import {
  calculateLineDiscountPaise,
  calculateTotalInvoiceDiscountPaise,
  allocateInvoiceDiscountLargestRemainder,
} from './invoice.discount';
import { aggregateGstRateSummaries } from './invoice.aggregator';
import { applyInvoiceRoundOff } from './invoice.rounding';
import {
  EmptyInvoiceItemsError,
  UnsafeIntegerError,
  MissingAdditionalChargeTaxRateError,
  InvalidInvoiceInputError,
} from './invoice.errors';

export function calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
  // 1. Validation & Input Defenses
  if (!input.items || input.items.length === 0) {
    throw new EmptyInvoiceItemsError();
  }

  // 2. Line Gross & Line Discount Calculations
  const rawItemsCount = input.items.length;
  const grossLineAmounts: number[] = [];
  const lineDiscountAmounts: number[] = [];
  const lineTaxReducingDiscounts: number[] = [];
  const lineCommercialDiscounts: number[] = [];
  const netLineAmountsBeforeInvoiceDiscount: number[] = [];

  let subTotalPaise = 0;
  let totalLineDiscountPaise = 0;
  let totalLineTaxReducingDiscountPaise = 0;
  let totalLineCommercialDiscountPaise = 0;

  for (let i = 0; i < rawItemsCount; i++) {
    const item = input.items[i];
    if (typeof item.ratePaise !== 'number' || !Number.isSafeInteger(item.ratePaise) || item.ratePaise < 0) {
      throw new UnsafeIntegerError(`items[${i}].ratePaise`, item.ratePaise);
    }
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new InvalidInvoiceInputError(`Item '${item.name}' requires a positive quantity.`);
    }

    // Multiplication safe integer defense
    const grossLinePaise = Math.round(item.quantity * item.ratePaise);
    if (!Number.isSafeInteger(grossLinePaise)) {
      throw new UnsafeIntegerError(`items[${i}] grossLinePaise overflow`, grossLinePaise);
    }

    const lineDiscountInput = item.lineDiscount;
    const lineDiscountPaise = calculateLineDiscountPaise(grossLinePaise, lineDiscountInput, item.name);

    const discountTreatment = lineDiscountInput?.taxTreatment || 'REDUCE_TAXABLE_VALUE';
    let lineTaxReducingPaise = 0;
    let lineCommercialPaise = 0;

    if (discountTreatment === 'REDUCE_TAXABLE_VALUE') {
      lineTaxReducingPaise = lineDiscountPaise;
    } else {
      lineCommercialPaise = lineDiscountPaise;
    }

    const netLineBeforeInvoiceDiscount = grossLinePaise - lineTaxReducingPaise;

    grossLineAmounts.push(grossLinePaise);
    lineDiscountAmounts.push(lineDiscountPaise);
    lineTaxReducingDiscounts.push(lineTaxReducingPaise);
    lineCommercialDiscounts.push(lineCommercialPaise);
    netLineAmountsBeforeInvoiceDiscount.push(netLineBeforeInvoiceDiscount);

    subTotalPaise += grossLinePaise;
    totalLineDiscountPaise += lineDiscountPaise;
    totalLineTaxReducingDiscountPaise += lineTaxReducingPaise;
    totalLineCommercialDiscountPaise += lineCommercialPaise;
  }

  // 3. Invoice-Level Discount Calculation & Largest-Remainder Allocation
  const invoiceDiscountInput = input.invoiceDiscount;
  const invoiceDiscountTreatment = invoiceDiscountInput?.taxTreatment || 'REDUCE_TAXABLE_VALUE';

  // Base for invoice discount calculation
  const eligibleBaseForInvoiceDiscount = netLineAmountsBeforeInvoiceDiscount.reduce((a, b) => a + b, 0);
  const totalInvoiceDiscountPaise = calculateTotalInvoiceDiscountPaise(eligibleBaseForInvoiceDiscount, invoiceDiscountInput);

  let allocatedInvoiceTaxReducingDiscounts: number[] = new Array(rawItemsCount).fill(0);
  let allocatedInvoiceCommercialDiscounts: number[] = new Array(rawItemsCount).fill(0);

  if (invoiceDiscountTreatment === 'REDUCE_TAXABLE_VALUE') {
    allocatedInvoiceTaxReducingDiscounts = allocateInvoiceDiscountLargestRemainder(
      netLineAmountsBeforeInvoiceDiscount,
      totalInvoiceDiscountPaise
    );
  } else {
    allocatedInvoiceCommercialDiscounts = allocateInvoiceDiscountLargestRemainder(
      netLineAmountsBeforeInvoiceDiscount,
      totalInvoiceDiscountPaise
    );
  }

  const totalInvoiceTaxReducingDiscountPaise = allocatedInvoiceTaxReducingDiscounts.reduce((a, b) => a + b, 0);
  const totalInvoiceCommercialDiscountPaise = allocatedInvoiceCommercialDiscounts.reduce((a, b) => a + b, 0);

  const totalTaxReducingDiscountPaise = totalLineTaxReducingDiscountPaise + totalInvoiceTaxReducingDiscountPaise;
  const totalCommercialDiscountPaise = totalLineCommercialDiscountPaise + totalInvoiceCommercialDiscountPaise;
  const totalDiscountPaise = totalLineDiscountPaise + totalInvoiceDiscountPaise;

  // 4. Line Items Tax Calculation via Phase 10 Engine
  const calculatedItems: CalculatedInvoiceItem[] = [];
  let sumLineTaxablePaise = 0;

  for (let i = 0; i < rawItemsCount; i++) {
    const item = input.items[i];
    const grossLinePaise = grossLineAmounts[i];
    const lineDiscountPaise = lineDiscountAmounts[i];
    const lineTaxReducingPaise = lineTaxReducingDiscounts[i];
    const lineCommercialPaise = lineCommercialDiscounts[i];
    const allocInvTaxReducingPaise = allocatedInvoiceTaxReducingDiscounts[i];
    const allocInvCommercialPaise = allocatedInvoiceCommercialDiscounts[i];

    const totalItemTaxReducingDiscountPaise = lineTaxReducingPaise + allocInvTaxReducingPaise;
    const totalItemCommercialDiscountPaise = lineCommercialPaise + allocInvCommercialPaise;

    const lineTaxablePaise = grossLinePaise - totalItemTaxReducingDiscountPaise;
    sumLineTaxablePaise += lineTaxablePaise;

    // Call Phase 10 calculateLineGst
    const gstResult = calculateLineGst({
      taxablePaise: lineTaxablePaise,
      resolvedTaxRate: item.resolvedTaxRate,
      supplierStateCode: input.supplierStateCode,
      placeOfSupplyStateCode: input.placeOfSupplyStateCode,
      recipientStateCode: input.recipientStateCode,
      supplyType: item.itemType || input.supplyType,
      supplyClassification: input.supplyClassification,
      taxTreatment: item.taxTreatment || input.taxTreatment,
      customerGstType: input.customerGstType,
      zeroRatedMethod: input.zeroRatedMethod,
      taxMechanism: input.taxMechanism,
      placeOfSupplyDetermination: input.placeOfSupplyDetermination,
      cessAmountPerUnitPaise: item.cessAmountPerUnitPaise,
      quantity: item.quantity,
    });

    const itemTotalAmountPaise = lineTaxablePaise + gstResult.totalTaxPaise - totalItemCommercialDiscountPaise;

    calculatedItems.push({
      itemId: item.itemId,
      name: item.name,
      classificationCode: item.classificationCode,
      quantity: item.quantity,
      freeQuantity: item.freeQuantity || 0,
      unit: item.unit,
      uqc: item.uqc,
      ratePaise: item.ratePaise,
      rateAmount: paiseToRupees(item.ratePaise),
      grossAmountPaise: grossLinePaise,
      grossAmount: paiseToRupees(grossLinePaise),
      lineDiscountPaise,
      lineDiscountAmount: paiseToRupees(lineDiscountPaise),
      allocatedInvoiceDiscountPaise: allocInvTaxReducingPaise + allocInvCommercialPaise,
      allocatedInvoiceDiscountAmount: paiseToRupees(allocInvTaxReducingPaise + allocInvCommercialPaise),
      taxReducingDiscountPaise: totalItemTaxReducingDiscountPaise,
      taxReducingDiscountAmount: paiseToRupees(totalItemTaxReducingDiscountPaise),
      commercialDiscountPaise: totalItemCommercialDiscountPaise,
      commercialDiscountAmount: paiseToRupees(totalItemCommercialDiscountPaise),
      taxablePaise: lineTaxablePaise,
      taxableAmount: paiseToRupees(lineTaxablePaise),
      gstResult,
      totalAmountPaise: itemTotalAmountPaise,
      totalAmount: paiseToRupees(itemTotalAmountPaise),
    });
  }

  // 5. Additional Charges Processing
  const calculatedCharges: CalculatedAdditionalCharge[] = [];
  let taxableAdditionalChargesPaise = 0;
  let nonTaxableAdditionalChargesPaise = 0;

  if (input.additionalCharges && input.additionalCharges.length > 0) {
    for (const charge of input.additionalCharges) {
      if (typeof charge.amountPaise !== 'number' || !Number.isSafeInteger(charge.amountPaise) || charge.amountPaise < 0) {
        throw new UnsafeIntegerError(`additionalCharge '${charge.name}' amountPaise`, charge.amountPaise);
      }

      if (charge.valuationTreatment === 'TAXABLE') {
        if (!charge.resolvedTaxRate) {
          throw new MissingAdditionalChargeTaxRateError(charge.name);
        }

        const chargeGstResult = calculateLineGst({
          taxablePaise: charge.amountPaise,
          resolvedTaxRate: charge.resolvedTaxRate,
          supplierStateCode: input.supplierStateCode,
          placeOfSupplyStateCode: input.placeOfSupplyStateCode,
          recipientStateCode: input.recipientStateCode,
          supplyType: 'SERVICES',
          supplyClassification: input.supplyClassification,
          taxTreatment: charge.taxTreatment || input.taxTreatment,
          customerGstType: input.customerGstType,
          zeroRatedMethod: input.zeroRatedMethod,
          taxMechanism: input.taxMechanism,
          placeOfSupplyDetermination: input.placeOfSupplyDetermination,
          cessAmountPerUnitPaise: charge.cessAmountPerUnitPaise,
        });

        taxableAdditionalChargesPaise += charge.amountPaise;
        calculatedCharges.push({
          id: charge.id,
          name: charge.name,
          amountPaise: charge.amountPaise,
          amount: paiseToRupees(charge.amountPaise),
          valuationTreatment: 'TAXABLE',
          gstResult: chargeGstResult,
        });
      } else {
        nonTaxableAdditionalChargesPaise += charge.amountPaise;
        calculatedCharges.push({
          id: charge.id,
          name: charge.name,
          amountPaise: charge.amountPaise,
          amount: paiseToRupees(charge.amountPaise),
          valuationTreatment: 'NON_TAXABLE',
        });
      }
    }
  }

  // 6. Aggregate Compound GST Rate Summaries
  const rateSummaries = aggregateGstRateSummaries(calculatedItems, calculatedCharges);

  // 7. Calculate Invoice Totals & Round-Off
  const totalTaxablePaise = sumLineTaxablePaise + taxableAdditionalChargesPaise;

  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalUtgstPaise = 0;
  let totalIgstPaise = 0;
  let totalAdValoremCessPaise = 0;
  let totalSpecificCessPaise = 0;

  for (const item of calculatedItems) {
    totalCgstPaise += item.gstResult.cgstPaise;
    totalSgstPaise += item.gstResult.sgstPaise;
    totalUtgstPaise += item.gstResult.utgstPaise;
    totalIgstPaise += item.gstResult.igstPaise;
    totalAdValoremCessPaise += item.gstResult.adValoremCessPaise;
    totalSpecificCessPaise += item.gstResult.specificCessPaise;
  }

  for (const charge of calculatedCharges) {
    if (charge.gstResult) {
      totalCgstPaise += charge.gstResult.cgstPaise;
      totalSgstPaise += charge.gstResult.sgstPaise;
      totalUtgstPaise += charge.gstResult.utgstPaise;
      totalIgstPaise += charge.gstResult.igstPaise;
      totalAdValoremCessPaise += charge.gstResult.adValoremCessPaise;
      totalSpecificCessPaise += charge.gstResult.specificCessPaise;
    }
  }

  const totalCessPaise = totalAdValoremCessPaise + totalSpecificCessPaise;
  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalUtgstPaise + totalIgstPaise + totalCessPaise;

  const unroundedGrandTotalPaise = totalTaxablePaise + totalTaxPaise + nonTaxableAdditionalChargesPaise - totalCommercialDiscountPaise;

  const roundOffResult = applyInvoiceRoundOff(unroundedGrandTotalPaise, input.roundOffPolicy || 'NEAREST_RUPEE');

  // Invariant verification
  if (!Number.isSafeInteger(totalTaxablePaise)) throw new UnsafeIntegerError('totalTaxablePaise', totalTaxablePaise);
  if (!Number.isSafeInteger(totalTaxPaise)) throw new UnsafeIntegerError('totalTaxPaise', totalTaxPaise);
  if (!Number.isSafeInteger(roundOffResult.grandTotalPaise)) throw new UnsafeIntegerError('grandTotalPaise', roundOffResult.grandTotalPaise);

  return {
    items: calculatedItems,
    additionalCharges: calculatedCharges,
    subTotalPaise,
    subTotalAmount: paiseToRupees(subTotalPaise),
    totalLineDiscountPaise,
    totalLineDiscountAmount: paiseToRupees(totalLineDiscountPaise),
    totalInvoiceDiscountPaise,
    totalInvoiceDiscountAmount: paiseToRupees(totalInvoiceDiscountPaise),
    totalTaxReducingDiscountPaise,
    totalTaxReducingDiscountAmount: paiseToRupees(totalTaxReducingDiscountPaise),
    totalCommercialDiscountPaise,
    totalCommercialDiscountAmount: paiseToRupees(totalCommercialDiscountPaise),
    totalDiscountPaise,
    totalDiscountAmount: paiseToRupees(totalDiscountPaise),
    taxableAdditionalChargesPaise,
    taxableAdditionalChargesAmount: paiseToRupees(taxableAdditionalChargesPaise),
    nonTaxableAdditionalChargesPaise,
    nonTaxableAdditionalChargesAmount: paiseToRupees(nonTaxableAdditionalChargesPaise),
    totalTaxablePaise,
    totalTaxableAmount: paiseToRupees(totalTaxablePaise),
    totalCgstPaise,
    totalCgstAmount: paiseToRupees(totalCgstPaise),
    totalSgstPaise,
    totalSgstAmount: paiseToRupees(totalSgstPaise),
    totalUtgstPaise,
    totalUtgstAmount: paiseToRupees(totalUtgstPaise),
    totalIgstPaise,
    totalIgstAmount: paiseToRupees(totalIgstPaise),
    totalAdValoremCessPaise,
    totalAdValoremCessAmount: paiseToRupees(totalAdValoremCessPaise),
    totalSpecificCessPaise,
    totalSpecificCessAmount: paiseToRupees(totalSpecificCessPaise),
    totalCessPaise,
    totalCessAmount: paiseToRupees(totalCessPaise),
    totalTaxPaise,
    totalTaxAmount: paiseToRupees(totalTaxPaise),
    rateSummaries,
    roundOffPaise: roundOffResult.roundOffPaise,
    roundOffAmount: roundOffResult.roundOffAmount,
    grandTotalPaise: roundOffResult.grandTotalPaise,
    grandTotalAmount: roundOffResult.grandTotalAmount,
    calculationVersion: 'INVOICE_ENGINE_V1.0',
  };
}

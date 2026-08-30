import {
  GstLineInput,
  GstLineResult,
  GstTaxTreatment,
  CessType,
  GstComponent,
  GstReasonCode,
} from './gst.types';
import { GST_ENGINE_VERSION } from './gst.constants';
import { determineJurisdiction } from './gst.place-of-supply';
import { calculateComponentTaxPaise, formatPaiseToRupees } from './gst.rounding';
import {
  NegativeTaxableAmountError,
  UnsafeIntegerError,
  InvalidQuantityError,
  MissingQuantityForCessError,
  GstEngineError,
} from './gst.errors';

export function calculateLineGst(input: GstLineInput): GstLineResult {
  // 1. Input Defensive Invariant Defenses
  if (typeof input.taxablePaise !== 'number' || !Number.isSafeInteger(input.taxablePaise)) {
    throw new UnsafeIntegerError('taxablePaise', input.taxablePaise);
  }
  if (input.taxablePaise < 0) {
    throw new NegativeTaxableAmountError(input.taxablePaise);
  }

  const { resolvedTaxRate } = input;
  if (!resolvedTaxRate || typeof resolvedTaxRate.rate !== 'number' || !Number.isFinite(resolvedTaxRate.rate)) {
    throw new GstEngineError('Invalid or missing resolvedTaxRate in GstLineInput.');
  }
  if (resolvedTaxRate.rate < 0) {
    throw new GstEngineError(`Tax rate cannot be negative. Received: ${resolvedTaxRate.rate}`);
  }

  // 2. Quantity & Specific Cess Precision Checks
  let quantity = input.quantity;
  if (input.cessAmountPerUnitPaise !== undefined) {
    if (typeof input.cessAmountPerUnitPaise !== 'number' || !Number.isSafeInteger(input.cessAmountPerUnitPaise)) {
      throw new UnsafeIntegerError('cessAmountPerUnitPaise', input.cessAmountPerUnitPaise);
    }
    if (input.cessAmountPerUnitPaise < 0) {
      throw new GstEngineError('Specific cess amount per unit paise cannot be negative.');
    }
    if (quantity === undefined || quantity === null) {
      throw new MissingQuantityForCessError();
    }
  }

  if (quantity !== undefined && quantity !== null) {
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
      throw new InvalidQuantityError(`Quantity must be a positive finite number. Received: ${quantity}`);
    }
    // Max 4 decimal places precision check (e.g. 10.1234 is valid; 10.12345 is invalid)
    const quantityStr = quantity.toString();
    const decimalPart = quantityStr.includes('.') ? quantityStr.split('.')[1] : '';
    if (decimalPart.length > 4) {
      throw new InvalidQuantityError(`Quantity precision exceeds maximum 4 decimal places. Received: ${quantity}`);
    }
  }

  // 3. Determine Jurisdiction & Reason Code
  const posResult = determineJurisdiction({
    supplierStateCode: input.supplierStateCode,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
    supplyClassification: input.supplyClassification,
    placeOfSupplyDetermination: input.placeOfSupplyDetermination,
  });

  const { jurisdiction, placeOfSupplyDetermination } = posResult;
  let reasonCode: GstReasonCode = posResult.reasonCode;

  // 4. Component Rate Resolution (Half-Split Rule)
  let cgstRate = 0;
  let sgstRate = 0;
  let utgstRate = 0;
  let igstRate = 0;
  const totalGstRate = resolvedTaxRate.rate;

  if (jurisdiction === 'INTRA_STATE') {
    cgstRate = totalGstRate / 2;
    sgstRate = totalGstRate / 2;
  } else if (jurisdiction === 'UNION_TERRITORY') {
    cgstRate = totalGstRate / 2;
    utgstRate = totalGstRate / 2;
  } else {
    igstRate = totalGstRate;
  }

  // 5. Evaluate Tax Treatment & Zero-Rated Methods
  const taxTreatment: GstTaxTreatment = input.taxTreatment || 'TAXABLE';
  const zeroRatedMethod = input.zeroRatedMethod || 'WITHOUT_PAYMENT_OF_IGST';
  const taxMechanism = input.taxMechanism || 'FORWARD_CHARGE';

  let applyTaxes = true;
  if (taxTreatment === 'NIL_RATED') {
    applyTaxes = false;
    reasonCode = 'NIL_RATED';
  } else if (taxTreatment === 'EXEMPT') {
    applyTaxes = false;
    reasonCode = 'EXEMPT';
  } else if (taxTreatment === 'NON_GST') {
    applyTaxes = false;
    reasonCode = 'NON_GST';
  } else if (taxTreatment === 'ZERO_RATED') {
    if (zeroRatedMethod === 'WITHOUT_PAYMENT_OF_IGST') {
      applyTaxes = false;
    }
    reasonCode = input.supplyClassification === 'SEZ' ? 'SEZ_ZERO_RATED' : 'EXPORT_ZERO_RATED';
  }

  // 6. Tax Component Paise Calculation
  let cgstPaise = 0;
  let sgstPaise = 0;
  let utgstPaise = 0;
  let igstPaise = 0;

  if (applyTaxes) {
    if (cgstRate > 0) cgstPaise = calculateComponentTaxPaise(input.taxablePaise, cgstRate);
    if (sgstRate > 0) sgstPaise = calculateComponentTaxPaise(input.taxablePaise, sgstRate);
    if (utgstRate > 0) utgstPaise = calculateComponentTaxPaise(input.taxablePaise, utgstRate);
    if (igstRate > 0) igstPaise = calculateComponentTaxPaise(input.taxablePaise, igstRate);
  }

  // 7. Cess Calculation & CessType Breakdown
  let adValoremCessPaise = 0;
  let specificCessPaise = 0;
  const cessRate = resolvedTaxRate.cessRate || 0;
  const cessAmountPerUnit = input.cessAmountPerUnitPaise || 0;

  if (applyTaxes) {
    if (cessRate > 0) {
      adValoremCessPaise = calculateComponentTaxPaise(input.taxablePaise, cessRate);
    }
    if (cessAmountPerUnit > 0 && quantity && quantity > 0) {
      specificCessPaise = Math.round(quantity * cessAmountPerUnit);
    }
  }

  const cessPaise = adValoremCessPaise + specificCessPaise;

  let cessType: CessType = 'NONE';
  if (adValoremCessPaise > 0 && specificCessPaise > 0) cessType = 'BOTH';
  else if (adValoremCessPaise > 0) cessType = 'AD_VALOREM';
  else if (specificCessPaise > 0) cessType = 'SPECIFIC';

  // 8. Total Tax & Line Amounts
  const totalTaxPaise = cgstPaise + sgstPaise + utgstPaise + igstPaise + cessPaise;
  const totalLineAmountPaise = input.taxablePaise + totalTaxPaise;

  // Safe integer result verification
  if (!Number.isSafeInteger(totalTaxPaise)) {
    throw new UnsafeIntegerError('totalTaxPaise', totalTaxPaise);
  }
  if (!Number.isSafeInteger(totalLineAmountPaise)) {
    throw new UnsafeIntegerError('totalLineAmountPaise', totalLineAmountPaise);
  }

  // 9. Components Applied List
  const componentsApplied: GstComponent[] = [];
  if (cgstPaise > 0) componentsApplied.push('CGST');
  if (sgstPaise > 0) componentsApplied.push('SGST');
  if (utgstPaise > 0) componentsApplied.push('UTGST');
  if (igstPaise > 0) componentsApplied.push('IGST');
  if (cessPaise > 0) componentsApplied.push('CESS');

  // 10. Explanation String Generation
  let explanation = '';
  if (taxTreatment === 'NIL_RATED') {
    explanation = 'Nil-rated supply. Zero GST applied.';
  } else if (taxTreatment === 'EXEMPT') {
    explanation = 'Exempt supply under GST notification. Zero GST applied.';
  } else if (taxTreatment === 'NON_GST') {
    explanation = 'Non-GST item outside GST purview. Zero GST applied.';
  } else if (taxTreatment === 'ZERO_RATED' && zeroRatedMethod === 'WITHOUT_PAYMENT_OF_IGST') {
    explanation = `Zero-rated ${input.supplyClassification || 'EXPORT'} supply under bond/LUT without payment of IGST.`;
  } else if (jurisdiction === 'INTRA_STATE') {
    explanation = `Intra-state supply within state code ${posResult.supplierStateCode}. Applied ${cgstRate}% CGST and ${sgstRate}% SGST.`;
  } else if (jurisdiction === 'UNION_TERRITORY') {
    explanation = `Intra-UT supply within Union Territory code ${posResult.supplierStateCode}. Applied ${cgstRate}% CGST and ${utgstRate}% UTGST.`;
  } else {
    explanation = `Inter-state supply from state code ${posResult.supplierStateCode} to place of supply ${posResult.placeOfSupplyStateCode}. Applied ${igstRate}% IGST.`;
  }

  if (taxMechanism === 'REVERSE_CHARGE') {
    explanation += ' [Reverse Charge: Recipient is liable to pay tax]';
  }

  return {
    taxablePaise: input.taxablePaise,
    taxableAmount: formatPaiseToRupees(input.taxablePaise),
    cgstRate,
    cgstPaise,
    cgstAmount: formatPaiseToRupees(cgstPaise),
    sgstRate,
    sgstPaise,
    sgstAmount: formatPaiseToRupees(sgstPaise),
    utgstRate,
    utgstPaise,
    utgstAmount: formatPaiseToRupees(utgstPaise),
    igstRate,
    igstPaise,
    igstAmount: formatPaiseToRupees(igstPaise),
    cessRate,
    cessType,
    adValoremCessPaise,
    specificCessPaise,
    cessPaise,
    cessAmount: formatPaiseToRupees(cessPaise),
    totalTaxPaise,
    totalTaxAmount: formatPaiseToRupees(totalTaxPaise),
    totalLineAmountPaise,
    totalLineAmount: formatPaiseToRupees(totalLineAmountPaise),
    jurisdiction,
    componentsApplied,
    trace: {
      gstEngineVersion: GST_ENGINE_VERSION,
      reasonCode,
      supplierStateCode: posResult.supplierStateCode,
      placeOfSupplyStateCode: posResult.placeOfSupplyStateCode,
      recipientStateCode: input.recipientStateCode,
      placeOfSupplyDetermination,
      jurisdiction,
      supplyClassification: input.supplyClassification || 'DOMESTIC',
      taxTreatment,
      taxMechanism,
      zeroRatedMethod: taxTreatment === 'ZERO_RATED' ? zeroRatedMethod : undefined,
      taxRateId: resolvedTaxRate.taxRateId,
      taxRateVersion: resolvedTaxRate.version,
      effectiveRate: totalGstRate,
      explanation,
    },
  };
}

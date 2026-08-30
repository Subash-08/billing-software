import { GstRateSummary, CalculatedInvoiceItem, CalculatedAdditionalCharge } from './invoice.types';
import { paiseToRupees } from '@/lib/money';

/**
 * Compound Rate-Wise Tax Aggregator
 * Groups calculated invoice line items and taxable additional charges by compound key:
 * key = `${gstRate}_${taxTreatment}_${jurisdiction}_${supplyClassification}_${taxMechanism}`
 * Prevents merging semantically distinct tax lines (e.g. 18% TAXABLE vs 18% EXEMPT vs 18% IGST).
 */
export function aggregateGstRateSummaries(
  items: CalculatedInvoiceItem[],
  additionalCharges: CalculatedAdditionalCharge[]
): GstRateSummary[] {
  const map = new Map<string, GstRateSummary>();

  const processGstResult = (taxablePaise: number, gstResult: any) => {
    const { trace, cgstRate, sgstRate, utgstRate, igstRate } = gstResult;
    const effectiveGstRate = trace.effectiveRate || (cgstRate + sgstRate + utgstRate + igstRate);

    const key = `${effectiveGstRate}_${trace.taxTreatment}_${trace.jurisdiction}_${trace.supplyClassification}_${trace.taxMechanism}`;

    let summary = map.get(key);
    if (!summary) {
      summary = {
        gstRate: effectiveGstRate,
        taxTreatment: trace.taxTreatment,
        jurisdiction: trace.jurisdiction,
        supplyClassification: trace.supplyClassification,
        taxMechanism: trace.taxMechanism,
        taxablePaise: 0,
        taxableAmount: 0,
        cgstPaise: 0,
        cgstAmount: 0,
        sgstPaise: 0,
        sgstAmount: 0,
        utgstPaise: 0,
        utgstAmount: 0,
        igstPaise: 0,
        igstAmount: 0,
        adValoremCessPaise: 0,
        specificCessPaise: 0,
        cessPaise: 0,
        cessAmount: 0,
        totalTaxPaise: 0,
        totalTaxAmount: 0,
      };
      map.set(key, summary);
    }

    summary.taxablePaise += taxablePaise;
    summary.cgstPaise += gstResult.cgstPaise;
    summary.sgstPaise += gstResult.sgstPaise;
    summary.utgstPaise += gstResult.utgstPaise;
    summary.igstPaise += gstResult.igstPaise;
    summary.adValoremCessPaise += gstResult.adValoremCessPaise;
    summary.specificCessPaise += gstResult.specificCessPaise;
    summary.cessPaise += gstResult.cessPaise;
    summary.totalTaxPaise += gstResult.totalTaxPaise;

    summary.taxableAmount = paiseToRupees(summary.taxablePaise);
    summary.cgstAmount = paiseToRupees(summary.cgstPaise);
    summary.sgstAmount = paiseToRupees(summary.sgstPaise);
    summary.utgstAmount = paiseToRupees(summary.utgstPaise);
    summary.igstAmount = paiseToRupees(summary.igstPaise);
    summary.cessAmount = paiseToRupees(summary.cessPaise);
    summary.totalTaxAmount = paiseToRupees(summary.totalTaxPaise);
  };

  // 1. Process Line Items
  for (const item of items) {
    processGstResult(item.taxablePaise, item.gstResult);
  }

  // 2. Process Taxable Additional Charges
  for (const charge of additionalCharges) {
    if (charge.valuationTreatment === 'TAXABLE' && charge.gstResult) {
      processGstResult(charge.amountPaise, charge.gstResult);
    }
  }

  // Sort summaries by gstRate ascending, then taxTreatment ascending
  return Array.from(map.values()).sort((a, b) => {
    if (a.gstRate !== b.gstRate) return a.gstRate - b.gstRate;
    return a.taxTreatment.localeCompare(b.taxTreatment);
  });
}

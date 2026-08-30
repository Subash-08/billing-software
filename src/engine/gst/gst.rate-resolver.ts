import { connectToDatabase } from '@/db/connection';
import { TaxRateModel, ITaxRateMaster } from '@/db/models/tax-rate.model';
import { ResolvedTaxRate } from './gst.types';
import { TaxRateNotFoundError, TaxRateConfigurationError } from './gst.errors';

/**
 * Versioned TaxRate Effective-Date Resolver.
 * Resolves authoritative TaxRate master record for a given percentage and invoice date.
 * Strictly checks effectiveFrom <= invoiceDate AND (effectiveTo IS NULL OR effectiveTo >= invoiceDate).
 */
export async function resolveTaxRate(
  ratePercent: number,
  invoiceDate: Date = new Date()
): Promise<ResolvedTaxRate> {
  await connectToDatabase();

  const targetDate = new Date(invoiceDate);
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid invoiceDate parameter provided to resolveTaxRate.');
  }

  // Find matching records in TaxRate master table
  const matches = await TaxRateModel.find({
    rate: ratePercent,
    effectiveFrom: { $lte: targetDate },
    $or: [
      { effectiveTo: { $exists: false } },
      { effectiveTo: null },
      { effectiveTo: { $gte: targetDate } },
    ],
  }).exec();

  if (matches.length === 0) {
    throw new TaxRateNotFoundError(ratePercent, targetDate);
  }

  if (matches.length > 1) {
    throw new TaxRateConfigurationError(
      `Ambiguous tax rate configuration: Found ${matches.length} overlapping TaxRate master records for rate ${ratePercent}% on date ${targetDate.toISOString().split('T')[0]}.`
    );
  }

  const match = matches[0];
  return {
    taxRateId: (match._id as any).toString(),
    version: match.version || '1.0',
    rate: match.rate,
    cessRate: match.cessRate || 0,
    effectiveFrom: match.effectiveFrom,
    effectiveTo: match.effectiveTo || undefined,
  };
}

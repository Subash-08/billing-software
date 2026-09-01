/**
 * Versioned GSTR-1 Classification Policy Resolver
 * src/engine/policy/gstr-classification.policy.ts
 *
 * Architecture Invariant:
 * Classifies issued invoices into GSTR-1 return tables (B2B, B2CS, B2CL, EXP, etc.).
 *
 * Effective-Dated Rules:
 * - B2CL (Inter-state unregistered large supplies):
 *   - Invoice Date < 2024-08-01: Inter-state B2C invoice value > ₹2,50,000 (25,000,000 paise).
 *   - Invoice Date >= 2024-08-01 (GST Portal Advisory / Notification Aug 2024):
 *     Inter-state B2C invoice value > ₹1,00,000 (10,000,000 paise).
 *     Strict inequality: exactly ₹1,00,000 remains B2CS.
 */

import { TransactionContext } from './transaction.context';

export type Gstr1TableCategory = 'B2B' | 'B2CS' | 'B2CL' | 'EXP_WPAY' | 'EXP_WOPAY' | 'SEZ_WPAY' | 'SEZ_WOPAY';

export interface GstrClassificationResult {
  tableCategory: Gstr1TableCategory;
  policyVersion: string;
  notificationReference: string;
  b2clThresholdPaise: number;
  explanation: string;
}

export class GstrClassificationPolicyResolver {
  public static readonly POLICY_VERSION_AUG_2024 = 'GSTR-2024-08';
  public static readonly POLICY_VERSION_LEGACY = 'GSTR-LEGACY-2.5L';

  /**
   * Resolves GSTR-1 Table classification for a given TransactionContext.
   */
  public static resolve(ctx: TransactionContext): GstrClassificationResult {
    const invoiceDate = new Date(ctx.invoiceDate);
    const aug2024Cutoff = new Date('2024-08-01T00:00:00.000Z');

    const isPostAug2024 = invoiceDate >= aug2024Cutoff;
    const policyVersion = isPostAug2024
      ? this.POLICY_VERSION_AUG_2024
      : this.POLICY_VERSION_LEGACY;

    const notificationReference = isPostAug2024
      ? 'GST Portal Advisory (Aug 2024 Return Period) - B2CL Threshold ₹1 Lakh'
      : 'CBIC Rule 59 / GSTR-1 Advisory - B2CL Threshold ₹2.5 Lakh';

    // B2CL threshold in integer paise: 10,000,000p (₹1L) vs 25,000,000p (₹2.5L)
    const b2clThresholdPaise = isPostAug2024 ? 10_000_000 : 25_000_000;

    // 1. Export / SEZ classification
    if (ctx.supplyClassification === 'EXPORT') {
      const wpay = ctx.zeroRatedMethod === 'WITH_PAYMENT_OF_IGST';
      return {
        tableCategory: wpay ? 'EXP_WPAY' : 'EXP_WOPAY',
        policyVersion,
        notificationReference,
        b2clThresholdPaise,
        explanation: `Export supply classified as ${wpay ? 'EXP_WPAY' : 'EXP_WOPAY'}`,
      };
    }

    if (ctx.supplyClassification === 'SEZ') {
      const wpay = ctx.zeroRatedMethod === 'WITH_PAYMENT_OF_IGST';
      return {
        tableCategory: wpay ? 'SEZ_WPAY' : 'SEZ_WOPAY',
        policyVersion,
        notificationReference,
        b2clThresholdPaise,
        explanation: `SEZ supply classified as ${wpay ? 'SEZ_WPAY' : 'SEZ_WOPAY'}`,
      };
    }

    // 2. B2B registered recipient
    const isB2B = ctx.recipientGstRegistrationStatus === 'REGISTERED';
    if (isB2B) {
      return {
        tableCategory: 'B2B',
        policyVersion,
        notificationReference,
        b2clThresholdPaise,
        explanation: 'Registered recipient with valid GSTIN classified as B2B',
      };
    }

    // 3. B2C unregistered recipient — check inter-state B2CL threshold
    const isInterState = ctx.supplierStateCode !== ctx.placeOfSupplyStateCode;
    const isOverThreshold = ctx.grandTotalPaise > b2clThresholdPaise; // Strict >

    if (isInterState && isOverThreshold) {
      return {
        tableCategory: 'B2CL',
        policyVersion,
        notificationReference,
        b2clThresholdPaise,
        explanation: `Inter-state B2C invoice value (₹${(ctx.grandTotalPaise / 100).toFixed(2)}) > threshold (₹${(b2clThresholdPaise / 100).toFixed(2)}) classified as B2CL`,
      };
    }

    return {
      tableCategory: 'B2CS',
      policyVersion,
      notificationReference,
      b2clThresholdPaise,
      explanation: isInterState
        ? `Inter-state B2C invoice value (₹${(ctx.grandTotalPaise / 100).toFixed(2)}) <= threshold (₹${(b2clThresholdPaise / 100).toFixed(2)}) classified as B2CS`
        : 'Intra-state B2C supply classified as B2CS',
    };
  }
}

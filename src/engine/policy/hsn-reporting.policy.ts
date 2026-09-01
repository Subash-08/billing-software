/**
 * Versioned HSN/SAC Reporting Policy Resolver
 * src/engine/policy/hsn-reporting.policy.ts
 *
 * Architecture Invariant:
 * Reporting requirements depend on taxpayer turnover, financial year, recipient type,
 * and applicable CBIC notifications (e.g. Notification 78/2020-CT dated 15.10.2020).
 *
 * Rules:
 * - Pre-April 2021: 2 digits (≤ 1.5Cr) or 4 digits (> 1.5Cr).
 * - Post-April 2021 (Notification 78/2020):
 *   - Turnover > ₹5 Cr: 6 digits mandatory for all supplies (B2B and B2C).
 *   - Turnover ≤ ₹5 Cr: 4 digits mandatory for B2B supplies; optional/4-digit for B2C.
 */

import { TransactionContext } from './transaction.context';

export interface HsnReportingPolicyResult {
  policyVersion: string;
  notificationReference: string;
  requiredDigits: 4 | 6 | 8;
  explanation: string;
}

export class HsnReportingPolicyResolver {
  public static readonly CURRENT_POLICY_VERSION = 'HSN-POLICY-2021-01';

  /**
   * Resolves the required minimum HSN digit level for a given transaction context.
   */
  public static resolve(ctx: TransactionContext): HsnReportingPolicyResult {
    // Check if user set an explicit override in business settings
    // (if supplied via context or caller)

    const date = new Date(ctx.invoiceDate);
    const april2021Cutoff = new Date('2021-04-01T00:00:00.000Z');

    const notificationReference = 'Notification 78/2020-CT dated 15.10.2020';

    if (date < april2021Cutoff) {
      const isLarge = ctx.turnoverCategory === 'ABOVE_5CR';
      return {
        policyVersion: 'HSN-POLICY-PRE-2021',
        notificationReference: 'Notification 12/2017-CT',
        requiredDigits: isLarge ? 4 : 2 as any, // 2 digits historically
        explanation: 'Historical pre-April 2021 reporting rule applied',
      };
    }

    // Post-April 2021 rules
    const isAbove5Cr = ctx.turnoverCategory === 'ABOVE_5CR';
    const isB2B = ctx.recipientGstRegistrationStatus === 'REGISTERED';
    const isExport = ctx.supplyClassification === 'EXPORT' || ctx.supplyClassification === 'SEZ';

    if (isAbove5Cr || isExport) {
      return {
        policyVersion: this.CURRENT_POLICY_VERSION,
        notificationReference,
        requiredDigits: 6,
        explanation: isExport
          ? '6-digit HSN required for Export/SEZ supplies'
          : '6-digit HSN required for taxpayers with turnover > ₹5 Crore',
      };
    }

    if (isB2B) {
      return {
        policyVersion: this.CURRENT_POLICY_VERSION,
        notificationReference,
        requiredDigits: 4,
        explanation: '4-digit HSN required for B2B supplies by taxpayers with turnover ≤ ₹5 Crore',
      };
    }

    // B2C supplies for ≤ 5Cr taxpayers: 4 digits
    return {
      policyVersion: this.CURRENT_POLICY_VERSION,
      notificationReference,
      requiredDigits: 4,
      explanation: '4-digit HSN recommended for B2C supplies by taxpayers with turnover ≤ ₹5 Crore',
    };
  }
}

/**
 * Versioned HSN Reporting & GSTR Classification Policy Unit Tests
 * src/engine/policy/policies.test.ts
 */

import { describe, it, expect } from 'vitest';
import { HsnReportingPolicyResolver } from './hsn-reporting.policy';
import { GstrClassificationPolicyResolver } from './gstr-classification.policy';
import { TransactionContext } from './transaction.context';

function makeContext(overrides: Partial<TransactionContext>): TransactionContext {
  return {
    documentType: 'TAX_INVOICE',
    invoiceDate: new Date('2026-08-31'),
    financialYear: '2026-27',
    supplierStateCode: '33',
    placeOfSupplyStateCode: '33',
    supplyType: 'GOODS',
    supplyClassification: 'DOMESTIC',
    taxTreatment: 'TAXABLE',
    taxMechanism: 'FORWARD_CHARGE',
    recipientGstRegistrationStatus: 'REGISTERED',
    supplierGstRegistrationType: 'REGULAR',
    turnoverCategory: 'UP_TO_5CR',
    eInvoiceApplicable: false,
    grandTotalPaise: 590000,
    totalIgstPaise: 0,
    totalCgstPaise: 45000,
    totalSgstPaise: 45000,
    totalUtgstPaise: 0,
    totalCessPaise: 0,
    reverseCharge: false,
    ...overrides,
  };
}

describe('Versioned Policy Resolvers', () => {
  describe('HsnReportingPolicyResolver', () => {
    it('Requires 6 digits for turnover > ₹5 Crore', () => {
      const ctx = makeContext({ turnoverCategory: 'ABOVE_5CR' });
      const res = HsnReportingPolicyResolver.resolve(ctx);
      expect(res.requiredDigits).toBe(6);
      expect(res.policyVersion).toBe('HSN-POLICY-2021-01');
    });

    it('Requires 4 digits for B2B supplies with turnover ≤ ₹5 Crore', () => {
      const ctx = makeContext({ turnoverCategory: 'UP_TO_5CR', recipientGstRegistrationStatus: 'REGISTERED' });
      const res = HsnReportingPolicyResolver.resolve(ctx);
      expect(res.requiredDigits).toBe(4);
    });

    it('Requires 6 digits for Export supplies regardless of turnover', () => {
      const ctx = makeContext({ turnoverCategory: 'UP_TO_5CR', supplyClassification: 'EXPORT' });
      const res = HsnReportingPolicyResolver.resolve(ctx);
      expect(res.requiredDigits).toBe(6);
    });
  });

  describe('GstrClassificationPolicyResolver (Versioned B2CL Boundary)', () => {
    it('J1: Registered recipient -> B2B table', () => {
      const ctx = makeContext({ recipientGstRegistrationStatus: 'REGISTERED' });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2B');
    });

    it('J2: B2C intra-state -> B2CS table', () => {
      const ctx = makeContext({
        recipientGstRegistrationStatus: 'UNREGISTERED',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        grandTotalPaise: 5000000,
      });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2CS');
    });

    it('J3: B2C inter-state ₹99,999.99 (9999999p) post-Aug 2024 -> B2CS table', () => {
      const ctx = makeContext({
        invoiceDate: new Date('2024-08-15'),
        recipientGstRegistrationStatus: 'UNREGISTERED',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        grandTotalPaise: 9999999,
      });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2CS');
      expect(res.policyVersion).toBe('GSTR-2024-08');
      expect(res.b2clThresholdPaise).toBe(10000000);
    });

    it('J4: B2CL Boundary: B2C inter-state EXACTLY ₹1,00,000.00 (10000000p) -> B2CS table (strict >)', () => {
      const ctx = makeContext({
        invoiceDate: new Date('2024-08-15'),
        recipientGstRegistrationStatus: 'UNREGISTERED',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        grandTotalPaise: 10000000,
      });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2CS'); // Strict inequality
    });

    it('J5: B2CL Boundary: B2C inter-state ₹1,00,000.01 (10000001p) post-Aug 2024 -> B2CL table', () => {
      const ctx = makeContext({
        invoiceDate: new Date('2024-08-15'),
        recipientGstRegistrationStatus: 'UNREGISTERED',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        grandTotalPaise: 10000001,
      });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2CL');
    });

    it('Legacy pre-Aug 2024: B2C inter-state ₹1,50,000 -> B2CS (threshold was ₹2.5L)', () => {
      const ctx = makeContext({
        invoiceDate: new Date('2024-05-01'),
        recipientGstRegistrationStatus: 'UNREGISTERED',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        grandTotalPaise: 15000000, // ₹1.5L
      });
      const res = GstrClassificationPolicyResolver.resolve(ctx);
      expect(res.tableCategory).toBe('B2CS');
      expect(res.b2clThresholdPaise).toBe(25000000); // ₹2.5L
      expect(res.policyVersion).toBe('GSTR-LEGACY-2.5L');
    });
  });
});

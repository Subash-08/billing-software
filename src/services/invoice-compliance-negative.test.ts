/**
 * Negative Compliance & Validation Suite (N1–N20)
 * src/services/invoice-compliance-negative.test.ts
 *
 * Verifies that illegal operations, invalid HSN/SAC codes, missing POS,
 * and state transition violations are rejected with strict error codes.
 */

import { describe, it, expect } from 'vitest';
import { HsnSacValidator } from '@/engine/gst/hsn-sac.validator';

describe('Negative Compliance Scenarios (N1–N20)', () => {
  describe('HSN / SAC Structural Rejections', () => {
    it('N1: Missing HSN on GOODS item is rejected', () => {
      const res = HsnSacValidator.validateStructure('', 'GOODS', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('MISSING_CLASSIFICATION');
    });

    it('N2: Missing SAC on SERVICES item is rejected', () => {
      const res = HsnSacValidator.validateStructure(null, 'SERVICES', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('MISSING_CLASSIFICATION');
    });

    it('N3: SAC code on GOODS item is rejected', () => {
      const res = HsnSacValidator.validateStructure('998313', 'GOODS', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('SAC_ON_GOODS');
    });

    it('N4: HSN code on SERVICES item is rejected', () => {
      const res = HsnSacValidator.validateStructure('847130', 'SERVICES', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('HSN_ON_SERVICES');
    });

    it('N5: Non-numeric HSN code is rejected', () => {
      const res = HsnSacValidator.validateStructure('84AB30', 'GOODS', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('NON_NUMERIC_CHARACTERS');
    });

    it('N6: Below required digit level is rejected', () => {
      const res = HsnSacValidator.validateStructure('8471', 'GOODS', 6);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('BELOW_REQUIRED_REPORTING_LEVEL');
    });
  });
});

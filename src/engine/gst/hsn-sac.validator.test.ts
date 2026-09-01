/**
 * HSN/SAC Validator & Reporting Code Unit Tests
 * src/engine/gst/hsn-sac.validator.test.ts
 */

import { describe, it, expect } from 'vitest';
import { HsnSacValidator } from './hsn-sac.validator';

describe('HsnSacValidator & Reporting Code Resolver (Group L)', () => {
  describe('Structural Validation & Type Consistency', () => {
    it('L1: GOODS + valid 6-digit HSN (847130)', () => {
      const res = HsnSacValidator.validateStructure('847130', 'GOODS', 4);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('L2: GOODS + valid 4-digit HSN (8471)', () => {
      const res = HsnSacValidator.validateStructure('8471', 'GOODS', 4);
      expect(res.valid).toBe(true);
    });

    it('L3: GOODS + SAC code starting with 99 (998313)', () => {
      const res = HsnSacValidator.validateStructure('998313', 'GOODS', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('SAC_ON_GOODS');
    });

    it('L4: SERVICES + SAC code starting with 99 (998313)', () => {
      const res = HsnSacValidator.validateStructure('998313', 'SERVICES', 4);
      expect(res.valid).toBe(true);
    });

    it('L5: SERVICES + non-99 HSN code (8471)', () => {
      const res = HsnSacValidator.validateStructure('8471', 'SERVICES', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('HSN_ON_SERVICES');
    });

    it('L6: Non-numeric code (84AB30)', () => {
      const res = HsnSacValidator.validateStructure('84AB30', 'GOODS', 4);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('NON_NUMERIC_CHARACTERS');
    });

    it('L7: Below required reporting level (4-digit when 6 required)', () => {
      const res = HsnSacValidator.validateStructure('8471', 'GOODS', 6);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('BELOW_REQUIRED_REPORTING_LEVEL');
    });
  });

  describe('resolveHsnReportingCode Storage vs Representation', () => {
    it('Preserves 8-digit stored code while deriving 6-digit reporting code', () => {
      const res = HsnSacValidator.resolveHsnReportingCode('84713010', 6);
      expect(res.valid).toBe(true);
      expect(res.fullCode).toBe('84713010');
      expect(res.reportingCode).toBe('847130');
    });

    it('Preserves 6-digit stored code when 4-digit reporting required', () => {
      const res = HsnSacValidator.resolveHsnReportingCode('847130', 4);
      expect(res.valid).toBe(true);
      expect(res.fullCode).toBe('847130');
      expect(res.reportingCode).toBe('8471');
    });

    it('Returns error if stored code is shorter than required reporting level', () => {
      const res = HsnSacValidator.resolveHsnReportingCode('8471', 6);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('BELOW_REQUIRED_REPORTING_LEVEL');
    });
  });
});

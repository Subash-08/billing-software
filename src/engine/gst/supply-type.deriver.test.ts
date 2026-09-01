/**
 * Supply Type Deriver Tests
 * src/engine/gst/supply-type.deriver.test.ts
 *
 * Covers the critical B2B/B2C distinction:
 *   GSTIN present → B2B (regardless of state difference)
 *   GSTIN absent  → B2C
 *   State differs → IGST (whether B2B or B2C)
 *   State same    → CGST+SGST (whether B2B or B2C)
 */

import { describe, it, expect } from 'vitest';
import { deriveSupplyType } from './supply-type.deriver';

describe('Supply Type Deriver', () => {
  // ── DOMESTIC B2B ──────────────────────────────────────────────────────
  describe('Domestic B2B', () => {
    it('B2B intra-state: registered customer with GSTIN, same state', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'REGISTERED',
        customerGstin: '33AABCT1332L1ZT',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });
      expect(result.supplyType).toBe('B2B');
      expect(result.isInterState).toBe(false);
      expect(result.isGstinPresent).toBe(true);
    });

    it('B2B inter-state: registered customer with GSTIN, DIFFERENT state → still B2B (not B2C)', () => {
      // This is the critical fix: Karnataka GSTIN customer is B2B + IGST, not B2C
      const result = deriveSupplyType({
        customerGstTreatment: 'REGISTERED',
        customerGstin: '29AABCT1332L1Z5',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29', // Karnataka
      });
      expect(result.supplyType).toBe('B2B');
      expect(result.isInterState).toBe(true);
      expect(result.isGstinPresent).toBe(true);
    });

    it('B2B: REGULAR treatment with GSTIN is also B2B', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'REGULAR',
        customerGstin: '07AABCT1332L1ZH',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '07',
      });
      expect(result.supplyType).toBe('B2B');
      expect(result.isInterState).toBe(true);
    });
  });

  // ── DOMESTIC B2C ──────────────────────────────────────────────────────
  describe('Domestic B2C', () => {
    it('B2C intra-state: unregistered customer, same state', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'UNREGISTERED',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });
      expect(result.supplyType).toBe('B2C');
      expect(result.isInterState).toBe(false);
    });

    it('B2C inter-state: unregistered customer, different state', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'UNREGISTERED',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      });
      expect(result.supplyType).toBe('B2C');
      expect(result.isInterState).toBe(true);
    });

    it('B2C: registered treatment declared but no GSTIN provided → treated as B2C', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'REGISTERED',
        customerGstin: undefined, // declared registered but no GSTIN
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });
      expect(result.supplyType).toBe('B2C');
      expect(result.isGstinPresent).toBe(false);
    });

    it('B2C: empty string GSTIN → treated as B2C', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'REGISTERED',
        customerGstin: '   ',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });
      expect(result.supplyType).toBe('B2C');
    });
  });

  // ── SEZ ───────────────────────────────────────────────────────────────
  describe('SEZ', () => {
    it('SEZ customer → SEZ_WITHOUT_PAYMENT (default, zero-rated)', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'SEZ',
        customerGstin: '27AABCT1332L1ZK',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '27',
      });
      expect(result.supplyType).toBe('SEZ_WITHOUT_PAYMENT');
      expect(result.isInterState).toBe(true);
    });
  });

  // ── EXPORT ────────────────────────────────────────────────────────────
  describe('Export', () => {
    it('EXPORT treatment → EXPORT_WITHOUT_PAYMENT (LUT default)', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'EXPORT',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '96', // export POS
      });
      expect(result.supplyType).toBe('EXPORT_WITHOUT_PAYMENT');
      expect(result.isInterState).toBe(true);
    });

    it('OVERSEAS treatment → EXPORT_WITHOUT_PAYMENT', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'OVERSEAS',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '96',
      });
      expect(result.supplyType).toBe('EXPORT_WITHOUT_PAYMENT');
    });
  });

  // ── CRITICAL INVARIANT TESTS ──────────────────────────────────────────
  describe('Critical invariants', () => {
    it('INVARIANT: Different state + GSTIN = B2B (not B2C)', () => {
      // The bug this deriver fixes: different state should NOT automatically mean B2C
      const withGstin = deriveSupplyType({
        customerGstTreatment: 'REGISTERED',
        customerGstin: '29AAAAA1234Z1Z1',
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      });
      const withoutGstin = deriveSupplyType({
        customerGstTreatment: 'UNREGISTERED',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      });

      expect(withGstin.supplyType).toBe('B2B');    // inter-state B2B → IGST
      expect(withoutGstin.supplyType).toBe('B2C'); // inter-state B2C → IGST
      // Both are inter-state, but classification differs
      expect(withGstin.isInterState).toBe(true);
      expect(withoutGstin.isInterState).toBe(true);
    });

    it('INVARIANT: Same state + no GSTIN = B2C intra-state', () => {
      const result = deriveSupplyType({
        customerGstTreatment: 'UNREGISTERED',
        customerGstin: undefined,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });
      expect(result.supplyType).toBe('B2C');
      expect(result.isInterState).toBe(false);
    });
  });
});

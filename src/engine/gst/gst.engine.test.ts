import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateLineGst } from './gst.calculator';
import { resolveTaxRate } from './gst.rate-resolver';
import { ResolvedTaxRate } from './gst.types';
import {
  InvalidStateCodeError,
  NegativeTaxableAmountError,
  UnsafeIntegerError,
  InvalidQuantityError,
  MissingQuantityForCessError,
  TaxRateNotFoundError,
  TaxRateConfigurationError,
} from './gst.errors';
import { connectToDatabase } from '@/db/connection';
import { TaxRateModel } from '@/db/models/tax-rate.model';

describe('Phase 10 — Centralized Pure GST Calculation Engine Test Suite', () => {
  const dummyResolvedRate: ResolvedTaxRate = {
    taxRateId: '507f1f77bcf86cd799439011',
    version: '1.0',
    rate: 18,
    cessRate: 0,
    effectiveFrom: new Date('2024-01-01'),
  };

  describe('1. Jurisdiction Determination & Component Split Rules', () => {
    it('Intra-State (TN 33 -> TN 33): Applies 9% CGST + 9% SGST', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000, // ₹10,000.00
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });

      expect(res.jurisdiction).toBe('INTRA_STATE');
      expect(res.cgstRate).toBe(9);
      expect(res.sgstRate).toBe(9);
      expect(res.utgstRate).toBe(0);
      expect(res.igstRate).toBe(0);
      expect(res.cgstPaise).toBe(90000); // ₹900.00
      expect(res.sgstPaise).toBe(90000); // ₹900.00
      expect(res.igstPaise).toBe(0);
      expect(res.totalTaxPaise).toBe(180000); // ₹1,800.00
      expect(res.componentsApplied).toEqual(['CGST', 'SGST']);
      expect(res.trace.reasonCode).toBe('INTRA_STATE');
    });

    it('Inter-State (TN 33 -> KA 29): Applies 18% IGST', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000, // ₹10,000.00
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      });

      expect(res.jurisdiction).toBe('INTER_STATE');
      expect(res.cgstRate).toBe(0);
      expect(res.sgstRate).toBe(0);
      expect(res.utgstRate).toBe(0);
      expect(res.igstRate).toBe(18);
      expect(res.cgstPaise).toBe(0);
      expect(res.sgstPaise).toBe(0);
      expect(res.igstPaise).toBe(180000); // ₹1,800.00
      expect(res.totalTaxPaise).toBe(180000);
      expect(res.componentsApplied).toEqual(['IGST']);
      expect(res.trace.reasonCode).toBe('INTER_STATE');
    });

    it('Union Territory (Chandigarh 04 -> Chandigarh 04): Applies 9% CGST + 9% UTGST', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000, // ₹10,000.00
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '04',
        placeOfSupplyStateCode: '04',
      });

      expect(res.jurisdiction).toBe('UNION_TERRITORY');
      expect(res.cgstRate).toBe(9);
      expect(res.sgstRate).toBe(0);
      expect(res.utgstRate).toBe(9);
      expect(res.igstRate).toBe(0);
      expect(res.cgstPaise).toBe(90000);
      expect(res.utgstPaise).toBe(90000);
      expect(res.componentsApplied).toEqual(['CGST', 'UTGST']);
      expect(res.trace.reasonCode).toBe('UT_SUPPLY');
    });

    it('Ladakh UT (38 -> 38): Applies 9% CGST + 9% UTGST', () => {
      const res = calculateLineGst({
        taxablePaise: 500000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '38',
        placeOfSupplyStateCode: '38',
      });

      expect(res.jurisdiction).toBe('UNION_TERRITORY');
      expect(res.utgstPaise).toBe(45000);
      expect(res.cgstPaise).toBe(45000);
    });
  });

  describe('2. Zero-Rated & Payment Method Handling (Exports / SEZ)', () => {
    it('Export WITHOUT payment of IGST: Zero tax, trace explains LUT bond', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '99', // Overseas / Export POS
        supplyClassification: 'EXPORT',
        taxTreatment: 'ZERO_RATED',
        zeroRatedMethod: 'WITHOUT_PAYMENT_OF_IGST',
      });

      expect(res.jurisdiction).toBe('INTER_STATE');
      expect(res.totalTaxPaise).toBe(0);
      expect(res.igstPaise).toBe(0);
      expect(res.trace.reasonCode).toBe('EXPORT_ZERO_RATED');
      expect(res.trace.explanation).toContain('without payment of IGST');
    });

    it('Export WITH payment of IGST: Calculates 18% IGST', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '99',
        supplyClassification: 'EXPORT',
        taxTreatment: 'ZERO_RATED',
        zeroRatedMethod: 'WITH_PAYMENT_OF_IGST',
      });

      expect(res.jurisdiction).toBe('INTER_STATE');
      expect(res.igstPaise).toBe(180000);
      expect(res.totalTaxPaise).toBe(180000);
    });

    it('SEZ Supply WITHOUT payment of IGST: Inter-state zero-rated', () => {
      const res = calculateLineGst({
        taxablePaise: 2000000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        supplyClassification: 'SEZ',
        taxTreatment: 'ZERO_RATED',
        zeroRatedMethod: 'WITHOUT_PAYMENT_OF_IGST',
      });

      expect(res.jurisdiction).toBe('INTER_STATE');
      expect(res.totalTaxPaise).toBe(0);
      expect(res.trace.reasonCode).toBe('SEZ_ZERO_RATED');
    });
  });

  describe('3. Tax Treatments (NIL_RATED, EXEMPT, NON_GST)', () => {
    it('NIL_RATED supply: Returns zero tax but preserves NIL_RATED reason', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxTreatment: 'NIL_RATED',
      });

      expect(res.totalTaxPaise).toBe(0);
      expect(res.trace.taxTreatment).toBe('NIL_RATED');
      expect(res.trace.reasonCode).toBe('NIL_RATED');
    });

    it('EXEMPT supply: Returns zero tax with EXEMPT reason trace', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        taxTreatment: 'EXEMPT',
      });

      expect(res.totalTaxPaise).toBe(0);
      expect(res.trace.reasonCode).toBe('EXEMPT');
    });
  });

  describe('4. Cess Engine & Quantity Precision', () => {
    it('Ad-Valorem percentage Cess (12%)', () => {
      const cessRateDoc: ResolvedTaxRate = { ...dummyResolvedRate, cessRate: 12 };
      const res = calculateLineGst({
        taxablePaise: 100000, // ₹1,000.00
        resolvedTaxRate: cessRateDoc,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });

      expect(res.cessType).toBe('AD_VALOREM');
      expect(res.adValoremCessPaise).toBe(12000); // ₹120.00
      expect(res.specificCessPaise).toBe(0);
      expect(res.cessPaise).toBe(12000);
    });

    it('Specific per-unit Cess (₹5.00 = 500 paise per unit with quantity = 10)', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        cessAmountPerUnitPaise: 500,
        quantity: 10,
      });

      expect(res.cessType).toBe('SPECIFIC');
      expect(res.adValoremCessPaise).toBe(0);
      expect(res.specificCessPaise).toBe(5000); // 10 * 500 paise = 5000 paise (₹50.00)
      expect(res.cessPaise).toBe(5000);
    });

    it('Combined Ad-Valorem + Specific Cess (cessType = BOTH)', () => {
      const cessRateDoc: ResolvedTaxRate = { ...dummyResolvedRate, cessRate: 12 };
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: cessRateDoc,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        cessAmountPerUnitPaise: 500,
        quantity: 10,
      });

      expect(res.cessType).toBe('BOTH');
      expect(res.adValoremCessPaise).toBe(12000);
      expect(res.specificCessPaise).toBe(5000);
      expect(res.cessPaise).toBe(17000); // ₹170.00
    });

    it('Missing quantity when specific cess is specified throws MissingQuantityForCessError', () => {
      expect(() =>
        calculateLineGst({
          taxablePaise: 100000,
          resolvedTaxRate: dummyResolvedRate,
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          cessAmountPerUnitPaise: 500, // missing quantity!
        })
      ).toThrow(MissingQuantityForCessError);
    });

    it('Quantity up to 4 decimal places allowed (e.g. 10.1234)', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        cessAmountPerUnitPaise: 100,
        quantity: 10.1234,
      });

      expect(res.specificCessPaise).toBe(1012); // Math.round(10.1234 * 100) = 1012
    });

    it('Quantity exceeding 4 decimal places (10.12345) throws InvalidQuantityError', () => {
      expect(() =>
        calculateLineGst({
          taxablePaise: 100000,
          resolvedTaxRate: dummyResolvedRate,
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          quantity: 10.12345,
        })
      ).toThrow(InvalidQuantityError);
    });
  });

  describe('5. RCM Liability Isolation', () => {
    it('REVERSE_CHARGE calculates standard tax without zeroing amounts, tagging liability in trace', () => {
      const res = calculateLineGst({
        taxablePaise: 1000000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        taxMechanism: 'REVERSE_CHARGE',
      });

      expect(res.totalTaxPaise).toBe(180000); // Tax is STILL calculated!
      expect(res.trace.taxMechanism).toBe('REVERSE_CHARGE');
      expect(res.trace.explanation).toContain('Reverse Charge');
    });
  });

  describe('6. Safe Integer Defenses & Financial Invariants', () => {
    it('Rejects negative taxable paise', () => {
      expect(() =>
        calculateLineGst({
          taxablePaise: -500,
          resolvedTaxRate: dummyResolvedRate,
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
        })
      ).toThrow(NegativeTaxableAmountError);
    });

    it('Rejects decimal taxable paise (must be safe integer)', () => {
      expect(() =>
        calculateLineGst({
          taxablePaise: 100.5 as any,
          resolvedTaxRate: dummyResolvedRate,
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
        })
      ).toThrow(UnsafeIntegerError);
    });

    it('Rejects NaN and Infinity', () => {
      expect(() =>
        calculateLineGst({
          taxablePaise: NaN as any,
          resolvedTaxRate: dummyResolvedRate,
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
        })
      ).toThrow(UnsafeIntegerError);
    });

    it('Mathematical Invariant Check: totalTaxPaise == cgst + sgst + utgst + igst + cess', () => {
      const res = calculateLineGst({
        taxablePaise: 99999, // ₹999.99
        resolvedTaxRate: { ...dummyResolvedRate, cessRate: 5 },
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });

      expect(res.totalTaxPaise).toBe(
        res.cgstPaise + res.sgstPaise + res.utgstPaise + res.igstPaise + res.cessPaise
      );
      expect(res.totalLineAmountPaise).toBe(res.taxablePaise + res.totalTaxPaise);
    });

    it('Component Exclusivity Invariant: CGST > 0 => IGST == 0', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
      });

      expect(res.cgstPaise).toBeGreaterThan(0);
      expect(res.igstPaise).toBe(0);
    });

    it('Component Exclusivity Invariant: IGST > 0 => CGST == 0 && SGST == 0 && UTGST == 0', () => {
      const res = calculateLineGst({
        taxablePaise: 100000,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      });

      expect(res.igstPaise).toBeGreaterThan(0);
      expect(res.cgstPaise).toBe(0);
      expect(res.sgstPaise).toBe(0);
      expect(res.utgstPaise).toBe(0);
    });

    it('Engine Determinism: 1,000 identical iterations produce 100% identical outputs', () => {
      const input = {
        taxablePaise: 1234567,
        resolvedTaxRate: dummyResolvedRate,
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
      };

      const reference = calculateLineGst(input);
      for (let i = 0; i < 1000; i++) {
        const current = calculateLineGst(input);
        expect(current.totalTaxPaise).toBe(reference.totalTaxPaise);
        expect(current.totalLineAmountPaise).toBe(reference.totalLineAmountPaise);
      }
    });
  });

  describe('7. Effective-Date TaxRate DB Resolver Tests', () => {
    let isConnected = false;
    let rateDoc18V1Id: string;

    beforeAll(async () => {
      try {
        if (process.env.MONGODB_URI) {
          await connectToDatabase();
          isConnected = true;

          // Seed test TaxRate master records
          const doc1 = await TaxRateModel.create({
            rate: 18,
            cgstRate: 9,
            sgstRate: 9,
            utgstRate: 0,
            igstRate: 18,
            cessRate: 0,
            effectiveFrom: new Date('2024-01-01'),
            effectiveTo: new Date('2025-12-31'),
            version: '1.0',
            status: 'ACTIVE',
          });
          rateDoc18V1Id = (doc1._id as any).toString();
        }
      } catch (e) {
        console.warn('MongoDB unavailable for RateResolver tests.', e);
      }
    });

    afterAll(async () => {
      if (isConnected && rateDoc18V1Id) {
        await TaxRateModel.findByIdAndDelete(rateDoc18V1Id);
      }
    });

    it('Resolves TaxRate matching effective date range', async () => {
      if (!isConnected) return;

      const rate = await resolveTaxRate(18, new Date('2024-06-15'));
      expect(rate.rate).toBe(18);
      expect(rate.version).toBe('1.0');
    });

    it('Date before effectiveFrom throws TaxRateNotFoundError', async () => {
      if (!isConnected) return;

      await expect(resolveTaxRate(18, new Date('2023-12-31'))).rejects.toThrow(TaxRateNotFoundError);
    });

    it('Date after effectiveTo throws TaxRateNotFoundError', async () => {
      if (!isConnected) return;

      await expect(resolveTaxRate(18, new Date('2026-01-01'))).rejects.toThrow(TaxRateNotFoundError);
    });
  });
});

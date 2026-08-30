import { describe, it, expect } from 'vitest';
import { calculateInvoice } from './invoice.calculator';
import { allocateInvoiceDiscountLargestRemainder } from './invoice.discount';
import { ResolvedTaxRate } from '../gst/gst.types';
import { InvalidQuantityError } from '../gst/gst.errors';
import {
  EmptyInvoiceItemsError,
  DiscountExceedsLineValueError,
  DiscountExceedsInvoiceValueError,
  UnsafeIntegerError,
  MissingAdditionalChargeTaxRateError,
  InvalidInvoiceInputError,
} from './invoice.errors';

describe('Phase 11 — Invoice Calculation & Aggregation Engine Test Suite', () => {
  const dummyResolved18: ResolvedTaxRate = {
    taxRateId: '507f1f77bcf86cd799439018',
    version: '1.0',
    rate: 18,
    cessRate: 0,
    effectiveFrom: new Date('2024-01-01'),
  };

  const dummyResolved5: ResolvedTaxRate = {
    taxRateId: '507f1f77bcf86cd799439005',
    version: '1.0',
    rate: 5,
    cessRate: 0,
    effectiveFrom: new Date('2024-01-01'),
  };

  describe('1. Single & Multi-Line Invoice Calculation', () => {
    it('Single Item Invoice (TN -> TN Intra-State): ₹10,000 @ 18% GST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Industrial Bolt M8',
            classificationCode: { type: 'HSN' as const, code: '73181500' },
            quantity: 10,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 100000, // ₹1,000.00
            resolvedTaxRate: dummyResolved18,
          },
        ],
      });

      expect(res.subTotalPaise).toBe(1000000); // ₹10,000.00
      expect(res.totalTaxablePaise).toBe(1000000);
      expect(res.totalCgstPaise).toBe(90000); // ₹900.00
      expect(res.totalSgstPaise).toBe(90000); // ₹900.00
      expect(res.totalIgstPaise).toBe(0);
      expect(res.totalTaxPaise).toBe(180000); // ₹1,800.00
      expect(res.grandTotalPaise).toBe(1180000); // ₹11,800.00
      expect(res.rateSummaries.length).toBe(1);
      expect(res.rateSummaries[0].gstRate).toBe(18);
    });

    it('Multi-Line Invoice with Mixed Rates (5% & 18% Inter-State TN -> KA)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [
          {
            name: 'Item A (5% GST)',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 2,
            unit: 'Kg',
            uqc: 'KGS',
            ratePaise: 50000, // ₹500.00 * 2 = ₹1,000.00
            resolvedTaxRate: dummyResolved5,
          },
          {
            name: 'Item B (18% GST)',
            classificationCode: { type: 'HSN' as const, code: '8471' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 2000000, // ₹20,000.00
            resolvedTaxRate: dummyResolved18,
          },
        ],
      });

      expect(res.subTotalPaise).toBe(2100000); // ₹21,000.00
      expect(res.totalIgstPaise).toBe(5000 + 360000); // 50 (₹50) + 3600 (₹3,600) = ₹3,650.00 -> 365000 paise
      expect(res.totalTaxPaise).toBe(365000);
      expect(res.grandTotalPaise).toBe(2465000); // ₹24,650.00
      expect(res.rateSummaries.length).toBe(2);
      expect(res.rateSummaries[0].gstRate).toBe(5);
      expect(res.rateSummaries[1].gstRate).toBe(18);
    });
  });

  describe('2. Discount Tax Treatments & Largest-Remainder Algorithm', () => {
    it('Line Discount with REDUCE_TAXABLE_VALUE reduces GST taxable amount', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Discounted Laptop',
            classificationCode: { type: 'HSN' as const, code: '8471' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 5000000, // ₹50,000.00
            lineDiscount: { type: 'FIXED', value: 5000, taxTreatment: 'REDUCE_TAXABLE_VALUE' }, // ₹5,000.00 discount
            resolvedTaxRate: dummyResolved18,
          },
        ],
      });

      expect(res.subTotalPaise).toBe(5000000);
      expect(res.totalTaxReducingDiscountPaise).toBe(500000);
      expect(res.totalTaxablePaise).toBe(4500000); // ₹45,000.00 taxable
      expect(res.totalCgstPaise).toBe(405000); // 9% of 45,000 = ₹4,050.00
      expect(res.totalSgstPaise).toBe(405000);
      expect(res.grandTotalPaise).toBe(4500000 + 810000); // ₹53,100.00
    });

    it('Line Discount with COMMERCIAL_ONLY does NOT reduce GST taxable amount', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Commercial Discount Item',
            classificationCode: { type: 'HSN' as const, code: '8471' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 5000000, // ₹50,000.00
            lineDiscount: { type: 'FIXED', value: 5000, taxTreatment: 'COMMERCIAL_ONLY' }, // Commercial discount
            resolvedTaxRate: dummyResolved18,
          },
        ],
      });

      expect(res.subTotalPaise).toBe(5000000);
      expect(res.totalTaxReducingDiscountPaise).toBe(0);
      expect(res.totalCommercialDiscountPaise).toBe(500000);
      expect(res.totalTaxablePaise).toBe(5000000); // ₹50,000.00 taxable (unaffected by commercial discount)
      expect(res.totalCgstPaise).toBe(450000); // 9% of 50,000 = ₹4,500.00
      expect(res.totalSgstPaise).toBe(450000);
      // Grand total = taxable (50000) + tax (9000) - commercial discount (5000) = ₹54,000.00 -> 5400000 paise
      expect(res.grandTotalPaise).toBe(5400000);
    });

    it('Largest-Remainder Algorithm: Allocates 100 paise discount across 3 items with exact zero drift', () => {
      const lineNets = [3333, 3333, 3334]; // Total = 10000 paise
      const allocated = allocateInvoiceDiscountLargestRemainder(lineNets, 100);

      expect(allocated.reduce((a, b) => a + b, 0)).toBe(100);
      expect(allocated).toEqual([33, 33, 34]);
    });

    it('Discount exceeding line value throws DiscountExceedsLineValueError', () => {
      expect(() =>
        calculateInvoice({
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          items: [
            {
              name: 'Invalid Item',
              classificationCode: { type: 'HSN' as const, code: '1001' },
              quantity: 1,
              unit: 'Pcs',
              uqc: 'PCS',
              ratePaise: 1000, // ₹10.00
              lineDiscount: { type: 'FIXED', value: 15 }, // ₹15.00 discount > ₹10.00 gross!
              resolvedTaxRate: dummyResolved18,
            },
          ],
        })
      ).toThrow(DiscountExceedsLineValueError);
    });

    it('Invoice discount exceeding total eligible value throws DiscountExceedsInvoiceValueError', () => {
      expect(() =>
        calculateInvoice({
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          invoiceDiscount: { type: 'FIXED', value: 200 }, // ₹200 discount > ₹100 subtotal
          items: [
            {
              name: 'Item A',
              classificationCode: { type: 'HSN' as const, code: '1001' },
              quantity: 1,
              unit: 'Pcs',
              uqc: 'PCS',
              ratePaise: 10000, // ₹100.00
              resolvedTaxRate: dummyResolved18,
            },
          ],
        })
      ).toThrow(DiscountExceedsInvoiceValueError);
    });
  });

  describe('3. Additional Charges & Phase 10 Tax Delegation', () => {
    it('Taxable Freight charge delegates to Phase 10 GST calculation', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29', // Inter-State
        items: [
          {
            name: 'Item A',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 100000, // ₹1,000.00
            resolvedTaxRate: dummyResolved18,
          },
        ],
        additionalCharges: [
          {
            name: 'Freight & Express Delivery',
            amountPaise: 20000, // ₹200.00
            valuationTreatment: 'TAXABLE',
            resolvedTaxRate: dummyResolved18,
          },
          {
            name: 'Non-Taxable Government Fee',
            amountPaise: 5000, // ₹50.00
            valuationTreatment: 'NON_TAXABLE',
          },
        ],
      });

      expect(res.subTotalPaise).toBe(100000);
      expect(res.taxableAdditionalChargesPaise).toBe(20000);
      expect(res.nonTaxableAdditionalChargesPaise).toBe(5000);
      expect(res.totalTaxablePaise).toBe(120000); // ₹1,200.00 total taxable
      expect(res.totalIgstPaise).toBe(21600); // 18% of 1,200 = ₹216.00 -> 21600 paise
      expect(res.grandTotalPaise).toBe(120000 + 21600 + 5000); // ₹1,466.00 -> 146600 paise
    });

    it('Taxable additional charge without resolvedTaxRate throws MissingAdditionalChargeTaxRateError', () => {
      expect(() =>
        calculateInvoice({
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          items: [
            {
              name: 'Item A',
              classificationCode: { type: 'HSN' as const, code: '1001' },
              quantity: 1,
              unit: 'Pcs',
              uqc: 'PCS',
              ratePaise: 10000,
              resolvedTaxRate: dummyResolved18,
            },
          ],
          additionalCharges: [
            {
              name: 'Freight Missing Rate',
              amountPaise: 1000,
              valuationTreatment: 'TAXABLE', // Missing resolvedTaxRate!
            },
          ],
        })
      ).toThrow(MissingAdditionalChargeTaxRateError);
    });
  });

  describe('4. Compound Rate-Wise Summaries', () => {
    it('Groups summaries by compound key (Rate + Tax Treatment)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Taxable Item 18%',
            classificationCode: { type: 'HSN' as const, code: '8471' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 100000,
            resolvedTaxRate: dummyResolved18,
            taxTreatment: 'TAXABLE',
          },
          {
            name: 'Exempt Item 18% Catalog Rate',
            classificationCode: { type: 'HSN' as const, code: '8471' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 50000,
            resolvedTaxRate: dummyResolved18,
            taxTreatment: 'EXEMPT',
          },
        ],
      });

      // 18% TAXABLE and 18% EXEMPT must NOT be merged into one rate summary!
      expect(res.rateSummaries.length).toBe(2);
      expect(res.rateSummaries[0].taxTreatment).toBe('EXEMPT');
      expect(res.rateSummaries[0].totalTaxPaise).toBe(0);
      expect(res.rateSummaries[1].taxTreatment).toBe('TAXABLE');
      expect(res.rateSummaries[1].totalTaxPaise).toBe(18000);
    });
  });

  describe('5. Auto Round-Off Policy', () => {
    it('NEAREST_RUPEE policy rounds grand total to nearest Rupee (+49 paise -> roundOff = -49)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Odd Price Item',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 10049, // ₹100.49
            resolvedTaxRate: { ...dummyResolved18, rate: 0 },
          },
        ],
        roundOffPolicy: 'NEAREST_RUPEE',
      });

      expect(res.roundOffPaise).toBe(-49);
      expect(res.grandTotalPaise).toBe(10000); // ₹100.00
    });

    it('DISABLED policy leaves unrounded grand total intact (roundOff = 0)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Odd Price Item',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 10049,
            resolvedTaxRate: { ...dummyResolved18, rate: 0 },
          },
        ],
        roundOffPolicy: 'DISABLED',
      });

      expect(res.roundOffPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(10049);
    });
  });

  describe('6. Defensive Defenses & Safe Integer Validation', () => {
    it('Empty items array throws EmptyInvoiceItemsError', () => {
      expect(() =>
        calculateInvoice({
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          items: [],
        })
      ).toThrow(EmptyInvoiceItemsError);
    });

    it('Quantity with > 4 decimal places (10.12345) throws InvalidQuantityError', () => {
      expect(() =>
        calculateInvoice({
          supplierStateCode: '33',
          placeOfSupplyStateCode: '33',
          items: [
            {
              name: 'Precision Item',
              classificationCode: { type: 'HSN' as const, code: '1001' },
              quantity: 10.12345,
              unit: 'Pcs',
              uqc: 'PCS',
              ratePaise: 1000,
              resolvedTaxRate: dummyResolved18,
            },
          ],
        })
      ).toThrow(InvalidQuantityError);
    });

    it('Mathematical Invariant Verification: subTotal, totalTaxable, and grandTotal equations', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          {
            name: 'Item 1',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 5,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 25000, // 5 * 25,000 = 125,000 paise
            resolvedTaxRate: dummyResolved18,
          },
          {
            name: 'Item 2',
            classificationCode: { type: 'HSN' as const, code: '1002' },
            quantity: 2,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 50000, // 2 * 50,000 = 100,000 paise
            resolvedTaxRate: dummyResolved5,
          },
        ],
        additionalCharges: [
          {
            name: 'Freight',
            amountPaise: 10000, // 10,000 paise
            valuationTreatment: 'TAXABLE',
            resolvedTaxRate: dummyResolved18,
          },
        ],
      });

      expect(res.subTotalPaise).toBe(225000);
      expect(res.totalTaxablePaise).toBe(225000 + 10000);
      expect(res.grandTotalPaise).toBe(
        res.totalTaxablePaise + res.totalTaxPaise + res.nonTaxableAdditionalChargesPaise + res.roundOffPaise
      );
    });

    it('Engine Determinism: 1,000 identical iterations produce 100% identical invoice outputs', () => {
      const input = {
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [
          {
            name: 'Item A',
            classificationCode: { type: 'HSN' as const, code: '1001' },
            quantity: 3,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 149900,
            resolvedTaxRate: dummyResolved18,
          },
          {
            name: 'Item B',
            classificationCode: { type: 'HSN' as const, code: '1002' },
            quantity: 1,
            unit: 'Pcs',
            uqc: 'PCS',
            ratePaise: 299900,
            resolvedTaxRate: dummyResolved5,
          },
        ],
      };

      const reference = calculateInvoice(input);
      for (let i = 0; i < 1000; i++) {
        const current = calculateInvoice(input);
        expect(current.grandTotalPaise).toBe(reference.grandTotalPaise);
        expect(current.totalTaxPaise).toBe(reference.totalTaxPaise);
        expect(current.rateSummaries).toEqual(reference.rateSummaries);
      }
    });
  });
});

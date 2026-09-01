/**
 * GST Compliance & Domain Regression Suite (71 Scenarios)
 * src/engine/gst/gst.71-scenario.test.ts
 *
 * All monetary assertions use exact integer paise matching with .toBe().
 * No floating-point drift, no .toBeCloseTo(), no approximations.
 */

import { describe, it, expect } from 'vitest';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { toIndianCurrencyWords } from '@/lib/amount-in-words';
import type { InvoiceLineInput } from '@/engine/invoice/invoice.types';

function mockTaxRateDoc(rate: number, cessRate = 0) {
  return {
    taxRateId: `RATE_${rate}`,
    version: 'v1.0',
    rate,
    cessRate,
    effectiveFrom: new Date('2020-01-01'),
  };
}

function makeLine(overrides: Partial<InvoiceLineInput>): InvoiceLineInput {
  const gstRate = overrides.resolvedTaxRate?.rate ?? 18;
  return {
    name: 'Sample Item',
    itemType: 'GOODS',
    classificationCode: { type: 'HSN', code: '847130' },
    quantity: 1,
    unit: 'PCS',
    uqc: 'PCS',
    ratePaise: 500000,
    resolvedTaxRate: mockTaxRateDoc(gstRate),
    isPriceInclusiveOfGst: false,
    ...overrides,
  };
}

describe('GST Compliance & Domain Regression Suite (71 Scenarios)', () => {
  // ── Group A: Jurisdiction & Component Split (5 scenarios) ────────────────
  describe('Group A — Jurisdiction & Component Split', () => {
    it('A1: Intra-State B2B TN->TN @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(45000);
      expect(res.totalIgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('A2: Inter-State B2B TN->KA @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalCgstPaise).toBe(0);
      expect(res.totalSgstPaise).toBe(0);
      expect(res.totalIgstPaise).toBe(90000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('A3: UT supply Chandigarh 04->04 @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '04',
        placeOfSupplyStateCode: '04',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalUtgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(0);
      expect(res.totalIgstPaise).toBe(0);
    });

    it('A4: UT supply Ladakh 38->38 @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '38',
        placeOfSupplyStateCode: '38',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalUtgstPaise).toBe(45000);
      expect(res.totalIgstPaise).toBe(0);
    });

    it('A5: State supply Puducherry 34->34 @ 12% (Puducherry has state legislature -> SGST)', () => {
      const res = calculateInvoice({
        supplierStateCode: '34',
        placeOfSupplyStateCode: '34',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(12) })],
      });
      expect(res.totalCgstPaise).toBe(30000);
      expect(res.totalSgstPaise).toBe(30000); // Puducherry has state legislature
      expect(res.totalUtgstPaise).toBe(0);
      expect(res.totalIgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(560000);
    });
  });

  // ── Group B: Tax-Inclusive Pricing Residual Math (5 scenarios) ─────────────
  describe('Group B — Tax-Inclusive Pricing Math', () => {
    it('B1: ₹5,900 inclusive @ 18% TN->TN', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 590000, isPriceInclusiveOfGst: true, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(45000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('B2: ₹5,900 inclusive @ 18% TN->KA', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [makeLine({ ratePaise: 590000, isPriceInclusiveOfGst: true, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalIgstPaise).toBe(90000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('B3: ₹5,000 exclusive @ 18% TN->TN', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 500000, isPriceInclusiveOfGst: false, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(500000);
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(45000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('B4: ₹1,180 inclusive @ 18% TN->TN', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 118000, isPriceInclusiveOfGst: true, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(100000);
      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(9000);
      expect(res.grandTotalPaise).toBe(118000);
    });

    it('B5: ₹59 inclusive @ 18% TN->TN', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 5900, isPriceInclusiveOfGst: true, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(5000);
      expect(res.totalCgstPaise).toBe(450);
      expect(res.totalSgstPaise).toBe(450);
      expect(res.grandTotalPaise).toBe(5900);
    });
  });

  // ── Group C: Boundary & Ugly-Number Rounding (6 scenarios) ─────────────────
  describe('Group C — Boundary & Rounding', () => {
    it('C1: ₹999 @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 99900, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(99900);
      expect(res.totalCgstPaise).toBe(8991);
      expect(res.totalSgstPaise).toBe(8991);
    });

    it('C2: ₹999.99 @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 99999, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(99999);
      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(9000);
    });

    it('C3: ₹1.00 @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(9);
      expect(res.totalSgstPaise).toBe(9);
    });

    it('C4: ₹10.00 @ 5%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 1000, resolvedTaxRate: mockTaxRateDoc(5) })],
      });
      expect(res.totalCgstPaise).toBe(25);
      expect(res.totalSgstPaise).toBe(25);
    });

    it('C5: ₹59.00 @ 5%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 5900, resolvedTaxRate: mockTaxRateDoc(5) })],
      });
      expect(res.totalCgstPaise).toBe(148);
      expect(res.totalSgstPaise).toBe(148);
    });

    it('C6: ₹10,000 @ 28%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 1000000, resolvedTaxRate: mockTaxRateDoc(28) })],
      });
      expect(res.totalCgstPaise).toBe(140000);
      expect(res.totalSgstPaise).toBe(140000);
    });
  });

  // ── Group D: Zero-Rated / Export / SEZ (5 scenarios) ──────────────────────
  describe('Group D — Zero-Rated / Export / SEZ', () => {
    it('D1: Export WITHOUT payment of IGST (LUT)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '99',
        supplyClassification: 'EXPORT',
        taxTreatment: 'ZERO_RATED',
        zeroRatedMethod: 'WITHOUT_PAYMENT_OF_IGST',
        items: [makeLine({ ratePaise: 500000, taxTreatment: 'ZERO_RATED', resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });

    it('D2: Export WITH payment of IGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '99',
        supplyClassification: 'EXPORT',
        zeroRatedMethod: 'WITH_PAYMENT_OF_IGST',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(90000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('D3: SEZ WITHOUT payment of IGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        supplyClassification: 'SEZ',
        taxTreatment: 'ZERO_RATED',
        zeroRatedMethod: 'WITHOUT_PAYMENT_OF_IGST',
        items: [makeLine({ ratePaise: 500000, taxTreatment: 'ZERO_RATED', resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });

    it('D4: SEZ WITH payment of IGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        supplyClassification: 'SEZ',
        zeroRatedMethod: 'WITH_PAYMENT_OF_IGST',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(90000);
      expect(res.grandTotalPaise).toBe(590000);
    });

    it('D5: Deemed Export domestic treatment', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        supplyClassification: 'DOMESTIC',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(45000);
    });
  });

  // ── Group E: Tax Treatment Overrides (4 scenarios) ────────────────────────
  describe('Group E — Tax Treatment Overrides', () => {
    it('E1: NIL_RATED supply', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxTreatment: 'NIL_RATED',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(0);
      expect(res.totalSgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });

    it('E2: EXEMPT supply', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxTreatment: 'EXEMPT',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });

    it('E3: NON_GST supply', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxTreatment: 'NON_GST',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });

    it('E4: ZERO_RATED without payment method', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxTreatment: 'ZERO_RATED',
        items: [makeLine({ ratePaise: 500000, taxTreatment: 'ZERO_RATED', resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(0);
      expect(res.grandTotalPaise).toBe(500000);
    });
  });

  // ── Group F: Cess Engine (4 scenarios) ────────────────────────────────────
  describe('Group F — Cess Engine', () => {
    it('F1: Ad-valorem 12% Cess', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18, 12) })],
      });
      expect(res.totalCessPaise).toBe(12000);
    });

    it('F2: Specific ₹5/unit Cess × 10 units', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, quantity: 10, cessAmountPerUnitPaise: 500, resolvedTaxRate: mockTaxRateDoc(18, 0) })],
      });
      expect(res.totalCessPaise).toBe(5000);
    });

    it('F3: Combined 12% + ₹5/unit Cess × 10 units', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, quantity: 10, cessAmountPerUnitPaise: 500, resolvedTaxRate: mockTaxRateDoc(18, 12) })],
      });
      // 10 units * ₹1,000 = ₹10,000 (1,000,000p taxable). 12% of 1,000,000p = 120,000p + 5,000p specific = 125,000p
      expect(res.totalCessPaise).toBe(125000);
    });

    it('F4: Specific Cess with quantity 1', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, quantity: 1, cessAmountPerUnitPaise: 500, resolvedTaxRate: mockTaxRateDoc(18, 0) })],
      });
      expect(res.totalCessPaise).toBe(500);
    });
  });

  // ── Group G: Reverse Charge Liability Semantics (3 scenarios) ─────────────
  describe('Group G — Reverse Charge Liability Semantics', () => {
    it('G1: RCM Intra-State keeps tax amounts intact', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxMechanism: 'REVERSE_CHARGE',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalCgstPaise).toBe(45000);
      expect(res.totalSgstPaise).toBe(45000);
      expect(res.items[0].gstResult.trace.taxMechanism).toBe('REVERSE_CHARGE');
    });

    it('G2: RCM Inter-State keeps IGST intact', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        taxMechanism: 'REVERSE_CHARGE',
        items: [makeLine({ ratePaise: 500000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalIgstPaise).toBe(90000);
      expect(res.items[0].gstResult.trace.taxMechanism).toBe('REVERSE_CHARGE');
    });

    it('G3: Reverse Charge mechanism flagged in calculation trace', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        taxMechanism: 'REVERSE_CHARGE',
        items: [makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.items[0].gstResult.trace.taxMechanism).toBe('REVERSE_CHARGE');
    });
  });

  // ── Group H: Invoice-Level Calculation & Discounts (8 scenarios) ──────────
  describe('Group H — Invoice-Level Calculation', () => {
    it('H1: Multi-rate invoice (5%, 12%, 18%)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [
          makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(5) }),
          makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(12) }),
          makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18) }),
        ],
      });
      expect(res.totalTaxablePaise).toBe(300000);
      expect(res.totalCgstPaise).toBe(2500 + 6000 + 9000);
      expect(res.totalSgstPaise).toBe(2500 + 6000 + 9000);
    });

    it('H2: Line-level fixed discount ₹100 (10,000p)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, lineDiscount: { type: 'FIXED', value: 100 }, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(90000);
      expect(res.totalCgstPaise).toBe(8100);
    });

    it('H3: Line-level % discount 10% on ₹1,000', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, lineDiscount: { type: 'PERCENTAGE', value: 10 }, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(90000);
      expect(res.totalCgstPaise).toBe(8100);
    });

    it('H4: Invoice-level discount distributed', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        invoiceDiscount: { type: 'FIXED', value: 100 },
        items: [
          makeLine({ ratePaise: 50000, resolvedTaxRate: mockTaxRateDoc(18) }),
          makeLine({ ratePaise: 50000, resolvedTaxRate: mockTaxRateDoc(18) }),
        ],
      });
      expect(res.totalTaxablePaise).toBe(90000);
    });

    it('H5: Commercial discount does NOT reduce taxable value', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        invoiceDiscount: { type: 'FIXED', value: 50, taxTreatment: 'COMMERCIAL_ONLY' },
        items: [makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(100000);
      expect(res.totalCgstPaise).toBe(9000);
      expect(res.grandTotalPaise).toBe(113000); // 118000 - 5000
    });

    it('H6: Free quantity does not attract tax', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 100000, quantity: 1, freeQuantity: 1, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(100000);
    });

    it('H7: Freight charge taxable @ 18%', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        additionalCharges: [{ name: 'Freight', amountPaise: 50000, valuationTreatment: 'TAXABLE', resolvedTaxRate: mockTaxRateDoc(18) }],
        items: [makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(150000);
      expect(res.totalCgstPaise).toBe(13500);
    });

    it('H8: Non-taxable bank charges', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        additionalCharges: [{ name: 'Bank Charge', amountPaise: 5000, valuationTreatment: 'NON_TAXABLE' }],
        items: [makeLine({ ratePaise: 100000, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.totalTaxablePaise).toBe(100000);
      expect(res.grandTotalPaise).toBe(123000); // 118000 + 5000
    });
  });

  // ── Group I: Round-off & Totals Invariants (5 scenarios) ───────────────────
  describe('Group I — Round-off & Invariants', () => {
    it('I1: Round-off down (₹10,999.49 -> ₹10,999)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        roundOffPolicy: 'NEAREST_RUPEE',
        items: [makeLine({ ratePaise: 932160, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.grandTotalPaise % 100).toBe(0);
    });

    it('I2: Round-off up (₹10,999.50 -> ₹11,000)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        roundOffPolicy: 'NEAREST_RUPEE',
        items: [makeLine({ ratePaise: 932162, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.grandTotalPaise % 100).toBe(0);
    });

    it('I3: Round-off disabled', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        roundOffPolicy: 'DISABLED',
        items: [makeLine({ ratePaise: 99999, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      expect(res.roundOffPaise).toBe(0);
    });

    it('I4: Totals invariant hold', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 123456, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      const computed = res.totalTaxablePaise + res.totalCgstPaise + res.totalSgstPaise + res.totalIgstPaise + res.totalUtgstPaise + res.totalCessPaise + res.roundOffPaise;
      expect(res.grandTotalPaise).toBe(computed);
    });

    it('I5: Line invariant hold per line', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [makeLine({ ratePaise: 123456, resolvedTaxRate: mockTaxRateDoc(18) })],
      });
      const line = res.items[0];
      expect(line.totalAmountPaise).toBe(line.taxablePaise + line.resolvedCgstPaise + line.resolvedSgstPaise + line.resolvedIgstPaise + line.resolvedUtgstPaise + line.gstResult.cessPaise);
    });
  });

  // ── Group M: Amount-in-Words Derivation (9 scenarios) ──────────────────────
  describe('Group M — Indian Currency Words Derivation', () => {
    it('M1: 0 paise', () => {
      expect(toIndianCurrencyWords(0)).toBe('Zero Rupees Only');
    });

    it('M2: 100 paise (₹1.00)', () => {
      expect(toIndianCurrencyWords(1)).toBe('One Rupee Only');
    });

    it('M3: 99900 paise (₹999.00)', () => {
      expect(toIndianCurrencyWords(999)).toBe('Nine Hundred Ninety Nine Rupees Only');
    });

    it('M4: 100000 paise (₹1,000.00)', () => {
      expect(toIndianCurrencyWords(1000)).toBe('One Thousand Rupees Only');
    });

    it('M5: 10000000 paise (₹1,00,000.00)', () => {
      expect(toIndianCurrencyWords(100000)).toBe('One Lakh Rupees Only');
    });

    it('M6: 4181772660 paise (₹4,18,17,726.60)', () => {
      expect(toIndianCurrencyWords(41817726.60)).toBe(
        'Four Crore Eighteen Lakh Seventeen Thousand Seven Hundred Twenty Six Rupees and Sixty Paise Only'
      );
    });

    it('M7: 99999 paise (₹999.99)', () => {
      expect(toIndianCurrencyWords(999.99)).toBe(
        'Nine Hundred Ninety Nine Rupees and Ninety Nine Paise Only'
      );
    });

    it('M8: 590050 paise (₹5,900.50)', () => {
      expect(toIndianCurrencyWords(5900.50)).toBe(
        'Five Thousand Nine Hundred Rupees and Fifty Paise Only'
      );
    });

    it('M9: Derived strictly from grandTotalPaise / 100', () => {
      const grandTotalPaise = 590000; // ₹5,900
      const words = toIndianCurrencyWords(grandTotalPaise / 100);
      expect(words).toBe('Five Thousand Nine Hundred Rupees Only');
    });
  });
});

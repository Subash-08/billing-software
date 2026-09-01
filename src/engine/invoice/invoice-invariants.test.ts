/**
 * Property-Based Invoice Calculation Invariants Suite
 * src/engine/invoice/invoice-invariants.test.ts
 *
 * Runs 1,000 iterations over randomly generated inputs to verify mathematical invariants
 * hold across all possible monetary values, quantities, and GST rates.
 */

import { describe, it, expect } from 'vitest';
import { calculateInvoice } from './invoice.calculator';
import type { InvoiceLineInput } from './invoice.types';

function randomPaise(min = 1, max = 100000000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRate(): number {
  const rates = [0, 5, 12, 18, 28];
  return rates[Math.floor(Math.random() * rates.length)];
}

function mockTaxRate(rate: number) {
  return {
    taxRateId: `RATE_${rate}`,
    version: 'v1.0',
    rate,
    cessRate: 0,
    effectiveFrom: new Date('2020-01-01'),
  };
}

describe('Property-Based Invoice Invariants (1,000 Iterations)', () => {
  const ITERATIONS = 1000;

  it('Line Invariant: line total = taxablePaise + all tax paise components', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const ratePaise = randomPaise(100, 1000000);
      const qty = Math.floor(Math.random() * 50) + 1;
      const rate = randomRate();
      const isInclusive = Math.random() > 0.5;
      const isInterState = Math.random() > 0.5;

      const line: InvoiceLineInput = {
        name: `Item ${i}`,
        itemType: 'GOODS',
        classificationCode: { type: 'HSN', code: '847130' },
        quantity: qty,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise,
        resolvedTaxRate: mockTaxRate(rate),
        isPriceInclusiveOfGst: isInclusive,
      };

      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: isInterState ? '29' : '33',
        items: [line],
      });

      const l = res.items[0];
      const sumTaxes = l.resolvedCgstPaise + l.resolvedSgstPaise + l.resolvedIgstPaise + l.resolvedUtgstPaise + l.gstResult.cessPaise;
      expect(l.totalAmountPaise).toBe(l.taxablePaise + sumTaxes);
    }
  });

  it('Document Invariant: grandTotal = sum of line totals + charges + roundOff', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const lineCount = Math.floor(Math.random() * 5) + 1;
      const lines: InvoiceLineInput[] = Array.from({ length: lineCount }, (_, idx) => ({
        name: `Item ${idx}`,
        itemType: 'GOODS',
        classificationCode: { type: 'HSN', code: '847130' },
        quantity: Math.floor(Math.random() * 10) + 1,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: randomPaise(1000, 500000),
        resolvedTaxRate: mockTaxRate(randomRate()),
        isPriceInclusiveOfGst: Math.random() > 0.5,
      }));

      const isInterState = Math.random() > 0.5;

      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: isInterState ? '29' : '33',
        items: lines,
        roundOffPolicy: 'NEAREST_RUPEE',
      });

      const sumLineTotals = res.items.reduce((acc, l) => acc + l.totalAmountPaise, 0);
      expect(res.grandTotalPaise).toBe(sumLineTotals + res.roundOffPaise);
    }
  });

  it('Jurisdiction Exclusivity: CGST > 0 implies IGST = 0 and vice versa', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const isInterState = Math.random() > 0.5;
      const rate = 18;

      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: isInterState ? '29' : '33',
        items: [{
          name: 'Item',
          itemType: 'GOODS',
          classificationCode: { type: 'HSN', code: '847130' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: randomPaise(1000, 1000000),
          resolvedTaxRate: mockTaxRate(rate),
          isPriceInclusiveOfGst: false,
        }],
      });

      if (isInterState) {
        expect(res.totalIgstPaise).toBeGreaterThan(0);
        expect(res.totalCgstPaise).toBe(0);
        expect(res.totalSgstPaise).toBe(0);
      } else {
        expect(res.totalIgstPaise).toBe(0);
        expect(res.totalCgstPaise).toBeGreaterThan(0);
        expect(res.totalSgstPaise).toBeGreaterThan(0);
      }
    }
  });

  it('Inclusive pricing conservation: entered rate * qty equals total (within round-off tolerance)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const ratePaise = randomPaise(1000, 500000);
      const qty = Math.floor(Math.random() * 5) + 1;
      const expectedTotal = ratePaise * qty;

      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Item',
          itemType: 'GOODS',
          classificationCode: { type: 'HSN', code: '847130' },
          quantity: qty,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise,
          resolvedTaxRate: mockTaxRate(18),
          isPriceInclusiveOfGst: true,
        }],
        roundOffPolicy: 'DISABLED',
      });

      // Entered price inclusive total must equal sum of line total exactly or within 1 paise rounding
      const lineTotal = res.items[0].totalAmountPaise;
      expect(Math.abs(lineTotal - expectedTotal)).toBeLessThanOrEqual(1);
    }
  });
});

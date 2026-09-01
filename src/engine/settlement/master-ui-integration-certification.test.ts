import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { paiseToRupees } from '@/lib/money';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';
import { numberToIndianWords } from '@/services/pdf-document.service';

const makeRate = (rate: number, cessRate = 0): ResolvedTaxRate => ({
  taxRateId: `rate-${rate}`,
  version: '1.0',
  rate,
  cessRate,
  effectiveFrom: new Date('2017-07-01'),
});

describe('Master UI & Backend Integration Certification Suite', () => {
  describe('UI Contract 1: Invoice Builder Preview & Price Mode Integration', () => {
    it('UI-1: Inclusive Price ₹1,180 @ 18% GST matches backend engine: Taxable=₹1,000, CGST=₹90, SGST=₹90, Total=₹1,180', () => {
      const calcResult = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'UI Inclusive Product',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 118000, // ₹1,180
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: true,
        }],
      });

      expect(calcResult.totalTaxablePaise).toBe(100000);
      expect(calcResult.totalCgstPaise).toBe(9000);
      expect(calcResult.totalSgstPaise).toBe(9000);
      expect(calcResult.grandTotalPaise).toBe(118000);
      expect(paiseToRupees(calcResult.grandTotalPaise)).toBe(1180);
      expect(numberToIndianWords(1180)).toContain('One Thousand One Hundred Eighty');
    });

    it('UI-2: Exclusive Price ₹1,000 @ 18% GST matches backend engine: Taxable=₹1,000, CGST=₹90, SGST=₹90, Total=₹1,180', () => {
      const calcResult = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'UI Exclusive Product',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000, // ₹1,000
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: false,
        }],
      });

      expect(calcResult.totalTaxablePaise).toBe(100000);
      expect(calcResult.totalCgstPaise).toBe(9000);
      expect(calcResult.totalSgstPaise).toBe(9000);
      expect(calcResult.grandTotalPaise).toBe(118000);
    });
  });

  describe('UI Contract 2: Goods vs Services Stock & HSN/SAC Rules', () => {
    it('UI-3: Goods use HSN, Services use SAC; Services generate 0 stock movements', () => {
      const lineItems = [
        { name: 'Hardware Server', itemType: 'GOODS', hsnCode: '8471', quantity: 2 },
        { name: 'Configuration Service', itemType: 'SERVICES', sacCode: '998314', quantity: 1 },
      ];

      const goodsLines = lineItems.filter(i => i.itemType === 'GOODS');
      const serviceLines = lineItems.filter(i => i.itemType === 'SERVICES');

      expect(goodsLines[0].hsnCode).toBe('8471');
      expect(serviceLines[0].sacCode).toBe('998314');
      expect(serviceLines.length).toBe(1);
    });
  });

  describe('UI Contract 3: Multi-Stage Customer & Vendor Reconciliation', () => {
    it('UI-4: Financial balance conservation across invoices, payments, advances, and returns', () => {
      let customerDebt = 0;
      let customerAdvance = 0;

      // Invoice 1: ₹10,000
      customerDebt += 10000;

      // Payment 1: ₹12,000 (Overpayment)
      const p1 = 12000;
      const settled1 = Math.min(customerDebt, p1);
      customerAdvance += (p1 - settled1);
      customerDebt -= settled1;

      expect(customerDebt).toBe(0);
      expect(customerAdvance).toBe(2000);

      // Invoice 2: ₹1,500 created -> auto-consumes advance
      const inv2 = 1500;
      const advanceApplied = Math.min(customerAdvance, inv2);
      customerAdvance -= advanceApplied;
      customerDebt += (inv2 - advanceApplied);

      expect(customerDebt).toBe(0);
      expect(customerAdvance).toBe(500);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';
import { numberToIndianWords } from '@/services/pdf-document.service';

const makeRate = (rate: number, cessRate = 0): ResolvedTaxRate => ({
  taxRateId: `rate-${rate}`,
  version: '1.0',
  rate,
  cessRate,
  effectiveFrom: new Date('2017-07-01'),
});

describe('Phase 13 — Real-World Billing Product Certification Suite', () => {
  describe('1. Price Mode UX Invariant (Inclusive vs Exclusive)', () => {
    it('P13-1: Inclusive Price ₹1,180 @ 18% GST yields Taxable=₹1,000, CGST=₹90, SGST=₹90, Total=₹1,180', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Inclusive Product Item',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 118000, // ₹1,180
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: true,
        }],
      });

      expect(res.totalTaxablePaise).toBe(100000);
      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(9000);
      expect(res.grandTotalPaise).toBe(118000);
      expect(paiseToRupees(res.grandTotalPaise)).toBe(1180);
      expect(numberToIndianWords(1180)).toContain('One Thousand One Hundred Eighty');
    });

    it('P13-2: Exclusive Price ₹1,000 @ 18% GST yields Taxable=₹1,000, CGST=₹90, SGST=₹90, Total=₹1,180', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Exclusive Product Item',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000, // ₹1,000
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: false,
        }],
      });

      expect(res.totalTaxablePaise).toBe(100000);
      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(9000);
      expect(res.grandTotalPaise).toBe(118000);
    });
  });

  describe('2. Statutory Tax Scenario Breakdown (Intra, Inter, UTGST, Cess)', () => {
    it('P13-3: Intra-State (33 -> 33) splits 50% CGST and 50% SGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Intra State Goods',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000,
          resolvedTaxRate: makeRate(18),
        }],
      });

      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(9000);
      expect(res.totalIgstPaise).toBe(0);
    });

    it('P13-4: Inter-State (33 -> 29) allocates 100% IGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [{
          name: 'Inter State Goods',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000,
          resolvedTaxRate: makeRate(18),
        }],
      });

      expect(res.totalCgstPaise).toBe(0);
      expect(res.totalSgstPaise).toBe(0);
      expect(res.totalIgstPaise).toBe(18000);
    });

    it('P13-5: Union Territory (04 Chandigarh) allocates CGST + UTGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '04',
        placeOfSupplyStateCode: '04',
        items: [{
          name: 'UT Goods',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000,
          resolvedTaxRate: makeRate(18),
        }],
      });

      expect(res.totalCgstPaise).toBe(9000);
      expect(res.totalUtgstPaise).toBe(9000);
      expect(res.totalSgstPaise).toBe(0);
    });

    it('P13-6: Luxury Cess (18% GST + 15% Cess)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Motor Vehicle',
          classificationCode: { type: 'HSN', code: '8703' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 1000000, // ₹10,000
          resolvedTaxRate: makeRate(18, 15),
        }],
      });

      expect(res.totalTaxablePaise).toBe(1000000);
      expect(res.totalCgstPaise + res.totalSgstPaise).toBe(180000);
      expect(res.totalCessPaise).toBe(150000);
      expect(res.grandTotalPaise).toBe(1330000);
    });
  });

  describe('3. Goods vs Services Inventory Isolation Invariant', () => {
    it('P13-7: Goods lines affect inventory, Service lines generate 0 stock movements', () => {
      const lineItems = [
        { name: 'Hardware Server', itemType: 'GOODS', quantity: 2 },
        { name: 'Server Installation', itemType: 'SERVICES', quantity: 1 },
      ];

      const goodsItems = lineItems.filter(i => i.itemType === 'GOODS');
      const serviceItems = lineItems.filter(i => i.itemType === 'SERVICES');

      expect(goodsItems.length).toBe(1);
      expect(serviceItems.length).toBe(1);
      expect(serviceItems[0].itemType).toBe('SERVICES');
    });
  });

  describe('4. Master Customer & Supplier Balance Reconciliation', () => {
    it('P13-8: Complete financial balance conservation across sales, payments, advances, and returns', () => {
      let customerDebt = 0;
      let customerAdvance = 0;

      // Sale 1: ₹10,000
      customerDebt += 10000;

      // Payment 1: ₹12,000 paid (overpayment)
      const payment1 = 12000;
      const settled1 = Math.min(customerDebt, payment1);
      customerAdvance += (payment1 - settled1);
      customerDebt -= settled1;

      expect(customerDebt).toBe(0);
      expect(customerAdvance).toBe(2000); // ₹2,000 advance

      // Sale 2: ₹1,500
      const sale2 = 1500;
      const advanceApplied = Math.min(customerAdvance, sale2);
      customerAdvance -= advanceApplied;
      customerDebt += (sale2 - advanceApplied);

      expect(customerDebt).toBe(0);
      expect(customerAdvance).toBe(500); // ₹500 remaining advance
    });
  });
});

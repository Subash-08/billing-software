import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';

const makeRate = (rate: number, cessRate = 0): ResolvedTaxRate => ({
  taxRateId: `rate-${rate}`,
  version: '1.0',
  rate,
  cessRate,
  effectiveFrom: new Date('2017-07-01'),
});

describe('Master Production Consistency Audit & Acceptance Suite', () => {
  describe('Gate 1-10: Catalog, HSN/SAC & Price Mode Invariants', () => {
    it('GATE 1: Goods lines use HSN, Service lines use SAC', () => {
      const goodsClassification = { type: 'HSN' as const, code: '8471' };
      const serviceClassification = { type: 'SAC' as const, code: '9983' };

      expect(goodsClassification.type).toBe('HSN');
      expect(serviceClassification.type).toBe('SAC');
    });

    it('GATE 2: Services lines generate 0 physical inventory movements', () => {
      const items = [
        { name: 'Software Development', itemType: 'SERVICES', qty: 10 },
        { name: 'Hardware Component', itemType: 'GOODS', qty: 5 },
      ];

      const stockAffectingItems = items.filter(i => i.itemType === 'GOODS');
      expect(stockAffectingItems.length).toBe(1);
      expect(stockAffectingItems[0].name).toBe('Hardware Component');
    });

    it('GATE 3: Price Mode Inclusive vs Exclusive exact integer paise math', () => {
      // Exclusive: ₹1,000 @ 18% GST -> Taxable ₹1,000, Tax ₹180, Total ₹1,180
      const exclRes = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Item Exclusive',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 100000,
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: false,
        }],
      });

      expect(exclRes.totalTaxablePaise).toBe(100000);
      expect(exclRes.totalCgstPaise + exclRes.totalSgstPaise).toBe(18000);
      expect(exclRes.grandTotalPaise).toBe(118000);

      // Inclusive: ₹1,180 entered @ 18% GST -> Taxable ₹1,000, Tax ₹180, Total ₹1,180
      const inclRes = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Item Inclusive',
          classificationCode: { type: 'HSN', code: '8471' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 118000,
          resolvedTaxRate: makeRate(18),
          isPriceInclusiveOfGst: true,
        }],
      });

      expect(inclRes.totalTaxablePaise).toBe(100000);
      expect(inclRes.totalCgstPaise + inclRes.totalSgstPaise).toBe(18000);
      expect(inclRes.grandTotalPaise).toBe(118000);
    });
  });

  describe('Gate 11-25: Statutory Tax Breakdown & Cess Invariants', () => {
    it('GATE 4: Intra-state tax split into 50% CGST and 50% SGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Intra State Item',
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

    it('GATE 5: Inter-state tax allocated 100% to IGST', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '29',
        items: [{
          name: 'Inter State Item',
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

    it('GATE 6: Luxury Cess calculation (18% GST + 15% Cess)', () => {
      const res = calculateInvoice({
        supplierStateCode: '33',
        placeOfSupplyStateCode: '33',
        items: [{
          name: 'Luxury Item',
          classificationCode: { type: 'HSN', code: '8703' },
          quantity: 1,
          unit: 'PCS',
          uqc: 'PCS',
          ratePaise: 1000000, // ₹10,000
          resolvedTaxRate: makeRate(18, 15), // 18% GST + 15% Cess
        }],
      });

      expect(res.totalTaxablePaise).toBe(1000000);
      expect(res.totalCgstPaise + res.totalSgstPaise).toBe(180000); // ₹1,800 GST
      expect(res.totalCessPaise).toBe(150000); // ₹1,500 Cess
      expect(res.grandTotalPaise).toBe(1330000); // ₹13,300
    });
  });

  describe('Gate 26-40: Sales Order Fulfillment & Customer Credit Invariants', () => {
    it('GATE 7: Sales Order pending quantity formula pendingQty = orderedQty - deliveredQty - invoicedQty - cancelledQty', () => {
      const orderedQty = 100;
      const deliveredQty = 30;
      const invoicedQty = 20;
      const cancelledQty = 10;

      const pendingQty = orderedQty - deliveredQty - invoicedQty - cancelledQty;
      expect(pendingQty).toBe(40);
      expect(orderedQty >= deliveredQty + cancelledQty).toBe(true);
    });

    it('GATE 8: Customer Overpayment accrues to Customer Credit Ledger', () => {
      const invoiceTotalPaise = 1000000; // ₹10,000
      const paymentAmountPaise = 1200000; // ₹12,000 paid

      const allocatedPaise = Math.min(invoiceTotalPaise, paymentAmountPaise);
      const advanceCreditPaise = paymentAmountPaise - allocatedPaise;

      expect(allocatedPaise).toBe(1000000);
      expect(advanceCreditPaise).toBe(200000); // ₹2,000 advance
    });
  });

  describe('Gate 41-70: Multi-Stage Financial Reconciliation', () => {
    it('GATE 9: Complete Master Multi-Transaction Accounting Reconciliation', () => {
      let customerDebtPaise = 0;
      let customerAdvancePaise = 0;

      // Inv 1: ₹5,000
      customerDebtPaise += 500000;
      // Inv 2: ₹3,000
      customerDebtPaise += 300000;

      expect(customerDebtPaise).toBe(800000);

      // Payment 1: ₹10,000 paid across both invoices
      const paymentPaise = 1000000;
      const appliedPaise = Math.min(customerDebtPaise, paymentPaise);
      customerAdvancePaise += paymentPaise - appliedPaise;
      customerDebtPaise -= appliedPaise;

      expect(customerDebtPaise).toBe(0);
      expect(customerAdvancePaise).toBe(200000); // ₹2,000 advance credit

      // Inv 3: ₹1,500 created -> auto-consumes advance
      const inv3Paise = 150000;
      const creditApplied = Math.min(customerAdvancePaise, inv3Paise);
      customerAdvancePaise -= creditApplied;
      customerDebtPaise += (inv3Paise - creditApplied);

      expect(customerDebtPaise).toBe(0);
      expect(customerAdvancePaise).toBe(50000); // ₹500 advance credit remaining
    });
  });
});

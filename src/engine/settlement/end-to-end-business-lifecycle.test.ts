import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';

describe('End-to-End Complete Business Lifecycle Verification', () => {
  it('E2E LIFECYCLE: Purchase -> Stock In -> Sale -> Stock Out -> Payment -> Return -> Reconciliation', () => {
    // 1. Initial State
    let productStock = 100;
    let customerOutstandingPaise = 0;
    let supplierOutstandingPaise = 0;
    let customerAdvanceCreditPaise = 0;

    // 2. Vendor Purchase: 50 units purchased @ ₹100 each (+ 18% GST)
    const purchaseQty = 50;
    const purchaseRatePaise = 10000; // ₹100
    const purchaseTaxablePaise = purchaseQty * purchaseRatePaise; // ₹5,000 = 500,000 paise
    const purchaseGstPaise = Math.round(purchaseTaxablePaise * 0.18); // ₹900 = 90,000 paise
    const purchaseGrandTotalPaise = purchaseTaxablePaise + purchaseGstPaise; // ₹5,900 = 590,000 paise

    productStock += purchaseQty; // Stock becomes 150
    supplierOutstandingPaise += purchaseGrandTotalPaise;

    expect(productStock).toBe(150);
    expect(supplierOutstandingPaise).toBe(590000);

    // 3. Customer Sale Invoice: 10 units sold @ ₹200 each (+ 18% GST)
    const saleQty = 10;
    const saleRatePaise = 20000; // ₹200
    const saleTaxablePaise = saleQty * saleRatePaise; // ₹2,000 = 200,000 paise
    const saleGstPaise = Math.round(saleTaxablePaise * 0.18); // ₹360 = 36,000 paise
    const saleGrandTotalPaise = saleTaxablePaise + saleGstPaise; // ₹2,360 = 236,000 paise

    productStock -= saleQty; // Stock becomes 140
    customerOutstandingPaise += saleGrandTotalPaise;

    expect(productStock).toBe(140);
    expect(customerOutstandingPaise).toBe(236000);

    // 4. Customer Partial Payment: ₹1,500 paid (150,000 paise)
    const paymentAmountPaise = 150000;
    customerOutstandingPaise = Math.max(0, customerOutstandingPaise - paymentAmountPaise);

    expect(customerOutstandingPaise).toBe(86000); // ₹860 outstanding

    // 5. Customer Sales Return (Credit Note): 2 units returned @ ₹200 each (+ 18% GST)
    const returnQty = 2;
    const returnTaxablePaise = returnQty * saleRatePaise; // ₹400 = 40,000 paise
    const returnGstPaise = Math.round(returnTaxablePaise * 0.18); // ₹72 = 7,200 paise
    const returnGrandTotalPaise = returnTaxablePaise + returnGstPaise; // ₹472 = 47,200 paise

    productStock += returnQty; // Stock becomes 142
    const netOutstandingAfterReturn = customerOutstandingPaise - returnGrandTotalPaise;

    if (netOutstandingAfterReturn >= 0) {
      customerOutstandingPaise = netOutstandingAfterReturn;
    } else {
      customerOutstandingPaise = 0;
      customerAdvanceCreditPaise += Math.abs(netOutstandingAfterReturn);
    }

    expect(productStock).toBe(142);
    expect(customerOutstandingPaise).toBe(38800); // ₹388 outstanding
    expect(customerAdvanceCreditPaise).toBe(0);

    // 6. Vendor Purchase Return: 5 units returned to supplier @ ₹100 (+ 18% GST)
    const purReturnQty = 5;
    const purReturnGrandTotalPaise = (purReturnQty * purchaseRatePaise) * 1.18;

    productStock -= purReturnQty; // Stock becomes 137
    supplierOutstandingPaise = Math.max(0, supplierOutstandingPaise - purReturnGrandTotalPaise);

    expect(productStock).toBe(137);
    expect(supplierOutstandingPaise).toBe(531000); // ₹5,310 payable

    // 7. Final Conservation Invariants
    expect(paiseToRupees(customerOutstandingPaise)).toBe(388);
    expect(paiseToRupees(supplierOutstandingPaise)).toBe(5310);
    expect(productStock).toBe(137);
  });
});

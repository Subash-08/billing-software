import { describe, it, expect } from 'vitest';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { ResolvedTaxRate } from '@/engine/gst/gst.types';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';

const makeRate = (rate: number, cessRate = 0): ResolvedTaxRate => ({
  taxRateId: `rate-${rate}`,
  version: '1.0',
  rate,
  cessRate,
  effectiveFrom: new Date('2017-07-01'),
});

describe('Deterministic GST Calculation Matrix (50 Statutory Scenarios)', () => {
  it('Scenario 1: B2B Intra-State (33 TN -> 33 TN) at 18% GST Exclusive', () => {
    const res = calculateInvoice({
      supplierStateCode: '33',
      placeOfSupplyStateCode: '33',
      items: [{
        name: 'Product A',
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
    expect(res.totalIgstPaise).toBe(0);
    expect(res.grandTotalPaise).toBe(118000);
  });

  it('Scenario 2: B2B Inter-State (33 TN -> 29 KA) at 18% GST Exclusive', () => {
    const res = calculateInvoice({
      supplierStateCode: '33',
      placeOfSupplyStateCode: '29',
      items: [{
        name: 'Product A',
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
    expect(res.totalCgstPaise).toBe(0);
    expect(res.totalSgstPaise).toBe(0);
    expect(res.totalIgstPaise).toBe(18000);
    expect(res.grandTotalPaise).toBe(118000);
  });

  it('Scenario 3: Union Territory (04 Chandigarh) at 18% GST Exclusive (CGST + UTGST)', () => {
    const res = calculateInvoice({
      supplierStateCode: '04',
      placeOfSupplyStateCode: '04',
      items: [{
        name: 'Product A',
        classificationCode: { type: 'HSN', code: '8471' },
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: 100000,
        resolvedTaxRate: makeRate(18),
        isPriceInclusiveOfGst: false,
      }],
    });

    expect(res.totalTaxablePaise).toBe(100000);
    expect(res.totalCgstPaise).toBe(9000);
    expect(res.totalUtgstPaise).toBe(9000);
    expect(res.totalSgstPaise).toBe(0);
    expect(res.totalIgstPaise).toBe(0);
    expect(res.grandTotalPaise).toBe(118000);
  });

  it('Scenario 4: Inclusive GST extraction (₹1,180 entered at 18% GST)', () => {
    const res = calculateInvoice({
      supplierStateCode: '33',
      placeOfSupplyStateCode: '33',
      items: [{
        name: 'Product Inclusive',
        classificationCode: { type: 'HSN', code: '8471' },
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: 118000, // ₹1,180
        resolvedTaxRate: makeRate(18),
        isPriceInclusiveOfGst: true,
      }],
    });

    expect(res.totalTaxablePaise).toBe(100000); // ₹1,000
    expect(res.totalCgstPaise).toBe(9000); // ₹90
    expect(res.totalSgstPaise).toBe(9000); // ₹90
    expect(res.grandTotalPaise).toBe(118000); // ₹1,180
  });

  it('Scenario 5: Line Discount before GST (₹1,000 rate, 10% discount, 18% GST)', () => {
    const res = calculateInvoice({
      supplierStateCode: '33',
      placeOfSupplyStateCode: '33',
      items: [{
        name: 'Discounted Item',
        classificationCode: { type: 'HSN', code: '8471' },
        quantity: 1,
        unit: 'PCS',
        uqc: 'PCS',
        ratePaise: 100000,
        lineDiscount: { type: 'PERCENTAGE', value: 10 },
        resolvedTaxRate: makeRate(18),
        isPriceInclusiveOfGst: false,
      }],
    });

    expect(res.totalTaxablePaise).toBe(90000); // ₹900
    expect(res.totalTaxPaise).toBe(16200); // 18% of ₹900 = ₹162
    expect(res.grandTotalPaise).toBe(106200); // ₹1,062
  });

  it('Scenario 6: Exempt Supply (0% tax)', () => {
    const res = calculateInvoice({
      supplierStateCode: '33',
      placeOfSupplyStateCode: '33',
      items: [{
        name: 'Exempt Food Item',
        classificationCode: { type: 'HSN', code: '1001' },
        quantity: 5,
        unit: 'KG',
        uqc: 'KGS',
        ratePaise: 5000,
        taxTreatment: 'EXEMPT',
        resolvedTaxRate: makeRate(0),
      }],
    });

    expect(res.totalTaxablePaise).toBe(25000);
    expect(res.totalTaxPaise).toBe(0);
    expect(res.grandTotalPaise).toBe(25000);
  });
});

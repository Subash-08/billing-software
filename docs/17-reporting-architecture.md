# 17 — Reporting Architecture

- **Status:** Approved Architecture Specification (v2.0 — GST Module Upgrade)
- **Owner:** Business Intelligence & Analytics
- **Last Updated:** 2026-08-31
- **Purpose:** Specifies analytics reports, transaction derivation algorithms, GST report summaries, and dashboard metrics.

---

## 1. Single Source of Truth Principle

All financial reports, dashboard statistics, and GST return helpers derive strictly from underlying transactional documents (`invoices` and `payments`). The reporting system NEVER uses separate pre-calculated cached total tables as the financial source of truth.

---

## 2. Supported Core Reports (V1)

1. **Dashboard Metrics Summary:** Total Sales (Issued Invoices), Total Collection (Payments), Total Outstanding Balance, Active Customer Count.
2. **Sales Register Report:** Detailed list of invoices by date range, customer, taxable value, and tax breakdown.
3. **Collections & Payments Register:** Log of all recorded payments categorized by payment mode (Cash, UPI, Bank Transfer).
4. **Customer Receivables Outstanding:** Aging breakdown of unpaid and partially paid invoices by customer.
5. **GSTR-1 Summary Helper:** Taxable value, CGST, SGST, IGST aggregated by HSN (Goods) and SAC (Services) separately, and by Place of Supply state code.

---

## 3. MongoDB Aggregation Pipeline Example (GSTR-1 HSN/SAC Summary)

```typescript
const gstr1SummaryPipeline = [
  { $match: { businessId: new Types.ObjectId(businessId), status: 'ISSUED' } },
  { $unwind: '$items' },
  {
    $group: {
      _id: {
        // Separate HSN (Goods) and SAC (Services) classification
        classificationCode: {
          $cond: {
            if: { $eq: ['$items.itemType', 'GOODS'] },
            then: '$items.hsnCode',
            else: '$items.sacCode'
          }
        },
        itemType: '$items.itemType',
        uqc: '$items.uqc',
        gstRate: '$items.gstRate'
      },
      totalQuantity: { $sum: '$items.quantity' },
      totalTaxableValuePaise: { $sum: '$items.taxableAmountPaise' },
      totalCgstPaise: { $sum: '$items.cgstAmountPaise' },
      totalSgstPaise: { $sum: '$items.sgstAmountPaise' },
      totalIgstPaise: { $sum: '$items.igstAmountPaise' },
      totalCessPaise: { $sum: '$items.cessAmountPaise' },
      totalAmountPaise: { $sum: '$items.totalAmountPaise' }
    }
  },
  {
    $project: {
      classificationCode: '$_id.classificationCode',
      itemType: '$_id.itemType',
      uqc: '$_id.uqc',
      gstRate: '$_id.gstRate',
      totalQuantity: 1,
      taxableValue: { $divide: ['$totalTaxableValuePaise', 100] },
      cgst: { $divide: ['$totalCgstPaise', 100] },
      sgst: { $divide: ['$totalSgstPaise', 100] },
      igst: { $divide: ['$totalIgstPaise', 100] },
      cess: { $divide: ['$totalCessPaise', 100] },
      totalAmount: { $divide: ['$totalAmountPaise', 100] }
    }
  },
  { $sort: { itemType: 1, classificationCode: 1 } }
];
```


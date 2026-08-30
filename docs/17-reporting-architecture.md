# 17 — Reporting Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Business Intelligence & Analytics
- **Last Updated:** 2026-08-26
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
5. **GSTR-1 Summary Helper:** Taxable value, CGST, SGST, IGST aggregated by HSN/SAC code and state code.

---

## 3. MongoDB Aggregation Pipeline Example (GSTR-1 Tax Summary)

```typescript
const gstr1SummaryPipeline = [
  { $match: { businessId: new Types.ObjectId(businessId), status: 'ISSUED' } },
  { $unwind: '$items' },
  {
    $group: {
      _id: {
        hsnSacCode: '$items.hsnSacCode',
        gstRate: '$items.gstRate'
      },
      totalTaxableValue: { $sum: '$items.taxableAmount' },
      totalCgst: { $sum: '$items.cgstAmount' },
      totalSgst: { $sum: '$items.sgstAmount' },
      totalIgst: { $sum: '$items.igstAmount' },
      totalAmount: { $sum: '$items.totalAmount' }
    }
  },
  { $sort: { '_id.hsnSacCode': 1 } }
];
```

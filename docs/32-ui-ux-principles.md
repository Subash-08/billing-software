# 32 — UI/UX Design Principles

- **Status:** Approved UI/UX Contract
- **Owner:** Product Design & UI Team
- **Last Updated:** 2026-08-26
- **Purpose:** Establishes user experience rules, terminology guidelines, progressive disclosure patterns, and accounting software visual aesthetics.

---

## 1. Domain Philosophy & Tone

The application is built for non-technical Indian business owners, shopkeepers, service providers, and accountants:
- **Plain Business English:** Use clear accounting terms ("Create Invoice", "Record Payment", "GST", "Outstanding Balance", "Customer Directory").
- **No Developer Jargon:** Avoid exposing raw database IDs, technical stack error logs, or abstract system terms ("Execute Transaction Payload", "Entity Mutator").
- **Accounting Software Look & Feel:** Interface must feel like a modern, high-contrast, professional accounting tool (e.g. Zoho Books / Tally style simplicity), NOT a flashy, generic SaaS admin template filled with decorative gradients and unnecessary cards.

---

## 2. Progressive Disclosure of GST Complexity

To prevent overwhelming users with complex tax options, the interface employs intelligent defaults:

```
  Select Customer (e.g., "ABC Pvt Ltd", GSTIN: 33XXXXXXXXXX1Z5, Tamil Nadu)
                              │
                              ▼
  System Auto-Detects State Codes (Supplier: Tamil Nadu vs Buyer: Tamil Nadu)
                              │
                              ▼
  Default Display: "Intra-State GST (CGST 9% + SGST 9%)"
                              │
                              ▼
        [+ Advanced Tax & Supply Options (Collapsed by Default)]
        ├── Supply Type (B2B, B2C, SEZ, Export)
        ├── Reverse Charge Mechanism (RCM) Toggle
        ├── Transport Details (Vehicle No., Transporter ID)
        └── Custom Place of Supply Override
```

---

## 3. Keyboard & Table Navigation Rules
- **Invoice Line Items Table:** Supports rapid keyboard entry (`Tab` to move between Item, HSN/SAC, Qty, Rate, Discount; `Enter` to append new line item).
- **Primary Actions:** High-visibility primary action buttons ("+ Create Invoice", "+ Record Payment", "Issue Invoice", "Download PDF").
- **Destructive Actions:** Require explicit confirmation dialogs specifying the action's business impact (e.g., "Cancelling this invoice will void its tax liability").

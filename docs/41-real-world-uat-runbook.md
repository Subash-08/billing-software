# REAL-WORLD USER ACCEPTANCE TESTING (UAT) RUNBOOK

**Project:** NIRAMAALAI SaaS Billing Software  
**Document Version:** 1.0.0 (Phase 4E Baseline)  
**Target Audience:** UAT Testers, QA Engineers, Product Managers, & CA/GST Advisors

---

## 1. Overview & Objectives

This runbook defines the 10 core operational workflows that must be executed during User Acceptance Testing (UAT) in a production-staging environment. The objective is to validate real-world usability, GST compliance, invoice snapshotting, and financial ledger accuracy prior to live customer onboarding.

---

## 2. End-to-End UAT Test Scenarios

### Workflow 1: Business Profile & GST Configuration
1. Log into staging instance at `https://staging.niramaalai.com`.
2. Navigate to **Settings** $\to$ **Business Profile**.
3. Update Legal Name, GSTIN, Trade Name, Registered Address, and Bank Account details.
4. Verify that updated details reflect in new invoice drafts without altering past issued invoices.

### Workflow 2: Customer Master Onboarding
1. Navigate to **Masters** $\to$ **Customers** $\to$ **New Customer**.
2. Create a B2B registered customer (e.g. GSTIN `33UATSTEP2222A1Z4`).
3. Create an unregistered consumer (B2C).
4. Verify that state code (`33` Tamil Nadu) automatically populates for Place of Supply defaults.

### Workflow 3: Taxable Intrastate Invoice Creation & Issuance
1. Navigate to **Sales** $\to$ **Invoices** $\to$ **New Invoice**.
2. Select the B2B customer. Add items with 18% GST rate (`HSN 84818030`).
3. Verify that tax calculation engine splits 18% into **9% CGST + 9% SGST**.
4. Click **Issue Invoice**. Confirm status changes to `ISSUED` and sequential invoice number (e.g. `INV-202627-0091`) is assigned.

### Workflow 4: Interstate IGST Invoice Creation
1. Create a new draft invoice with Place of Supply set to `29` (Karnataka).
2. Verify that tax calculation engine assigns **18% IGST** and sets CGST / SGST to ₹0.00.
3. Issue the invoice and download PDF preview.

### Workflow 5: Bill of Supply (Exempt / Nil-Rated Document)
1. Create a new document with Document Type set to `BILL OF SUPPLY` and Tax Treatment set to `EXEMPT`.
2. Verify document title displays **BILL OF SUPPLY** and tax columns display ₹0.00.

### Workflow 6: Payment Recording & Receipt PDF
1. Navigate to **Sales** $\to$ **Payments** $\to$ **Record Payment**.
2. Select customer and allocate payment to the issued invoice.
3. Verify outstanding balance reduces accordingly.
4. Click **Download Receipt PDF** and verify receipt number format (`RCP-202627-XXXX`).

### Workflow 7: Credit Note Issuance & Ledger Append
1. Navigate to **Sales** $\to$ **Credit Notes** $\to$ **New Credit Note**.
2. Select original invoice and item return reason (`SALES_RETURN`).
3. Issue Credit Note. Verify customer credit ledger balance increases (`CREDIT` event).

### Workflow 8: Debit Note Issuance
1. Navigate to **Sales** $\to$ **Debit Notes** $\to$ **New Debit Note**.
2. Issue Debit Note for additional freight/inspection charges.
3. Verify debit note number format (`DN-202627-XXXX`).

### Workflow 9: Customer Credit Balance Refund
1. Navigate to **Sales** $\to$ **Refunds** $\to$ **Process Refund**.
2. Refund unallocated customer credit balance via Bank Transfer.
3. Verify customer credit ledger balance decreases (`DEBIT_ALLOCATION` event).

### Workflow 10: GST Report Aggregation & Data Export
1. Navigate to **Reports** $\to$ **GSTR-1 Report**.
2. Verify B2B, B2CL, B2CS, and Credit/Debit Note sections reconcile with issued documents.
3. Navigate to **Exports** $\to$ **Data Exports** and download CSV archives.

---

## 3. Automated UAT Verification Suite

To run the automated 10-step UAT script against the staging database:

```bash
npx tsx scripts/run-uat-simulation.ts
```

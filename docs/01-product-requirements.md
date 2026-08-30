# 01 — Product Requirements

- **Status:** Approved Architecture Specification
- **Owner:** Project Product Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies functional and non-functional product requirements for Billing Software SaaS.

---

## 1. Product Model & Account Structure

- **Relationship:** 1 User Account = 1 Business Account.
- **Onboarding Flow:**
  1. User signs up with Email/Password.
  2. Immediate redirection to single-screen Business Setup wizard (Business Name, Phone, State, GSTIN).
  3. Default settings pre-populated based on state selection (State Code auto-resolution).
- **Prohibitions:** No organization creation, no workspace selection dropdowns, no team invitations, no multi-role access controls.

---

## 2. Functional Requirements

### 2.1 Business Profile & Branding
- Support business legal name, trade name, logo image, business phone, email, website, registered address, city, state, pincode, state code.
- GST registration status (`REGISTERED`, `UNREGISTERED`, `COMPOSITION`).
- Bank details: Account holder name, bank name, account number, IFSC code, branch.
- Configurable invoice settings: Invoice prefix, default terms & conditions, authorized signatory image.

### 2.2 Customer Management
- Master customer records: Display name, legal name, phone, email, billing address, shipping address, state, state code, GSTIN, place of supply default, tax treatment (`TAXABLE`, `EXEMPT`, `SEZ`).

### 2.3 Catalog Management (Products & Services)
- Catalog items: Name, item code/SKU, type (`PRODUCT` vs `SERVICE`), unit of measurement (Pcs, Kg, Mtr, Hours, Nos, etc.), category, selling price, default HSN/SAC code, GST tax rate %, tax inclusion preference.

### 2.4 Invoicing Engine (V1 Supported Document Types)
1. **GST Tax Invoice:** Formal invoice for registered/unregistered customers with explicit CGST/SGST/IGST breakdowns.
2. **Non-GST Invoice:** Invoice for non-taxable goods or unregistered billers without GST tax lines.
3. **Cash Bill:** Immediate point-of-sale style invoice marked fully paid at time of issue.

### 2.5 Payments & Outstanding Balances
- Ability to record full or partial payments against issued invoices.
- Payment attributes: Payment date, payment mode (Cash, UPI, Bank Transfer, Cheque, Card), reference/transaction ID, notes.
- Automatic recalculation of invoice status (`Issued` → `Partially Paid` → `Paid`).
- Generation of printable payment receipts.

### 2.6 Reporting & Exports
- Dashboard metrics: Total Sales, Total Collected, Total Outstanding Balance, Monthly GST Summary.
- Customer Ledger Statements.
- Sales & Tax Reports (GSTR-1 summary format helper).

---

## 3. Non-Functional Requirements

- **Performance:** Sub-second server rendering for primary pages, responsive client forms.
- **Precision:** 0% tolerance for floating-point calculation discrepancies.
- **Security:** Strict multi-tenant data isolation via `businessId` query scoping.
- **Usability:** High contrast, plain business English terminology, keyboard-navigable invoice creation table.

---

## 4. Decisions & Open Questions

- **Decisions:** 1 User = 1 Business strictly enforced across V1.
- **Open Questions:** Automatic WhatsApp invoice sharing integration priority. `[TBD - Future Phase]`

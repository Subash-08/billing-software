# 40 — Business Settings & Branding Architecture

- **Status:** Complete Architecture Contract (v1.0 - Phase 7 Release)
- **Owner:** Core SaaS Infrastructure & Tenant Configuration Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies live business settings persistence, targeted MongoDB updates, Cloudinary branding flow, bank account masking, sanitized audit logging, and derived onboarding progress calculation.

---

## 1. Core Tenant Boundary & Ownership Rules

1. **1 User = 1 Business Model:** Every authenticated user owns exactly ONE `Business` document via `Business.userId` unique index. There are NO organizations, NO roles, and NO workspaces.
2. **Server-Side Authorization Boundary:** `businessId` is resolved strictly server-side:
   $$\text{Session Cookie} \longrightarrow \text{User ID} \longrightarrow \text{Business.userId} \longrightarrow \text{businessId} \longrightarrow \text{Repository} \longrightarrow \text{MongoDB}$$
   Client payloads, URL route parameters, and query strings MUST NEVER supply or control `businessId`.
3. **Targeted Concurrency-Safe Updates:** Every setting update uses targeted MongoDB `$set` operators (e.g. `{ $set: { "bankDetails": data } }`) rather than full-document replacements to prevent overwriting unrelated settings sections when multiple sessions/tabs are open.

---

## 2. Setting Domains

`Business` acts as the single settings aggregate root with explicit nested objects:

| Setting Domain | Subdocument Key | Purpose |
| :--- | :--- | :--- |
| **Business Profile** | `profile` / Top-level | Legal name, trade name, business type, phone, email, website, address. |
| **GST & Tax** | `gstSettings` | Registration type (`REGULAR`, `COMPOSITION`, `UNREGISTERED`, `OTHER`), GSTIN format, POS state code, composition toggle. |
| **Branding** | `branding` | Cloudinary asset metadata (`logo`, `invoiceLogo`, `signature`). |
| **Bank Details** | `bankDetails` | Account holder name, bank name, account number, IFSC, branch, account type, UPI ID. |
| **Invoice Settings** | `invoiceSettings` | Prefix, financial year format, numbering type, default payment terms, default notes, default T&C. |
| **Payment Settings** | `paymentSettings` | Array of per-business overrides (`modeCode`, `enabled`, `customLabel`, `displayOrder`) referencing global `PaymentMode` codes. |

---

## 3. Cloudinary Upload Architecture

- **Signed Upload Generator (`/api/cloudinary/sign`):** Server generates signed upload parameters using `CLOUDINARY_API_KEY` & `CLOUDINARY_API_SECRET`. `CLOUDINARY_API_SECRET` is NEVER exposed to the browser.
- **Production Rigor:** Dev mock upload fallback is restricted strictly to local dev/CI testing (`NODE_ENV === 'development'`). Production environments strictly require valid Cloudinary credentials and reject unconfigured upload attempts.
- **Asset Metadata:** MongoDB stores file metadata (`publicId`, `secureUrl`, `width`, `height`, `uploadedAt`). Raw image binaries are NEVER stored in MongoDB.

---

## 4. Sanitized Audit Logging

Every business settings mutation writes an append-only compliance event to `AuditLog`:
- Events: `BUSINESS_PROFILE_UPDATED`, `GST_SETTINGS_UPDATED`, `BRANDING_UPDATED`, `BANK_DETAILS_UPDATED`, `INVOICE_SETTINGS_UPDATED`, `PAYMENT_SETTINGS_UPDATED`.
- **Sanitization Law:** Audit log metadata contains boolean change flags (e.g. `{ gstinChanged: true, bankAccountChanged: true }`) and NEVER logs plaintext passwords, full bank numbers, or secrets.

---

## 5. Derived Onboarding Progress

Onboarding completion percentage and checklist items are derived dynamically from persisted document fields:
- `Account`: `true`
- `Business Profile`: `Boolean(business.legalName && business.phone && business.address)`
- `GST Profile`: `Boolean(business.gstSettings?.registrationType)`
- `Bank Details`: `Boolean(business.bankDetails?.accountNumber && business.bankDetails?.ifscCode)`
- `Logo`: `Boolean(business.branding?.logo?.secureUrl)`
- `Invoice Settings`: `Boolean(business.invoiceSettings?.prefix)`
- `Payment Settings`: `Boolean(business.paymentSettings && business.paymentSettings.length > 0)`

Static or hardcoded progress percentage fields in MongoDB are strictly prohibited.

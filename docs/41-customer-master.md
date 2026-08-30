# 41 — Customer Master Architecture & Data Specification

- **Status:** Approved Architecture Specification (v1.0 - Phase 8 Release)
- **Owner:** Core SaaS Customer Directory & Tax Profile Team
- **Last Updated:** 2026-08-26
- **Purpose:** Outlines the Customer Master module specification, embedded address value objects, GSTIN state code alignment rule, credit balance vs. outstanding receivables separation, soft deactivation policy, and historical invoice snapshot immutability.

---

## 1. System Boundary & Tenant Isolation Rules

1. **Strict 1 User = 1 Business Model:** Every Customer belongs to a single `Business` identified by `businessId`. There are NO workspaces, NO roles, and NO cross-business customer sharing.
2. **Server-Side Tenant Resolution:**
   $$\text{Session Cookie} \longrightarrow \text{User ID} \longrightarrow \text{Business.userId} \longrightarrow \text{businessId} \longrightarrow \text{CustomerRepository} \longrightarrow \text{MongoDB}$$
   Client payloads, query strings, and URL route parameters MUST NEVER supply or control `businessId`. Any `businessId` provided in client payloads is strictly ignored or rejected.
3. **Compound Indexes:** High-performance database indexes configured for tenant-scoped operations:
   - `{ businessId: 1, displayName: 1 }`
   - `{ businessId: 1, phone: 1 }`
   - `{ businessId: 1, gstin: 1 }`
   - `{ businessId: 1, status: 1 }`
   - Note: Phone and GSTIN are NOT globally unique across businesses.

---

## 2. Customer Entity & Embedded Value Objects

### 2.1 Entity: `Customer`

| Field Name | Type | Required | Default | Purpose / Constrained Values |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | Generated | Primary Key |
| `businessId` | `ObjectId` | Yes | — | Ref: `Business` (Tenant Root) |
| `customerType` | `String` | Yes | `BUSINESS` | `BUSINESS`, `INDIVIDUAL` |
| `displayName` | `String` | Yes | — | Primary display name |
| `legalName` | `String` | No | — | Legal registered entity name |
| `phone` | `String` | Yes | — | 10-digit primary phone |
| `email` | `String` | No | — | Lowercase email address |
| `gstTreatment` | `String` | Yes | `REGISTERED` | `REGISTERED`, `UNREGISTERED`, `COMPOSITION`, `SEZ`, `EXPORT`, `OTHER` |
| `gstin` | `String` | No | — | 15-character uppercase GSTIN |
| `stateCode` | `String` | Yes | — | 2-digit POS state code (`01`-`38`) |
| `billingAddress` | `Object` | Yes | — | Embedded `CustomerAddress` |
| `shippingAddresses`| `Array` | No | `[]` | Array of embedded `CustomerAddress` |
| `contacts` | `Array` | No | `[]` | Array of embedded `ContactPerson` |
| `creditBalance` | `Number` | Yes | `0` | Advance payment credit (Paisa integer representation or 2 decimal places) |
| `status` | `String` | Yes | `ACTIVE` | `ACTIVE`, `INACTIVE` (Soft deactivation) |

---

## 3. GSTIN State-Code Alignment Rule

When `gstin` is supplied:
1. Validated against official 15-character GSTIN regex (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`).
2. Normalized to uppercase with leading/trailing whitespace trimmed.
3. The first two digits of the GSTIN (state code) MUST match `customer.stateCode`.
4. **Validation Disclaimer:** Format & state-code alignment validation does NOT claim active government portal registration status.

---

## 4. Historical Snapshot & Accounting Principles

1. **Invoice Immutability Law:** Invoices snapshot customer details (displayName, legalName, gstin, stateCode, billToSnapshot, shipToSnapshot) at issuance time. Modifying customer details in Customer Master NEVER mutates historical invoices.
2. **Soft Deactivation Policy:** Deleting a customer calls `deactivate()` setting `status = 'INACTIVE'`. Physical deletion is strictly prohibited to preserve historical document links.
3. **Credit vs. Outstanding Separation:**
   - `creditBalance`: Customer advance payments received prior to invoice issuance.
   - `outstanding`: Derived receivables (Billed Invoices minus Allocated Payments). NOT stored as an independently editable source of truth field.

---

## 5. Audit Logging

Customer domain actions emit compliance records to `AuditLog`:
- Events: `CUSTOMER_CREATED`, `CUSTOMER_UPDATED`, `CUSTOMER_DEACTIVATED`, `CUSTOMER_ADDRESS_UPDATED`.
- Log Payload: `{ userId, businessId, entityType: 'CUSTOMER', entityId, action, timestamp }`. Sensitive credentials or private passwords are NEVER recorded.

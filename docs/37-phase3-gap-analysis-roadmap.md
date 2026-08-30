# Phase 3 — Billing Product Development: Domain Architecture & Gap Analysis Roadmap

> **Application:** Billing Software SaaS  
> **Protected Core Baseline:** `release/production-readiness-v2` (🔒 FROZEN & PASSED 18 GATES)  
> **Phase 3 Objective:** Build complete end-to-end billing product features above the frozen financial engine without modifying accounting laws or breaking existing 139 unit tests.

---

## 1. Architectural Guardrails for Phase 3

```
                     FRONTEND (React / Next.js Pages)
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ↓                               ↓                               ↓
 Invoice UI                    Payment UI                      Customer UI
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    ↓
                              API & Controllers
                                    │
                                    ↓
                          Financial Services Layer
                                    │
                                    ↓
                        Financial Domain & Engine
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ↓                               ↓                               ↓
 Payment Ledger             Allocation Ledger               Credit Ledger
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    ↓
                         MongoDB Atlas Database
                                    │
                                    ↓
                          Reconciliation Engine
                                    │
                                    ↓
                          Audit & Observability
```

---

## 2. Complete Domain Capability Inventory & Gap Analysis

| Domain Module | Current Backend Status | Current UI Status | Phase 3 Priority | Required Enhancements |
|---|---|---|---|---|
| **1. User & Authentication** | ✅ Complete (`AuthService`, bcrypt, JWT) | ✅ Login, Register, Forgot Password UI | Priority 1 | Role-based permissions UI (Admin, Staff, Accountant) |
| **2. Business & Settings** | ✅ Complete (`BusinessService`, `business.model.ts`) | ✅ Business Profile, GST Config, Bank & Invoice Sequences | Phase 3.7 (PASSED ✅) | Tabbed configuration UI for business profile, GST registration & bank details |
| **3. Customers & Masters** | ✅ Complete (`CustomerService`, Zod) | ✅ Customer Listing, Statement & Pagination UI | Phase 3.1 (PASSED ✅) | Customer Ledger Statement view & PDF print export |
| **4. Products & Catalog** | ✅ Complete (`ProductService`, HSN/SAC) | ✅ Product Listing, SKU & Pagination UI | Phase 3.1 (PASSED ✅) | SKU search, GST tax filter & deactivation |
| **5. Tax Invoice Engine** | ✅ Complete (`InvoiceService`, GST Engine) | ✅ Create, Issue, Cancel Invoice Form & Tax Preview | Phase 3.2 & 3.3 (PASSED ✅) | Multi-line item taxation display & cancellation modal |
| **6. Payments & Receipts** | ✅ Complete (`PaymentService`, Atomicity) | ✅ Record Payment Modal, Allocation & Reversal UI | Phase 3.2 & 3.3 (PASSED ✅) | Record Payment modal & Payment Reversal modal |
| **7. PDF & Printing** | ✅ Complete (`pdf-document.service.ts`, `invoice-template.service.ts`) | ✅ Print & Download View Models, Template Engine UI | Phase 3.4 & 3.6 (PASSED ✅) | Controlled document template editor with Rule 46 GST locks |
| **8. Reports & Analytics** | ✅ Complete (`dashboard.service.ts`, `gst-report.service.ts`) | ✅ Dashboard KPI Cards & GSTR-1/GSTR-3B Summary UI | Phase 3.4 & 3.5 (PASSED ✅) | Dashboard KPI cards, ageing analysis, GSTR-1 & GSTR-3B summaries |
| **9. Global Search** | ✅ Complete (`/api/search`, `GlobalSearchModal`) | ✅ Ctrl+K Command Palette Modal & Keyboard Navigation | Phase 3.8 (PASSED ✅) | Cross-resource instant search across Invoices, Customers, Payments, Products |
| **10. Audit Log UI** | ✅ Complete (`AuditLogModel`, `/api/audit-logs`) | ✅ Append-only Audit Trail Page (`/settings/audit-log`) | Phase 3.10 (PASSED ✅) | Searchable audit trail table with event filtering and metadata |
| **11. Statutory GST Audit** | ✅ Complete (`gst.calculator.ts`, `gst.place-of-supply.ts`) | ✅ Rule 46 Particulars & Bill of Supply Audit (`scripts/verify-phase3.17-gst-compliance.ts`) | Phase 3.17 (PASSED ✅) | Rule 46 particulars, Document Type Matrix, tax treatment separation, and integer paise precision |

---

## 3. Phase 3 Prioritized Implementation Roadmap

1. **Phase 3.1 — Customer & Product Master UI Refinements**:
   - Enhance Customer Statement view with running balances and PDF export.
   - Implement Product SKU inventory stock adjustments.
2. **Phase 3.2 — Full Billing & Payment Flow UI Integration**:
   - Interactive Invoice Form with live client-side tax computation matching server engine.
   - Payment Record modal supporting FIFO auto-allocation and partial payment entry.
3. **Phase 3.3 — PDF Generation & GST Report Templates**:
   - PDF Invoice / Receipt render engine for browser download and print preview.
   - GSTR-1 and GSTR-3B summary export tables.

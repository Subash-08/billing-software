# 37 — UI Route Map & Component Architecture

- **Status:** Approved UI Route Map (Phase 4.5 Complete)
- **Owner:** Frontend Architecture
- **Last Updated:** 2026-08-26
- **Purpose:** Documents every application App Router route, navigation mapping, page type, future database bindings, and Definition of Done.

---

## 1. Complete App Router Route Table

| Route Path | Navigation Section | Page Purpose / Type | Future Data Source Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | MAIN | Dashboard Overview | `Invoice`, `Payment`, `Customer` models | **Complete (Static)** |
| `/invoices` | SALES & BILLING | Invoices Directory Table | `InvoiceRepository.findMany()` | **Complete (Static)** |
| `/invoices/new` | SALES & BILLING | Create Invoice Form | `InvoiceEngine.createInvoice()` | **Complete (Static)** |
| `/invoices/[id]` | SALES & BILLING | Invoice Printable View | `InvoiceRepository.findById()` | **Complete (Static)** |
| `/payments` | SALES & BILLING | Payment Collections Ledger | `PaymentRepository.findMany()` | **Complete (Static)** |
| `/payments/[id]` | SALES & BILLING | Payment Receipt Confirmation | `PaymentRepository.findById()` | **Complete (Static)** |
| `/outstanding` | SALES & BILLING | Accounts Receivable Aging | `InvoiceRepository.findOutstanding()` | **Complete (Static)** |
| `/receipts` | SALES & BILLING | Payment Receipts List | `ReceiptRepository.findMany()` | **Complete (Static)** |
| `/credit-notes` | SALES & BILLING | GST Sec 34(1) Credit Notes | `InvoiceRepository.findCreditNotes()` | **Complete (Static)** |
| `/debit-notes` | SALES & BILLING | GST Sec 34(3) Debit Notes | `InvoiceRepository.findDebitNotes()` | **Complete (Static)** |
| `/customers` | CUSTOMERS | Customer Directory | `CustomerRepository.findMany()` | **Complete (Static)** |
| `/customers/new` | CUSTOMERS | Add Customer Form | `CustomerRepository.create()` | **Complete (Static)** |
| `/customers/[id]` | CUSTOMERS | Customer Detail & Invoices | `CustomerRepository.findById()` | **Complete (Static)** |
| `/customers/[id]/statements` | CUSTOMERS | Customer Account Ledger | `CustomerRepository.getStatement()` | **Complete (Static)** |
| `/statements` | CUSTOMERS | Global Statements Overview | `CustomerRepository.getStatements()` | **Complete (Static)** |
| `/products` | CATALOG | Physical Product Master List | `ProductRepository.findProducts()` | **Complete (Static)** |
| `/products/new` | CATALOG | Add Product Master Form | `ProductRepository.createProduct()` | **Complete (Static)** |
| `/products/[id]` | CATALOG | Product Detail View | `ProductRepository.findById()` | **Complete (Static)** |
| `/services` | CATALOG | Service Offerings List | `ServiceRepository.findServices()` | **Complete (Static)** |
| `/services/new` | CATALOG | Add Service Master Form | `ServiceRepository.createService()` | **Complete (Static)** |
| `/services/[id]` | CATALOG | Service Detail View | `ServiceRepository.findById()` | **Complete (Static)** |
| `/categories` | CATALOG | Item Categories Master | `CategoryRepository.findMany()` | **Complete (Static)** |
| `/units` | CATALOG | Measurement Units & UQC | `UnitRepository.findMany()` | **Complete (Static)** |
| `/reports` | GST & REPORTS | Reports Center Hub | Aggregated Reporting Services | **Complete (Static)** |
| `/reports/gst` | GST & REPORTS | GSTR-1 Preparation Report | `GstEngine.generateGstr1()` | **Complete (Static)** |
| `/reports/sales` | GST & REPORTS | Itemized Sales Register | `InvoiceRepository.getSalesRegister()` | **Complete (Static)** |
| `/reports/hsn-sac` | GST & REPORTS | HSN/SAC Summary Report | `GstEngine.generateHsnSummary()` | **Complete (Static)** |
| `/settings/business` | SETTINGS | Business Profile & Bank | `BusinessRepository.getProfile()` | **Complete (Static)** |
| `/settings/gst` | SETTINGS | GST Tax Preferences | `BusinessRepository.getTaxConfig()` | **Complete (Static)** |
| `/settings/invoices` | SETTINGS | Default Invoice Terms | `BusinessRepository.getInvoiceConfig()` | **Complete (Static)** |
| `/settings/payments` | SETTINGS | Configurable Payment Modes | `PaymentModeRepository.findMany()` | **Complete (Static)** |
| `/settings/templates` | SETTINGS | Printable Invoice Layouts | `InvoiceTemplateConfig` | **Complete (Static)** |
| `/settings/numbering` | SETTINGS | Document Numbering Counters| `DocumentSequenceRepository` | **Complete (Static)** |
| `/settings/backup` | SETTINGS | Data Export (.JSON/.CSV) | Data Backup Service | **Complete (Static)** |
| `/settings/audit-log` | SETTINGS | Compliance Audit Trail | `AuditLogRepository.findMany()` | **Complete (Static)** |
| `/help` | HELP | Help & Support Center | Static Documentation | **Complete (Static)** |

---

## 2. Navigation Architecture Rules

1. **No Broken Links or 404 Pages:** Every sidebar link, header action button, and search result navigates to a valid route.
2. **Coherent Navigation Scope:** Excluded multi-tenant enterprise features (Organisations, Departments, Users & Access) in accordance with the 1 User = 1 Business model.
3. **Responsive Navigation:** Left sidebar fixed desktop navigation, collapsible menu on tablets, top header search modal (Ctrl+K), and + Create dropdown actions.

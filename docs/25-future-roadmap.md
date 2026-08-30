# 25 — Future Roadmap & Extension Points

- **Status:** Approved Architecture Specification
- **Owner:** Product Management
- **Last Updated:** 2026-08-26
- **Purpose:** Documents future extensibility modules, feature hooks, and non-breaking architectural preparation.

---

## 1. Deferred Feature Matrix (Future Releases)

| Feature Module | Priority | Architectural Preparation in V1 |
| :--- | :--- | :--- |
| **Full Inventory Management** | Phase 3 | Catalog schema includes `trackInventory`, `stockQuantity`, `reorderLevel`. |
| **E-Way Bill Generation** | Phase 4 | Invoice schema includes transport details snapshot (`transporterId`, `vehicleNumber`). |
| **Credit & Debit Notes** | Phase 3 | Invoicing schema supports document type extensions (`CREDIT_NOTE`, `DEBIT_NOTE`). |
| **Quotations & Estimates** | Phase 3 | Quotation lifecycle status (`DRAFT`, `SENT`, `CONVERTED_TO_INVOICE`). |
| **E-Invoice IRP Direct Sync** | Phase 3 | Isolated `einvoices` collection and IRP payload validation schemas. |
| **Payment Gateway Checkout**| Phase 4 | Invoice payment links and UPI QR code payload fields. |
| **WhatsApp / Email Delivery**| Phase 3 | Cloudinary PDF persistence and message template interfaces. |

---

## 2. Architectural Commitment

All V1 schemas and service contracts are designed so that introducing these future modules will NOT require refactoring core invoice tables or rewriting the Centralized GST Engine.

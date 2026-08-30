# 34 — Definition of Done (DoD)

- **Status:** Approved Quality Assurance Contract
- **Owner:** Core Engineering & QA
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies mandatory completion criteria for every development phase, feature module, and pull request.

---

## 1. Feature Completion Checklist

Every feature module (e.g. Customer Master, Invoice Engine, Payment Ledger) must satisfy all of the following criteria before being marked COMPLETE:

- [ ] **UI & Layout:** Responsive, keyboard-accessible, clean typography following `docs/33-design-system.md`.
- [ ] **Loading & Empty States:** Explicit skeleton loading indicators and clear empty-state illustrations with call-to-action buttons.
- [ ] **Error Handling:** Client-side Zod validation feedback and server-side exception boundary handling.
- [ ] **Server Authorization:** Strict `businessId` multi-tenant data isolation verified from server session context.
- [ ] **Database Integrity:** Schema constraints, compound indexes, and snapshot rules enforced.
- [ ] **Money Precision:** Monetary computations free of floating-point drift.
- [ ] **Unit & Integration Tests:** Vitest unit tests written for underlying domain logic, tax math, and status transitions.
- [ ] **Audit Logging:** Emits immutable `AuditLog` events for financial state changes or business setup modifications.
- [ ] **No Dead UI:** All visible buttons and links are either fully functional or explicitly disabled with a future release badge.
- [ ] **Documentation Updated:** Architectural changes or schema modifications updated in `docs/` beforehand.

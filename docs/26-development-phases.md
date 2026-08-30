# 26 — Development Roadmap & Phase Execution Plan

- **Status:** Approved Architecture Specification
- **Owner:** Core Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Outlines updated 20-phase execution roadmap from initial foundation through production deployment.

---

## Complete Phase Roadmap

### Completed Foundations
- **Phase 0 — Project Foundation & Governance:** Initial README, AGENTS.md, ARCHITECTURE.md, skills, and docs baseline.
- **Phase 1 — Complete Architecture Specification:** Domain map, data flow, GST engine specs, payment model.
- **Phase 2 — Database & Domain Contract:** 19 entity schemas, index plan, domain events, three layers of truth.
- **Phase 3 — Coding Rules & Agent Skills:** 15 mandatory AI coding rules, MDC cursor rule files.
- **Phase 3.5 — Final Architecture Audit & Corrections:** Fixed invoice numbering (`DocumentSequence`), versioned `TaxRate`, HSN/SAC master, Cess math, round-off, structured additional charges, supply classifications, `PaymentAllocation`, expanded `EInvoice` schema, 30-day reporting restriction, business rules (`docs/31`), UI/UX principles (`docs/32`), design system (`docs/33`), definition of done (`docs/34`), and continuous testing plan.

---

### Implementation Phases (Starting Next)
- **PHASE 4 — Project Bootstrap:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui, pnpm configuration.
- **Phase 5 — Database Foundation Audit & Recovery:** Completed & Audited (17 collections + 3 embedded value objects, integer paise money precision, multi-tenant isolation integration tests).
- **Phase 6 — Authentication & Business Onboarding:** Completed (1 User = 1 Business mapping, Better Auth session engine, progressive registration, route protection middleware, server-side context resolution, live business profile settings).
- **Phase 6.5 — Visual Design Refinement:** Completed (Quiet ERP/accounting design language, Inter font, tabular numbers, zero decorative glowing gradients).
- **Phase 9 — Products & Services Master & Live MongoDB Implementation:** Completed (Live MongoDB Product catalog, Service catalog, Category master, Global Unit master, HSN/SAC lookups, SKU uppercase normalization, E11000 duplicate handling, category compatibility, unit server resolution, soft deactivation, zero mock data).
- **Phase 10 — GST Calculation Engine:** Completed (Pure deterministic math engine `src/engine/gst/`, zero DB dependencies in calculator, versioned TaxRate effective-date DB resolver, Place of Supply & UTGST resolver, Cess engine, RCM liability tagging, safe integer defenses, and 79 passing Vitest tests).
- **Phase 11 — Invoice Calculation & Aggregation Engine:** Completed (Pure math engine `src/engine/invoice/`, largest-remainder discount allocation, discount tax treatments `REDUCE_TAXABLE_VALUE` vs `COMMERCIAL_ONLY`, additional charge tax delegation to Phase 10 engine, compound key `GstRateSummary` aggregator, auto round-off policy, and 95 passing Vitest tests).
- **Phase 12 — Invoice UI & Lifecycle:** Completed (Live MongoDB `InvoiceService`, atomic sequence generator, server-side financialYear resolver, Rule 46 max 16-char serial validation, complete statutory snapshot locking, error-rollback `VALIDATING` -> `DRAFT`, cancellation audit logging, real-time Phase 11 calculation UI preview, expandable drawers, A4 printable view, and 100 passing Vitest tests).
- **PHASE 13 — Payments & Outstanding:** Payment transaction ledger, `PaymentAllocation` engine, derived balances.
- **PHASE 14 — Receipts:** Payment receipt document generation.
- **PHASE 15 — Reports & GST Reports:** Sales register, collection ledger, receivables aging, GSTR-1 preparation helper.
- **PHASE 16 — PDF & Template Engine:** Modular invoice printable rendering and PDF export.
- **PHASE 17 — PWA:** Web App manifest, service worker shell caching, standalone app mode.
- **PHASE 18 — E-Invoice Module:** E-Invoice payload generator, IRN state machine, QR code snapshotting.
- **PHASE 19 — Full Testing & Security:** End-to-end Playwright tests, penetration testing, multi-tenant security audit.
- **PHASE 20 — Production Deployment:** Vercel deployment, MongoDB Atlas cluster configuration, Cloudinary production setup.

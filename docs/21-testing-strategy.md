# 21 — Testing Strategy & Continuous Test Plan

- **Status:** Approved Architecture Specification
- **Owner:** Quality Assurance & Testing Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies continuous testing practices per development phase, Vitest unit testing, Playwright E2E automation, and final security audit workflows.

---

## 1. Continuous Testing Philosophy

Testing is NOT deferred to a late release phase. Every development phase MUST implement unit and integration tests alongside feature code:

```
Phase 4: Bootstrap ──► Build Setup & Config Tests
Phase 5: Database Foundation ──► Schema & Index Tests
Phase 6: Auth & Onboarding ──► Session & Tenant Isolation Tests
Phase 7-9: Catalog & Customers ──► Validation & Master Data Tests
Phase 10: GST Engine ──► Pure Math & Edge-Case Unit Tests
Phase 11-14: Invoices & Payments ──► Snapshot & Balance Ledger Tests
Phase 19: Full Regression ──► Security, E2E Automation & Load Tests
```

---

## 2. Mandatory Financial Test Matrix

1. **Intra-State GST & Cess Math:** Verify exact split of CGST, SGST, and Cess for tax-exclusive and tax-inclusive items.
2. **Inter-State GST Math:** Verify 100% IGST allocation for cross-state customer billing.
3. **Line & Invoice Level Discounts:** Verify discount application order and taxable base value calculations.
4. **Additional Charges & Round-Off:** Verify packing/freight charge taxation and nearest rupee rounding.
5. **Partial & Multiple Payment Allocations:** Verify allocation of single payments across multiple invoices.
6. **Snapshot Immutability Assertions:** Verify that customer or product master updates do not mutate past issued invoice snapshots.
7. **Data Isolation Assertions:** Assert that authenticated User A cannot read or mutate records belonging to User B.

# Contributing Guidelines — Billing Software SaaS

Thank you for contributing to Billing Software SaaS. To maintain architectural integrity, safety, and accounting precision, please adhere strictly to the following guidelines.

---

## 1. Architectural Principles

1. **Single User / Single Business Rule:**
   - Do not add workspace/team switching or role-based multi-tenancy code.
   - All business entities must include a indexed `businessId` field.

2. **Server-Side Authorization:**
   - Never trust client-supplied `businessId` values. Derive `businessId` from the active session on the server.

3. **Financial Precision:**
   - Never use JavaScript floating-point calculations for monetary values. Ensure tax and total calculations use exact decimal rounding or integer paisa representations.

4. **Historical Invoice Immutability:**
   - Never write code that mutates item descriptions, prices, tax rates, or customer addresses on issued invoices when master data changes.

---

## 2. Development & Workflow Rules

- **Package Manager:** Use `pnpm` exclusively.
- **Code Style:** Strict TypeScript mode enabled. Follow Next.js 16 Server Component best practices.
- **UI Components:** Use Tailwind CSS and shadcn/ui components. Keep business logic outside UI components.
- **Testing:** Include unit tests for tax calculation, invoice pricing, and payment state logic using Vitest.

---

## 3. Pull Request Process

1. Check that changes comply with [`AGENTS.md`](file:///d:/Subash/project/billing-software/AGENTS.md) and [`ARCHITECTURE.md`](file:///d:/Subash/project/billing-software/ARCHITECTURE.md).
2. Ensure unit and integration tests pass cleanly.
3. Update relevant specifications in `docs/` if architectural contracts or schemas were altered.

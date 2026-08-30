# 33 — Design System Specification

- **Status:** Approved Design System Contract
- **Owner:** Frontend & Design System Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies design tokens, typography, color palette, component primitives, responsive table rules, and print styles.

---

## 1. Color Palette & Dark/Light Design Tokens

Built using Tailwind CSS CSS variables and shadcn/ui design tokens:
- **Primary:** Deep Slate / Navy Blue (`hsl(222.2, 47.4%, 11.2%)`) for crisp accounting structure.
- **Accent:** Emerald Green (`hsl(142.1, 76.2%, 36.3%)`) for positive financial balances, paid badges, and collection actions.
- **Warning:** Amber (`hsl(37.7, 92.1%, 50.2%)`) for partial payments, draft states, and pending GST validations.
- **Destructive / Error:** Crimson Red (`hsl(346.8, 77.2%, 49.8%)`) for overdue balances, cancelled status, and destructive dialogs.
- **Background:** High-contrast neutral slate (`#f8fafc` in light mode, `#090d16` in dark mode).

---

## 2. Component Primitive Specifications

| Primitive | Usage Standard | Key Attributes |
| :--- | :--- | :--- |
| **Buttons** | `Primary` for main actions, `Secondary` for secondary filters, `Ghost` for row actions, `Destructive` for cancellation. | Explicit focus rings, loading spinner states, disabled badges. |
| **Inputs** | Text, Numeric, Select, DatePicker. | Numeric fields right-aligned; currency symbol prefix (`₹`). |
| **Tables** | Built with TanStack Table. | High contrast borders, sticky headers, right-aligned monetary values, responsive pagination. |
| **Badges** | Status indicators (`DRAFT`, `ISSUED`, `PAID`, `PARTIALLY_PAID`, `CANCELLED`). | Distinct semantic color fills with bold text labels. |
| **Alerts** | Contextual notifications & GST warnings. | Standard alert icons, accessible screen-reader titles. |
| **Print CSS** | Printable layout stylesheet (`@media print`). | Hides navigation sidebars, headers, action buttons; forces pure white background and 100% table width. |

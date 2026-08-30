# 00 — Project Overview

- **Status:** Approved Architecture Specification
- **Owner:** Project Maintainers
- **Last Updated:** 2026-08-26
- **Purpose:** Defines high-level project vision, primary workflow, product philosophy, and non-negotiable operational boundaries for Billing Software SaaS.

---

## 1. Executive Summary

Billing Software SaaS is a production-oriented billing, invoicing, Indian GST compliance, payment tracking, and business management web application. Built for small and medium Indian businesses, sole proprietorships, traders, and service providers, it offers simple, professional accounting workflows without forcing users to master complex double-entry accounting software.

---

## 2. Core Value Proposition & Principles

1. **Invoice-Centric Simplicity:** Direct, intuitive paths from customer/product creation to issuing GST invoices and recording payments.
2. **Indian GST Native:** Built-in intra-state (CGST/SGST) and inter-state (IGST) tax calculation engine, HSN/SAC master support, and tax summary breakdowns.
3. **Single User = Single Business:** Eliminates multi-tenant workspace clutter. Every user manages their dedicated business profile.
4. **Deterministic Accounting Math:** Complete elimination of JavaScript floating-point errors across invoice totals and tax liabilities.
5. **Installable PWA Experience:** Native desktop/mobile app feel via Progressive Web App standards.

---

## 3. Primary Business Workflow

```
User Registration
  ↓
Create Business Account
  ↓
Business Setup (Name, Logo, Phone, Address)
  ↓
GST Setup (GSTIN, State, State Code)
  ↓
Invoice & Bank Configuration (Bank details, Signature, Terms)
  ↓
Add Customer Master / Add Product & Service Catalog
  ↓
Create Invoice (Select Bill To, Ship To, Items, Apply Discounts & Taxes)
  ↓
Tax Calculation (CGST / SGST / IGST calculation)
  ↓
Issue Invoice (Draft → Issued)
  ↓
Record Payment (Partial / Full Settlement)
  ↓
Calculate Outstanding Balance & Generate Payment Receipt
  ↓
Customer Ledger Statement & Business Reports
```

---

## 4. Architectural Boundaries & Non-Goals for V1

- **No Multi-Workspace / Team Collaboration:** No user role switching, sub-accounts, or organizational memberships in V1.
- **No Complex Double-Entry Ledger:** Focus on billing, invoices, receipts, and receivables.
- **No Full Warehouse Inventory Management:** Catalog supports product items with future extensibility hooks for inventory.
- **No Offline Financial Write Capabilities:** Read caching and app shell PWA support only; financial writes require active internet connections.

---

## 5. Summary of Key Product Decisions

- **Framework:** Next.js 16 (App Router, Server Components & Route Handlers).
- **Authentication:** Better Auth.
- **Database:** MongoDB Atlas + Mongoose.
- **Storage:** Cloudinary.
- **UI & Styling:** Tailwind CSS + shadcn/ui.
- **Validation:** Zod + React Hook Form.

---

## 6. Open Decisions & TBD Items

- **CA Confirmation on Round-Off Standards:** Whether round-off to nearest rupee should be optional per business setting. `[TBD - Requires CA Confirmation]`

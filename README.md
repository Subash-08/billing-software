# Billing Software SaaS

A modern, production-oriented Indian billing, invoicing, GST, payment, and business management application built with Next.js, React, TypeScript, MongoDB Atlas, Mongoose, Better Auth, Tailwind CSS, and Cloudinary.

> **Status:** Phase 0 & Phase 1 — Project Foundation, Documentation & Complete Architecture Specification Completed.  
> **Note:** Feature implementation has not started. This repository currently houses architectural contracts, agent guidance rules, skills, and detailed domain specifications.

---

## Technical Stack Overview

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Components & Route Handlers) |
| **Language** | TypeScript (Strict mode) |
| **Database** | MongoDB Atlas with Mongoose ORM |
| **Authentication** | Better Auth (Single business per user) |
| **File Storage** | Cloudinary (Logos, signatures, attachments, PDFs) |
| **Styling & UI** | Tailwind CSS, shadcn/ui |
| **Forms & Validation** | React Hook Form + Zod |
| **Tables & Charts** | TanStack Table, Recharts |
| **PWA** | Installable PWA with Service Worker (Standalone mode) |
| **Testing** | Vitest (Unit/Integration), Playwright (E2E) |
| **Package Manager** | pnpm |

---

## Primary Business Workflow

```
User Registration
  ↓
Create Business Profile & GST Setup
  ↓
Invoice Branding & Bank Configuration
  ↓
Add Customer Master / Add Product & Service Catalog
  ↓
Create GST / Non-GST / Cash Invoice (Bill To & Ship To Snapshots)
  ↓
Tax & Total Calculation (CGST/SGST/IGST Engine)
  ↓
Issue Invoice (Status: Draft → Issued)
  ↓
Record Payment (Partial / Full Settlement)
  ↓
Derive Customer Outstanding & Issue Receipt
  ↓
Generate Reports & Audits
```

---

## Product Principles & Rules

1. **Single User = Single Business:** One user account owns exactly one business profile. No workspace/team/org switching.
2. **Strict Data Isolation:** All domain records carry a mandatory `businessId` foreign identifier evaluated at server route handlers/services.
3. **Deterministic Financial Calculations:** Money calculations avoid floating-point operations. Decimal precision is maintained across all tax/payment engines.
4. **Historical Immutability:** Issued invoices snapshot customer, business, tax, and item details. Master record edits never mutate historical invoices.
5. **No AI-Invented Business Logic:** Legal, GST, and financial rules are strict and governed by architecture docs.

---

## Repository Structure

```
billing-software/
├── .cursor/
│   └── rules/                  # MDC cursor rule definitions for coding agents
├── docs/                        # Complete 27 architecture & domain specification modules
│   ├── 00-project-overview.md
│   ├── 01-product-requirements.md
│   ├── ...
│   └── 26-development-phases.md
├── skills/                      # AI Agent guidance skills by domain
│   ├── architecture/
│   ├── database/
│   ├── gst/
│   ├── invoicing/
│   └── ...
├── AGENTS.md                    # Core cross-agent behavioral rules
├── ARCHITECTURE.md              # High-level architecture summary & data maps
├── CHANGELOG.md                 # Version and architecture change tracking
├── CONTRIBUTING.md              # Engineering guidelines & workflow rules
├── SECURITY.md                  # Security policies and isolation guarantees
└── .env.example                 # Template environment configuration
```

---

## Getting Started & Documentation

Please consult the comprehensive specification files in [`docs/`](file:///d:/Subash/project/billing-software/docs/) for complete domain models, MongoDB collection indexes, GST calculation formulas, and security protocols.

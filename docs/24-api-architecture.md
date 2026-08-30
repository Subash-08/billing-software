# 24 — API Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Core Engineering
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies Route Handlers, endpoints map, authentication boundaries, and payload structures.

---

## 1. Future API Endpoints Overview

| Endpoint Path | Method | Auth Required | Business Isolated | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/*` | POST/GET | Handled by Auth | N/A | Login, Registration, Logout |
| `/api/business/profile` | GET/PATCH | Yes | Yes | Fetch/update business profile & settings |
| `/api/customers` | GET/POST | Yes | Yes | List customers / Create customer master |
| `/api/customers/[id]` | GET/PATCH | Yes | Yes | Customer detail & update |
| `/api/products` | GET/POST | Yes | Yes | Product & Service catalog management |
| `/api/invoices` | GET/POST | Yes | Yes | List invoices / Create new draft invoice |
| `/api/invoices/[id]` | GET/PATCH | Yes | Yes | Invoice detail / Issue / Cancel invoice |
| `/api/invoices/[id]/pdf` | GET | Yes | Yes | Render printable PDF layout |
| `/api/payments` | GET/POST | Yes | Yes | List payments / Record payment settlement |
| `/api/reports/sales` | GET | Yes | Yes | Generate Sales & Tax summary report |
| `/api/files/signature` | POST | Yes | Yes | Generate signed Cloudinary upload signature |

---

## 2. Request Scoping Protocol

Every protected API handler executes:
1. Verify user session via Better Auth.
2. Resolve user's single `businessId`.
3. Validate request query or body payload via Zod.
4. Pass request to domain service with verified `businessId`.

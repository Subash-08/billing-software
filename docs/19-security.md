# 19 — Security Architecture

- **Status:** Approved Architecture Specification
- **Owner:** Cybersecurity & Compliance Team
- **Last Updated:** 2026-08-26
- **Purpose:** Specifies data security guarantees, session authorization, IDOR protection, CSRF/XSS mitigations, and rate limiting.

---

## 1. IDOR Defense & Multi-Tenant Data Isolation

- **Insecure Direct Object Reference (IDOR) Protection:** Every Mongoose update, read, or delete query MUST explicitly enforce `businessId` in the `where` predicate.
- **Example Security Scenarios:**
  - Request: `GET /api/invoices/inv_123`
  - Vulnerable Code: `Invoice.findById("inv_123")` -> BAD (Allows cross-business access).
  - Secure Code: `Invoice.findOne({ _id: "inv_123", businessId: session.businessId })` -> SECURE.

---

## 2. Web Security Mitigations

1. **CSRF Protection:** Better Auth uses HTTP-only SameSite cookies and CSRF double-submit token verification.
2. **XSS Defense:** Next.js React JSX auto-escapes rendered strings. HTML input in invoice notes is sanitized via Zod.
3. **Injection Prevention:** Mongoose parameterized query builders eliminate NoSQL injection risks.
4. **Secret Management:** Secrets (`CLOUDINARY_API_SECRET`, `BETTER_AUTH_SECRET`, `MONGODB_URI`) are strictly maintained on the server process.

---

## 3. Upload & File Security

- Binary uploads require server-signed presignatures.
- Uploaded files are restricted by MIME type (`image/png`, `image/jpeg`, `application/pdf`) and file size boundaries.

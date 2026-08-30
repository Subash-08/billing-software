# Security Policy — Billing Software SaaS

## Security Principles

Billing Software SaaS manages financial records, GST invoices, customer data, and business ledgers for small and medium businesses in India. Security, data integrity, and strict business data isolation are core engineering requirements.

---

## Data Isolation & Multi-Tenancy Security

1. **Business Boundaries:**
   - Every business record is isolated by `businessId`.
   - All server queries and actions must automatically include the verified session's `businessId`.
   - IDOR (Insecure Direct Object Reference) vulnerabilities are prevented by validating ownership on every database request.

2. **Authentication & Session Safety:**
   - Powered by Better Auth with secure HTTP-only cookies and CSRF token protection.
   - Sessions carry explicit expiration limits and automatic token renewal logic.

3. **File Storage & Asset Security:**
   - Uploads to Cloudinary use server-generated signed upload signatures.
   - Direct unauthenticated public upload endpoints are forbidden.

4. **Audit Logging:**
   - Sensitive business settings changes, GST configuration edits, and invoice state transitions emit immutable audit logs containing user ID, timestamp, action type, and IP address.

---

## Reporting Vulnerabilities

If you discover a potential security vulnerability within this project, please report it immediately to the security maintainers rather than opening a public issue.

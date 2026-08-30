---
name: security-enforcement
description: Data isolation, session verification, IDOR prevention, signed upload signatures, and audit logging.
---

# Security Enforcement Skill

## Purpose
Enforces data security, session authorization, and protection against IDOR, CSRF, XSS, and unauthorized file access.

## Key Rules
- Derive `businessId` from server session context on every request.
- Require server-signed parameters for Cloudinary uploads.
- Audit log all critical status changes (invoice issued, cancelled, payment recorded, GST setup modified).

## Forbidden Practices
- NEVER query database using client-supplied business identifiers.

---
name: architecture-guidance
description: Architecture principles, layered design, and domain boundaries for Billing Software SaaS.
---

# Architecture Guidance Skill

## Purpose
Provides structural rules for maintaining layered architecture across Next.js 16 App Router, domain services, GST engine, and MongoDB database layers.

## When to Use
Use when creating new modules, adding service layers, structuring folder boundaries, or defining domain contracts.

## Architectural Rules
- UI Components must not execute direct MongoDB database queries or perform complex financial formulas.
- Services reside in `src/services/` and expose pure typed async interfaces.
- `businessId` is derived strictly from server authentication session context.

## Forbidden Practices
- NEVER create multi-workspace or multi-tenant switching mechanisms (Product rule: 1 User = 1 Business).
- NEVER trust `businessId` sent in request bodies or query parameters.

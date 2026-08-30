---
name: testing-strategy
description: Vitest unit testing for GST and money calculations, Playwright E2E flows, and multi-tenant security assertions.
---

# Testing Strategy Skill

## Purpose
Establishes testing patterns for deterministic financial math, tax logic, tenant isolation, and invoice workflows.

## Required Test Coverage
- Unit tests (Vitest) for GST calculation engine (intra/inter, inclusive/exclusive, exempt).
- Unit tests for invoice status transitions and payment balance math.
- Integration tests asserting multi-tenant data isolation.
- End-to-end tests (Playwright) for primary user workflow (Setup → Invoice → Payment → Receipt).

---
name: customer-management
description: Customer master records, GSTIN validation format, addresses, and state code mappings.
---

# Customer Management Skill

## Purpose
Manages customer master data, billing/shipping addresses, state code associations, and GSTIN formatting.

## Key Rules
- Customer master stores: Name, Phone, Email, Billing Address, Shipping Address, State, State Code, GSTIN, Tax Treatment.
- Modifying customer master records DOES NOT update past issued invoices.

## Forbidden Practices
- NEVER delete customers with active linked invoices (enforce soft archive status).

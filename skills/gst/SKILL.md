---
name: gst-calculation-engine
description: Indian GST tax rules, UTGST, Tax Treatments, Cess, and HSN/SAC master versioning.
---

# GST Engine Skill

## Purpose
Enforces centralized Indian GST calculation rules, tax treatments (`TAXABLE`, `NIL_RATED`, `EXEMPT`, `NON_GST`, `ZERO_RATED`), state/UT code branching (CGST, SGST, UTGST, IGST, CESS), and versioned tax rate resolution.

## Architectural Rules
- Tax calculations must execute strictly inside `src/engine/gst/`.
- Decision Pipeline: Transaction → Tax Applicability → Tax Treatment → Tax Rule → Tax Rate → Tax Components → Calculation Trace.
- Intra-State: CGST (50%) + SGST (50%).
- Intra-UT (Union Territory): CGST (50%) + UTGST (50%).
- Inter-State / Inter-UT: IGST (100%).
- Cess: Calculated on taxable base if applicable.
- Supports Tax Exclusive (`Base * Rate`) and Tax Inclusive (`Total / (1 + Rate)`).

## Forbidden Practices
- NEVER hardcode GST rates (`[0, 5, 12, 18, 28]`) inside UI components or forms.
- NEVER invent unconfirmed legal tax rules without marking them as `TBD - Requires CA Confirmation`.

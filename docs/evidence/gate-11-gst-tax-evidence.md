# Gate 11 Evidence Artifact — GST & Tax Compliance Engine Audit

> **Application:** Billing Software SaaS  
> **Verification Gate:** Gate 11 — GST & Tax Compliance Engine Audit  
> **Date:** 2026-08-27  
> **Verdict:** **PASS**

---

## 1. Executive Summary

This audit evaluates the Centralized GST Calculation Engine ([`src/engine/gst/`](file:///d:/Subash/project/billing-software/src/engine/gst/)) against official Indian GST Act 2017 specifications.

Calculations are performed strictly using integer paise math with explicit jurisdiction resolution:
- **Intrastate (State $\to$ State)**: CGST + SGST
- **Interstate (State A $\to$ State B)**: IGST
- **UT Intrastate without Legislature (e.g. Chandigarh, Andaman)**: CGST + UTGST
- **UT Intrastate with Legislature (e.g. Puducherry, Delhi, J&K)**: CGST + SGST
- **Exempt / Nil-Rated / Zero-Rated**: Total Tax = 0

---

## 2. Test Execution Matrix

| Scenario Name | Supplier State Code | POS State Code | Taxable Amount (Paise) | CGST (Paise) | SGST (Paise) | UTGST (Paise) | IGST (Paise) | Result |
|---|---|---|---|---|---|---|---|---|
| **Intrastate Supply (TN $\to$ TN, 18%)** | `33` (Tamil Nadu) | `33` (Tamil Nadu) | 1,000,000 (₹10,000) | 90,000 (₹900) | 90,000 (₹900) | 0 | 0 | ✅ PASS |
| **Interstate Supply (TN $\to$ KA, 18%)** | `33` (Tamil Nadu) | `29` (Karnataka) | 1,000,000 (₹10,000) | 0 | 0 | 0 | 180,000 (₹1,800) | ✅ PASS |
| **UT Supply without Legislature (04 $\to$ 04)** | `04` (Chandigarh) | `04` (Chandigarh) | 1,000,000 (₹10,000) | 90,000 (₹900) | 0 | 90,000 (₹900) | 0 | ✅ PASS |
| **Exempt Supply (0 Tax)** | `33` (Tamil Nadu) | `33` (Tamil Nadu) | 500,000 (₹5,000) | 0 | 0 | 0 | 0 | ✅ PASS |

---

## 3. Legal & Statutory Integrity Audit

1. **State & Territory Code Master**: 38 official state/UT codes + overseas/export codes (`96`, `97`, `99`) accurately classified in [`src/engine/gst/gst.constants.ts`](file:///d:/Subash/project/billing-software/src/engine/gst/gst.constants.ts).
2. **Versioned Tax Rates**: Tax rates resolved dynamically from effective-dated `TaxRateModel` master records rather than hardcoded rate lists.
3. **Paise Precision Conservation**: Line taxes sum exactly to total invoice tax without floating-point error.

---

## 4. Execution Verdict

- **Gate 11 Verdict**: **PASS** (`passVerdict: true`)
- **Next Gate Unlocked**: **Gate 12 — Authentication & Authorization Security Audit**.

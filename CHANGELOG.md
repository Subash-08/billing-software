# Changelog

All notable changes to the Billing Software SaaS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0-alpha] - 2026-08-26

### Added / Audited
- **Phase 3.6 — GST Compliance & Domain Gap Audit:**
  - Specified explicit Tax Treatments (`TAXABLE`, `NIL_RATED`, `EXEMPT`, `NON_GST`, `ZERO_RATED`).
  - Added `UTGST` (Union Territory GST) to tax component breakdown (`TaxBreakdown: { cgst, sgst, utgst, igst, cess, totalTax }`).
  - Specified versioned `TaxRateMaster` (`rate`, `cgstRate`, `sgstRate`, `utgstRate`, `igstRate`, `cessRate`, `cessType`, `applicableTo`, `conditions`, `effectiveFrom`, `effectiveTo`, `sourceNotification`, `version`, `status`) to handle rates like the 40% GST rate added in Sept 2025 without hardcoding.
  - Specified Tax Decision Pipeline: Transaction $\to$ Tax Applicability $\to$ Tax Treatment $\to$ Applicable Tax Rule $\to$ Tax Rate $\to$ Components $\to$ Calculation Trace.
  - Specified GST Registration Profiles (`REGULAR`, `COMPOSITION`, `UNREGISTERED`, `SEZ`, `OTHER`) and GSTIN Validation Status (`NOT_VALIDATED`, `VALID`, `INVALID`, `SUSPENDED`, `CANCELLED`, `UNKNOWN`) with name-mismatch UI badges.
  - Specified Four Address Entities Snapshots (Bill From, Dispatch From, Bill To, Ship To).
  - Specified Document Types distinction (`TAX_INVOICE`, `BILL_OF_SUPPLY`, `CREDIT_NOTE`, `DEBIT_NOTE`, `QUOTATION`, `DELIVERY_CHALLAN`).
  - Specified Foreign Currency fields (`currency`, `baseCurrency`, `exchangeRate`) and Item Quantities (`quantity`, `freeQuantity`, `unit`, `uqc`).
  - Specified IRP Adapter Pattern (`Invoice` $\to$ `EInvoice Service` $\to$ `Payload Builder` $\to$ `IRP Adapter` $\to$ `IRP Provider`).
  - Expanded Vitest test matrix to a **50-Scenario GST Test Suite**.
  - Created [`docs/35-gst-compliance-specification.md`](file:///d:/Subash/project/billing-software/docs/35-gst-compliance-specification.md) as the master GST domain specification.
  - Updated [`ARCHITECTURE.md`](file:///d:/Subash/project/billing-software/ARCHITECTURE.md) to v4.0.0.

## [0.4.0-alpha] - 2026-08-26
- Phase 3.5 architecture correction baseline.

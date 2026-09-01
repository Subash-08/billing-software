/**
 * Supply Type Deriver
 * src/engine/gst/supply-type.deriver.ts
 *
 * Derives the supply type (B2B / B2C / SEZ / EXPORT) from customer GST treatment
 * and the relationship between business state and place of supply.
 *
 * CRITICAL RULE:
 *   GSTIN status must be evaluated BEFORE state comparison.
 *   A registered customer in another state is still B2B — NOT B2C.
 *
 *   Wrong:
 *     different state → B2C
 *
 *   Correct:
 *     GSTIN present → B2B (intra or inter, determined by POS)
 *     GSTIN absent  → B2C (intra or inter, determined by POS)
 *
 * POS determines CGST+SGST vs IGST — this is separate from B2B/B2C classification.
 *
 * Examples:
 *   Seller TN + Customer TN with GSTIN  → B2B  + CGST+SGST (intra-state)
 *   Seller TN + Customer KA with GSTIN  → B2B  + IGST      (inter-state)
 *   Seller TN + Customer TN no GSTIN    → B2C  + CGST+SGST (intra-state)
 *   Seller TN + Customer KA no GSTIN    → B2C  + IGST      (inter-state)
 *   Customer gstTreatment = SEZ         → SEZ  + IGST or nil
 *   Customer gstTreatment = EXPORT      → EXPORT
 */

export type DerivedSupplyType =
  | 'B2B'
  | 'B2C'
  | 'SEZ_WITH_PAYMENT'
  | 'SEZ_WITHOUT_PAYMENT'
  | 'EXPORT_WITH_PAYMENT'
  | 'EXPORT_WITHOUT_PAYMENT'
  | 'DEEMED_EXPORT';

export interface SupplyTypeDeriverInput {
  /** Customer's GST treatment from master data */
  customerGstTreatment:
    | 'REGISTERED'
    | 'UNREGISTERED'
    | 'COMPOSITION'
    | 'SEZ'
    | 'EXPORT'
    | 'OVERSEAS'
    | 'OTHER'
    | 'REGULAR';
  /** Customer's GSTIN — determines B2B vs B2C for domestic customers */
  customerGstin?: string;
  /** Business (supplier) state code */
  supplierStateCode: string;
  /** Invoice-level place of supply state code (snapshot-owned) */
  placeOfSupplyStateCode: string;
}

export interface SupplyTypeDeriverResult {
  supplyType: DerivedSupplyType;
  isInterState: boolean;
  isGstinPresent: boolean;
  derivationReason: string;
}

/**
 * Determines if a GSTIN string is structurally present and non-trivial.
 * Does NOT validate GSTIN format here — that is HsnSacValidator's job.
 */
function hasGstin(gstin?: string): boolean {
  return Boolean(gstin && gstin.trim().length >= 15);
}

/**
 * Derives supply type from customer treatment and transaction context.
 * This is a pure function — no DB access, no side effects.
 *
 * @param input - Customer GST treatment, GSTIN, and state context
 * @returns Derived supply type + metadata for logging/UI display
 */
export function deriveSupplyType(input: SupplyTypeDeriverInput): SupplyTypeDeriverResult {
  const { customerGstTreatment, customerGstin, supplierStateCode, placeOfSupplyStateCode } = input;
  const isInterState = supplierStateCode !== placeOfSupplyStateCode;
  const isGstinPresent = hasGstin(customerGstin);

  // ── EXPORT ──────────────────────────────────────────────────────────────
  if (customerGstTreatment === 'EXPORT' || customerGstTreatment === 'OVERSEAS') {
    return {
      supplyType: 'EXPORT_WITHOUT_PAYMENT', // default: LUT/Bond; user can override to WITH_PAYMENT
      isInterState: true,
      isGstinPresent,
      derivationReason: 'Customer is an export/overseas party — export supply without IGST (LUT default)',
    };
  }

  // ── SEZ ─────────────────────────────────────────────────────────────────
  if (customerGstTreatment === 'SEZ') {
    return {
      supplyType: 'SEZ_WITHOUT_PAYMENT', // default: zero-rated; user can override to WITH_PAYMENT
      isInterState: true,
      isGstinPresent,
      derivationReason: 'Customer is an SEZ unit — supply to SEZ without IGST (default)',
    };
  }

  // ── DOMESTIC — GSTIN determines B2B vs B2C ────────────────────────────
  // CRITICAL: Check GSTIN FIRST, then state. A Karnataka GSTIN customer is B2B + inter-state IGST.
  if (
    customerGstTreatment === 'REGISTERED' ||
    customerGstTreatment === 'REGULAR' ||
    customerGstTreatment === 'COMPOSITION'
  ) {
    if (isGstinPresent) {
      return {
        supplyType: 'B2B',
        isInterState,
        isGstinPresent: true,
        derivationReason: isInterState
          ? 'B2B inter-state: customer has GSTIN, different POS → IGST applies'
          : 'B2B intra-state: customer has GSTIN, same POS → CGST+SGST applies',
      };
    }
    // Registered treatment declared but no GSTIN supplied — treat as unregistered
    return {
      supplyType: 'B2C',
      isInterState,
      isGstinPresent: false,
      derivationReason: 'Customer declared as registered but no GSTIN provided — treated as B2C',
    };
  }

  // ── UNREGISTERED / OTHER → B2C ─────────────────────────────────────────
  return {
    supplyType: 'B2C',
    isInterState,
    isGstinPresent: false,
    derivationReason: isInterState
      ? 'B2C inter-state: customer unregistered, different POS → IGST applies'
      : 'B2C intra-state: customer unregistered, same POS → CGST+SGST applies',
  };
}

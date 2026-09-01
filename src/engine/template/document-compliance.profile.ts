/**
 * Document Compliance Profile Definitions
 * src/engine/template/document-compliance.profile.ts
 *
 * Architecture Invariant:
 * Evaluates FieldPolicy for each template field based on document type and TransactionContext.
 *
 * 5 FieldPolicy Levels:
 *   REQUIRED        — Statutory mandatory: MUST be VISIBLE on invoice. User CANNOT toggle to HIDDEN.
 *   CONDITIONAL     — Evaluates dynamically via TransactionContext (e.g. IGST row if inter-state).
 *   OPTIONAL        — Freely configurable by user in template editor (VISIBLE or HIDDEN).
 *   NOT_APPLICABLE  — Irrelevant for this document type (e.g. HSN on Payment Receipt).
 *   FORBIDDEN       — Prohibited by statutory rules (e.g. Tax breakdown on Bill of Supply).
 *                     Must remain HIDDEN. User CANNOT toggle to VISIBLE.
 */

import { IInvoice } from '@/db/models/invoice.model';
import { TransactionContext } from '../policy/transaction.context';

export type FieldPolicyLevel = 'REQUIRED' | 'CONDITIONAL' | 'OPTIONAL' | 'NOT_APPLICABLE' | 'FORBIDDEN';

export interface DocumentComplianceProfile {
  documentType: IInvoice['documentType'];
  fieldPolicies: Record<string, FieldPolicyLevel>;
  // Evaluates CONDITIONAL fields dynamically against TransactionContext
  conditionalEvaluators?: Record<string, (ctx: TransactionContext) => boolean>;
}

export const TAX_INVOICE_PROFILE: DocumentComplianceProfile = {
  documentType: 'TAX_INVOICE',
  fieldPolicies: {
    // Statutory REQUIRED fields
    itemDescription: 'REQUIRED',
    itemHsnSac: 'REQUIRED',
    itemTaxableValue: 'REQUIRED',
    subtotalRow: 'REQUIRED',

    // CONDITIONAL fields (default AUTO in template; resolved by engine)
    customerGstin: 'CONDITIONAL',     // VISIBLE if B2B registered recipient
    placeOfSupply: 'CONDITIONAL',     // VISIBLE if inter-state supply
    reverseCharge: 'CONDITIONAL',     // VISIBLE if reverseCharge = true
    itemCgst: 'CONDITIONAL',          // VISIBLE if intra-state
    itemSgst: 'CONDITIONAL',          // VISIBLE if intra-state
    itemUtgst: 'CONDITIONAL',         // VISIBLE if UT supply
    itemIgst: 'CONDITIONAL',          // VISIBLE if inter-state
    itemCess: 'CONDITIONAL',          // VISIBLE if cess > 0
    cgstRow: 'CONDITIONAL',
    sgstRow: 'CONDITIONAL',
    utgstRow: 'CONDITIONAL',
    igstRow: 'CONDITIONAL',
    cessRow: 'CONDITIONAL',
    discountRow: 'CONDITIONAL',

    // OPTIONAL fields
    businessPan: 'OPTIONAL',
    businessCin: 'OPTIONAL',
    businessWebsite: 'OPTIONAL',
    customerPhone: 'OPTIONAL',
    customerEmail: 'OPTIONAL',
    shippingAddress: 'OPTIONAL',
    vehicleNumber: 'OPTIONAL',
    transportMode: 'OPTIONAL',
    eWayBillNumber: 'OPTIONAL',
    bankDetails: 'OPTIONAL',
    paymentQrCode: 'OPTIONAL',
    termsAndConditions: 'OPTIONAL',
    declaration: 'OPTIONAL',
    authorizedSignature: 'OPTIONAL',
    customerSignature: 'OPTIONAL',
    dueDate: 'OPTIONAL',
    referenceNumber: 'OPTIONAL',
    itemUqc: 'OPTIONAL',
    itemFreeQuantity: 'OPTIONAL',
    itemDiscount: 'OPTIONAL',
    itemGstRate: 'OPTIONAL',
    showPricingMode: 'OPTIONAL',
    otherChargesRow: 'OPTIONAL',
    roundOffRow: 'OPTIONAL',
    amountInWords: 'OPTIONAL',
    transportDetails: 'OPTIONAL',
    eInvoiceQr: 'OPTIONAL',
    irnNumber: 'OPTIONAL',
    ackNumber: 'OPTIONAL',
  },
  conditionalEvaluators: {
    customerGstin: (ctx) => ctx.recipientGstRegistrationStatus === 'REGISTERED',
    placeOfSupply: (ctx) => ctx.supplierStateCode !== ctx.placeOfSupplyStateCode,
    reverseCharge: (ctx) => ctx.reverseCharge,
    itemCgst: (ctx) => ctx.totalCgstPaise > 0,
    itemSgst: (ctx) => ctx.totalSgstPaise > 0,
    itemUtgst: (ctx) => ctx.totalUtgstPaise > 0,
    itemIgst: (ctx) => ctx.totalIgstPaise > 0,
    itemCess: (ctx) => ctx.totalCessPaise > 0,
    cgstRow: (ctx) => ctx.totalCgstPaise > 0,
    sgstRow: (ctx) => ctx.totalSgstPaise > 0,
    utgstRow: (ctx) => ctx.totalUtgstPaise > 0,
    igstRow: (ctx) => ctx.totalIgstPaise > 0,
    cessRow: (ctx) => ctx.totalCessPaise > 0,
    discountRow: (ctx) => true,
  },
};

export const BILL_OF_SUPPLY_PROFILE: DocumentComplianceProfile = {
  documentType: 'BILL_OF_SUPPLY',
  fieldPolicies: {
    itemDescription: 'REQUIRED',
    subtotalRow: 'REQUIRED',

    // FORBIDDEN on Bill of Supply: Tax rate & amount breakdown must not appear
    itemGstRate: 'FORBIDDEN',
    itemCgst: 'FORBIDDEN',
    itemSgst: 'FORBIDDEN',
    itemUtgst: 'FORBIDDEN',
    itemIgst: 'FORBIDDEN',
    itemCess: 'FORBIDDEN',
    cgstRow: 'FORBIDDEN',
    sgstRow: 'FORBIDDEN',
    utgstRow: 'FORBIDDEN',
    igstRow: 'FORBIDDEN',
    cessRow: 'FORBIDDEN',
    reverseCharge: 'FORBIDDEN',

    // OPTIONAL / CONDITIONAL
    customerGstin: 'CONDITIONAL',
    placeOfSupply: 'CONDITIONAL',
    itemHsnSac: 'OPTIONAL',
    itemTaxableValue: 'OPTIONAL',
  },
  conditionalEvaluators: {
    customerGstin: (ctx) => ctx.recipientGstRegistrationStatus === 'REGISTERED',
    placeOfSupply: (ctx) => ctx.supplierStateCode !== ctx.placeOfSupplyStateCode,
  },
};

export const CREDIT_NOTE_PROFILE: DocumentComplianceProfile = {
  documentType: 'CREDIT_NOTE',
  fieldPolicies: {
    itemDescription: 'REQUIRED',
    subtotalRow: 'REQUIRED',
    referenceNumber: 'REQUIRED', // Original invoice reference is required
    customerGstin: 'CONDITIONAL',
    placeOfSupply: 'CONDITIONAL',
    itemCgst: 'CONDITIONAL',
    itemSgst: 'CONDITIONAL',
    itemIgst: 'CONDITIONAL',
    cgstRow: 'CONDITIONAL',
    sgstRow: 'CONDITIONAL',
    igstRow: 'CONDITIONAL',
  },
  conditionalEvaluators: {
    customerGstin: (ctx) => ctx.recipientGstRegistrationStatus === 'REGISTERED',
    placeOfSupply: (ctx) => ctx.supplierStateCode !== ctx.placeOfSupplyStateCode,
    itemCgst: (ctx) => ctx.totalCgstPaise > 0,
    itemSgst: (ctx) => ctx.totalSgstPaise > 0,
    itemIgst: (ctx) => ctx.totalIgstPaise > 0,
    cgstRow: (ctx) => ctx.totalCgstPaise > 0,
    sgstRow: (ctx) => ctx.totalSgstPaise > 0,
    igstRow: (ctx) => ctx.totalIgstPaise > 0,
  },
};

export const DEBIT_NOTE_PROFILE: DocumentComplianceProfile = {
  ...CREDIT_NOTE_PROFILE,
  documentType: 'DEBIT_NOTE',
};

export const DELIVERY_CHALLAN_PROFILE: DocumentComplianceProfile = {
  documentType: 'DELIVERY_CHALLAN',
  fieldPolicies: {
    itemDescription: 'REQUIRED',
    itemUqc: 'REQUIRED',
    itemTaxableValue: 'NOT_APPLICABLE',
    itemGstRate: 'FORBIDDEN',
    itemCgst: 'FORBIDDEN',
    itemSgst: 'FORBIDDEN',
    itemIgst: 'FORBIDDEN',
    cgstRow: 'FORBIDDEN',
    sgstRow: 'FORBIDDEN',
    igstRow: 'FORBIDDEN',
    reverseCharge: 'FORBIDDEN',
  },
};

/**
 * Returns the compliance profile for a given document type.
 */
export function getDocumentComplianceProfile(docType: IInvoice['documentType']): DocumentComplianceProfile {
  switch (docType) {
    case 'BILL_OF_SUPPLY': return BILL_OF_SUPPLY_PROFILE;
    case 'CREDIT_NOTE': return CREDIT_NOTE_PROFILE;
    case 'DEBIT_NOTE': return DEBIT_NOTE_PROFILE;
    case 'DELIVERY_CHALLAN': return DELIVERY_CHALLAN_PROFILE;
    case 'TAX_INVOICE':
    default:
      return TAX_INVOICE_PROFILE;
  }
}

/**
 * Document Type Policy
 * src/engine/policy/document-type.policy.ts
 *
 * Defines the behavioural contract for every document type.
 *
 * Architecture Rule:
 *   The POLICY determines what a document type CAN and CANNOT do.
 *   The PDF template determines HOW it is displayed.
 *   These two concerns must never be reversed.
 *
 * Key invariant:
 *   A PROFORMA or QUOTATION must NEVER enter:
 *   - Receivables / AR ledger
 *   - GST invoice numbering series
 *   - Revenue / sales metrics
 *   - E-Invoice / IRP submission
 *   - Outstanding balance calculations
 */

export type BillingDocumentType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'QUOTATION'
  | 'PROFORMA'
  | 'SALES_ORDER'
  | 'DELIVERY_CHALLAN';

export interface DocumentTypePolicy {
  /**
   * Creates a legal supply obligation (e.g. invoice, credit note).
   * Quotation/Proforma/SO/DC are commercial communications, not legal supply documents.
   */
  isCommercialDocument: boolean;

  /**
   * Generates GST tax liability and must carry prescribed tax particulars (Rule 46).
   * Bill of Supply is NOT a tax document — it cannot carry GST rate/amount.
   */
  isTaxDocument: boolean;

  /**
   * Enters the accounts receivable ledger and creates a payment obligation.
   * Proforma, Quotation, SO, DC do NOT affect AR.
   */
  affectsReceivable: boolean;

  /**
   * Counted in revenue / sales totals and dashboard metrics.
   * Credit/Debit Notes do not add to revenue (they adjust it).
   */
  affectsRevenue: boolean;

  /**
   * Eligible for e-invoice submission to IRP (IRN generation).
   * Only issued Tax Invoices, Bill of Supply, Credit Notes, Debit Notes with GSTIN.
   */
  eligibleForEInvoice: boolean;

  /**
   * This document type needs its own document number series.
   * QUO-0001, SO-0001, DC-0001, etc.
   * Every document type uses document numbers — this is always true.
   */
  requiresDocumentNumber: boolean;

  /**
   * This document must use the formal tax invoice numbering series (INV/26-27/0001).
   * Only documents that generate GST liability use this series.
   * Proforma/Quotation/SO/DC have their own separate document number series.
   */
  requiresTaxInvoiceNumber: boolean;

  /**
   * Must carry all Rule 46 prescribed particulars on the PDF.
   * Only TAX_INVOICE; Bill of Supply has its own prescribed particulars.
   */
  isRule46TaxInvoice: boolean;

  /**
   * Can have payments recorded against it.
   */
  acceptsPaymentAllocation: boolean;
}

export const DOCUMENT_TYPE_POLICIES: Record<BillingDocumentType, DocumentTypePolicy> = {
  TAX_INVOICE: {
    isCommercialDocument: true,
    isTaxDocument: true,
    affectsReceivable: true,
    affectsRevenue: true,
    eligibleForEInvoice: true,
    requiresDocumentNumber: true,
    requiresTaxInvoiceNumber: true,
    isRule46TaxInvoice: true,
    acceptsPaymentAllocation: true,
  },
  BILL_OF_SUPPLY: {
    isCommercialDocument: true,
    isTaxDocument: false,
    affectsReceivable: true,
    affectsRevenue: true,
    eligibleForEInvoice: true,
    requiresDocumentNumber: true,
    requiresTaxInvoiceNumber: true,   // uses same issued series but bill of supply type
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: true,
  },
  CREDIT_NOTE: {
    isCommercialDocument: true,
    isTaxDocument: true,
    affectsReceivable: true,
    affectsRevenue: false,
    eligibleForEInvoice: true,
    requiresDocumentNumber: true,
    requiresTaxInvoiceNumber: true,   // CN/26-27/0001
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
  DEBIT_NOTE: {
    isCommercialDocument: true,
    isTaxDocument: true,
    affectsReceivable: true,
    affectsRevenue: false,
    eligibleForEInvoice: true,
    requiresDocumentNumber: true,
    requiresTaxInvoiceNumber: true,   // DN/26-27/0001
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
  QUOTATION: {
    isCommercialDocument: false,
    isTaxDocument: false,
    affectsReceivable: false,
    affectsRevenue: false,
    eligibleForEInvoice: false,
    requiresDocumentNumber: true,     // QUO/26-27/0001 — its own series
    requiresTaxInvoiceNumber: false,  // NOT the INV series
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
  PROFORMA: {
    isCommercialDocument: false,
    isTaxDocument: false,
    affectsReceivable: false,
    affectsRevenue: false,
    eligibleForEInvoice: false,
    requiresDocumentNumber: true,     // PRO/26-27/0001 — its own series
    requiresTaxInvoiceNumber: false,  // NOT the INV series; UI can say "Proforma Invoice"
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
  SALES_ORDER: {
    isCommercialDocument: false,
    isTaxDocument: false,
    affectsReceivable: false,
    affectsRevenue: false,
    eligibleForEInvoice: false,
    requiresDocumentNumber: true,     // SO/26-27/0001
    requiresTaxInvoiceNumber: false,
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
  DELIVERY_CHALLAN: {
    isCommercialDocument: false,
    isTaxDocument: false,
    affectsReceivable: false,
    affectsRevenue: false,
    eligibleForEInvoice: false,
    requiresDocumentNumber: true,     // DC/26-27/0001
    requiresTaxInvoiceNumber: false,
    isRule46TaxInvoice: false,
    acceptsPaymentAllocation: false,
  },
};

export function getDocumentTypePolicy(documentType: BillingDocumentType): DocumentTypePolicy {
  const policy = DOCUMENT_TYPE_POLICIES[documentType];
  if (!policy) {
    throw new Error(`Unknown document type: ${documentType}`);
  }
  return policy;
}

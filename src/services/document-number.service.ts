/**
 * Document Number Service
 * src/services/document-number.service.ts
 *
 * Generalized replacement for InvoiceNumberService.
 * Provides atomic, transactional sequential number reservation for every
 * document type in the billing system.
 *
 * Architecture Invariants:
 * 1. Numbers reserved ONLY at issuance/dispatch time — NEVER at draft creation.
 * 2. findOneAndUpdate + $inc inside MongoDB transaction = zero gap guarantee.
 * 3. Prefix per document type can be overridden per business settings.
 * 4. Financial year format is configurable per business (YY-YY or YYYY-YY).
 */

import { ClientSession, Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { DocumentSequenceModel } from '@/db/models/document-sequence.model';
import { BusinessModel } from '@/db/models/business.model';
import { InvoiceModel } from '@/db/models/invoice.model';
import { ConflictError, NotFoundError } from '@/lib/errors';

export type DocumentNumberType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'QUOTATION'
  | 'PROFORMA'
  | 'SALES_ORDER'
  | 'DELIVERY_CHALLAN'
  | 'RECEIPT';

/** Default prefix per document type — business settings may override */
export const DEFAULT_DOCUMENT_PREFIXES: Record<DocumentNumberType, string> = {
  TAX_INVOICE: 'INV',
  BILL_OF_SUPPLY: 'BSP',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
  QUOTATION: 'QUO',
  PROFORMA: 'PRO',
  SALES_ORDER: 'SO',
  DELIVERY_CHALLAN: 'DC',
  RECEIPT: 'REC',
};

export interface ReservedDocumentNumber {
  formattedNumber: string;
  sequenceNumber: number;
  prefix: string;
  financialYear: string;
  documentType: DocumentNumberType;
}

export class DocumentNumberService {
  /**
   * Returns the Indian Financial Year string for a given date.
   * FY starts April 1st.
   *
   * Examples:
   *   date = 2026-03-31, format = 'YY-YY'   → '25-26'
   *   date = 2026-04-01, format = 'YY-YY'   → '26-27'
   *   date = 2026-04-01, format = 'YYYY-YY'  → '2026-27'
   *   format = 'NONE'                         → '' (no FY in number)
   */
  public static getFinancialYear(
    date: Date = new Date(),
    format: 'YY-YY' | 'YYYY-YY' | 'NONE' = 'YY-YY'
  ): string {
    if (format === 'NONE') return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed; April = 3

    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;

    if (format === 'YYYY-YY') {
      return `${startYear}-${String(endYear).slice(-2)}`;
    }

    // Default 'YY-YY'
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  }

  /**
   * Atomically reserves the next document number for a given document type.
   * MUST be called inside an active MongoDB transaction session.
   *
   * @param businessId   - Business context (required for tenant isolation)
   * @param documentType - The type of document being numbered
   * @param documentDate - Used to determine financial year
   * @param session      - Active MongoDB ClientSession (transaction)
   * @param prefixOverride - Optional business-level prefix override
   */
  public async reserveNextNumber(
    businessId: string,
    documentType: DocumentNumberType,
    documentDate: Date,
    session: ClientSession,
    prefixOverride?: string
  ): Promise<ReservedDocumentNumber> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const business = await BusinessModel.findById(bId).session(session).lean().exec();
    if (!business) {
      throw new NotFoundError(`Business '${businessId}' not found.`);
    }

    // Resolve prefix: per-document business override → doc type default
    const prefix =
      prefixOverride ??
      business.invoiceSettings?.prefix ??
      DEFAULT_DOCUMENT_PREFIXES[documentType];

    const fyFormat = business.invoiceSettings?.financialYearFormat ?? 'YY-YY';
    const financialYear = DocumentNumberService.getFinancialYear(documentDate, fyFormat);

    let sequenceNumber = 1;
    let formattedNumber = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      // Atomic sequence reservation
      const sequence = await DocumentSequenceModel.findOneAndUpdate(
        { businessId: bId, documentType, prefix, financialYear },
        { $inc: { nextSeq: 1 } },
        {
          new: false, // return doc BEFORE update → value is the reserved number
          upsert: true,
          session,
        }
      ).exec();

      sequenceNumber = sequence ? sequence.nextSeq : 1;
      const paddedSeq = String(sequenceNumber).padStart(4, '0');
      formattedNumber = financialYear
        ? `${prefix}/${financialYear}/${paddedSeq}`
        : `${prefix}/${paddedSeq}`;

      // Check collision against existing invoices in database
      const collision = await InvoiceModel.exists({
        businessId: bId,
        invoiceNumber: formattedNumber,
      }).session(session);

      if (!collision) {
        isUnique = true;
      }
    }

    return { formattedNumber, sequenceNumber, prefix, financialYear, documentType };
  }

  /**
   * Generates next document number without an active session (for standalone creation).
   */
  public async generateDocumentNumber(
    businessId: string,
    documentType: DocumentNumberType,
    documentDate: Date = new Date()
  ): Promise<string> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const prefix = DEFAULT_DOCUMENT_PREFIXES[documentType];
    const financialYear = DocumentNumberService.getFinancialYear(documentDate, 'YY-YY');

    let sequenceNumber = 1;
    let formattedNumber = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      attempts++;
      const sequence = await DocumentSequenceModel.findOneAndUpdate(
        { businessId: bId, documentType, prefix, financialYear },
        { $inc: { nextSeq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      sequenceNumber = sequence ? sequence.nextSeq - 1 : 1;
      const paddedSeq = String(sequenceNumber).padStart(4, '0');
      formattedNumber = `${prefix}/${financialYear}/${paddedSeq}`;

      const collision = await InvoiceModel.exists({
        businessId: bId,
        invoiceNumber: formattedNumber,
      });

      if (!collision) {
        isUnique = true;
      }
    }

    return formattedNumber;
  }
}

export const documentNumberService = new DocumentNumberService();

/**
 * Invoice Number Service
 * src/services/invoice-number.service.ts
 *
 * Domain Service responsible strictly for atomic document sequential number reservation.
 *
 * Architecture Invariants:
 * 1. Numbers are reserved ONLY at issuance time (issueInvoice) — NEVER at draft creation.
 * 2. Sequence reservation uses DocumentSequenceModel.findOneAndUpdate with $inc inside
 *    a MongoDB transaction session. If the issuance transaction aborts, the sequence
 *    increment rolls back cleanly — guaranteeing zero invoice number gaps.
 * 3. Formats formatted invoice numbers according to business invoice settings.
 */

import { ClientSession, Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { DocumentSequenceModel } from '@/db/models/document-sequence.model';
import { BusinessModel } from '@/db/models/business.model';
import { ConflictError, NotFoundError } from '@/lib/errors';

export interface ReservedNumberResult {
  formattedNumber: string;
  sequenceNumber: number;
  prefix: string;
  financialYear: string;
}

export class InvoiceNumberService {
  /**
   * Computes the Indian Financial Year string (e.g. '2025-26' or '25-26') for a given date.
   */
  public static getFinancialYear(date: Date = new Date(), format: 'YY-YY' | 'YYYY-YY' | 'NONE' = 'YY-YY'): string {
    if (format === 'NONE') return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed (0 = Jan, 3 = April)

    // FY starts April 1st
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;

    if (format === 'YYYY-YY') {
      const endYY = String(endYear).slice(-2);
      return `${startYear}-${endYY}`;
    }

    // Default 'YY-YY' e.g. '25-26'
    const startYY = String(startYear).slice(-2);
    const endYY = String(endYear).slice(-2);
    return `${startYY}-${endYY}`;
  }

  /**
   * Atomically reserves the next invoice number for a given document type and business.
   * MUST be called inside an active MongoDB transaction session.
   */
  public async reserveNextNumber(
    businessId: string,
    documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'QUOTATION' | 'DELIVERY_CHALLAN' | 'RECEIPT',
    invoiceDate: Date,
    session: ClientSession
  ): Promise<ReservedNumberResult> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const business = await BusinessModel.findById(bId).session(session).lean().exec();
    if (!business) {
      throw new NotFoundError(`Business with ID '${businessId}' not found.`);
    }

    const prefix = business.invoiceSettings?.prefix || (documentType === 'CREDIT_NOTE' ? 'CN' : 'INV');
    const fyFormat = business.invoiceSettings?.financialYearFormat || 'YY-YY';
    const financialYear = InvoiceNumberService.getFinancialYear(invoiceDate, fyFormat);

    // Atomic findOneAndUpdate using $inc on DocumentSequenceModel inside transaction
    const sequence = await DocumentSequenceModel.findOneAndUpdate(
      {
        businessId: bId,
        documentType,
        prefix,
        financialYear,
      },
      {
        $inc: { nextSeq: 1 },
      },
      {
        new: false, // Return document BEFORE update so nextSeq is the current reserved number
        upsert: true, // Upsert if sequence record doesn't exist for this FY
        session,
      }
    ).exec();

    const sequenceNumber = sequence ? sequence.nextSeq : 1;
    const paddedSeq = String(sequenceNumber).padStart(4, '0');

    const formattedNumber = financialYear
      ? `${prefix}/${financialYear}/${paddedSeq}`
      : `${prefix}/${paddedSeq}`;

    return {
      formattedNumber,
      sequenceNumber,
      prefix,
      financialYear,
    };
  }
}

export const invoiceNumberService = new InvoiceNumberService();

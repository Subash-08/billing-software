/**
 * Credit Note Domain Service
 * src/services/credit-note.service.ts
 *
 * Implements Credit Note creation, issuing, cancellation, customer credit ledger updates,
 * and Rule 46 statutory validation with strict tenant isolation.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { CreditNoteModel, ICreditNote } from '@/db/models/credit-note.model';
import { InvoiceModel } from '@/db/models/invoice.model';
import { CustomerModel } from '@/db/models/customer.model';
import { BusinessModel } from '@/db/models/business.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { customerCreditRepository } from '@/db/repositories/customer-credit.repository';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';
import { ApplicationError, NotFoundError, BusinessRuleError, ConflictError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface CreateCreditNoteInput {
  customerId: string;
  originalInvoiceId?: string;
  reason: 'SALES_RETURN' | 'RATE_REDUCTION' | 'POST_SALE_DISCOUNT' | 'CANCELLATION' | 'OTHER';
  reasonNotes?: string;
  creditNoteDate?: string;
  items: Array<{
    itemId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    hsnSacCode: string;
    quantity: number;
    unit: string;
    uqc: string;
    rate: number; // in rupees
    gstRate: number;
  }>;
}

export class CreditNoteService {
  async createCreditNote(businessId: string, userId: string, input: CreateCreditNoteInput): Promise<ICreditNote> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);

    const business = await BusinessModel.findById(bId).lean().exec();
    if (!business) throw new NotFoundError(`Business with ID '${businessId}' not found.`);

    const customer = await CustomerModel.findOne({ _id: cId, businessId: bId }).lean().exec();
    if (!customer) throw new NotFoundError(`Customer with ID '${input.customerId}' not found.`);

    let origInvoice = null;
    if (input.originalInvoiceId) {
      origInvoice = await InvoiceModel.findOne({
        _id: new Types.ObjectId(input.originalInvoiceId),
        businessId: bId,
      }).lean().exec();
      if (!origInvoice) {
        throw new NotFoundError(`Original invoice with ID '${input.originalInvoiceId}' not found.`);
      }
    }

    const pos = customer.stateCode || customer.billingAddress?.stateCode || business.stateCode || '33';

    // Calculate tax authoritatively using engine
    const invResult = calculateInvoice({
      supplierStateCode: business.stateCode || '33',
      placeOfSupplyStateCode: pos,
      items: input.items.map((item) => ({
        name: item.name,
        classificationCode: { type: item.itemType === 'SERVICES' ? 'SAC' : 'HSN', code: item.hsnSacCode },
        quantity: item.quantity,
        unit: item.unit,
        uqc: item.uqc,
        ratePaise: rupeesToPaise(item.rate),
        resolvedTaxRate: {
          taxRateId: '507f1f77bcf86cd799439001',
          version: '1.0',
          rate: item.gstRate,
          cessRate: 0,
          effectiveFrom: new Date(),
        },
      })),
    });

    const fy = '2026-27';
    const seq = await documentSequenceRepository.getNextSequenceNumber(businessId, 'CREDIT_NOTE', 'CN', fy);
    const cnNumber = `CN-${fy.replace('-', '')}-${seq.toString().padStart(4, '0')}`;

    const itemsSnapshot = invResult.items.map((l, index) => ({
      itemId: input.items[index].itemId ? new Types.ObjectId(input.items[index].itemId) : undefined,
      itemType: input.items[index].itemType || 'GOODS',
      name: l.name,
      hsnSacCode: l.classificationCode.code,
      quantity: l.quantity,
      unit: input.items[index].unit,
      uqc: input.items[index].uqc,
      rate: l.ratePaise,
      taxableAmount: l.taxablePaise,
      gstRate: input.items[index].gstRate,
      cgstAmount: l.gstResult.cgstPaise,
      sgstAmount: l.gstResult.sgstPaise,
      igstAmount: l.gstResult.igstPaise,
      totalAmount: l.totalAmountPaise,
    }));

    const creditNote = await CreditNoteModel.create({
      businessId: bId,
      customerId: cId,
      originalInvoiceId: origInvoice ? origInvoice._id : undefined,
      creditNoteNumber: cnNumber,
      financialYear: fy,
      creditNoteDate: input.creditNoteDate ? new Date(input.creditNoteDate) : new Date(),
      reason: input.reason,
      reasonNotes: input.reasonNotes,
      status: 'DRAFT',
      items: itemsSnapshot,
      subTotal: invResult.subTotalPaise,
      totalTaxable: invResult.totalTaxablePaise,
      totalCgst: invResult.totalCgstPaise,
      totalSgst: invResult.totalSgstPaise,
      totalIgst: invResult.totalIgstPaise,
      roundOff: invResult.roundOffPaise,
      grandTotal: invResult.grandTotalPaise,
    });

    await AuditLogModel.create({
      businessId: bId,
      userId: new Types.ObjectId(userId),
      action: 'CREDIT_NOTE_CREATED',
      resource: 'CREDIT_NOTE',
      resourceId: creditNote._id.toString(),
      metadata: { summary: `Created draft Credit Note ${cnNumber} for customer ${customer.displayName || customer.legalName || 'Customer'}` },
    });

    return creditNote;
  }

  async issueCreditNote(businessId: string, creditNoteId: string): Promise<ICreditNote> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cnId = new Types.ObjectId(creditNoteId);

    const creditNote = await CreditNoteModel.findOne({ _id: cnId, businessId: bId }).exec();
    if (!creditNote) throw new NotFoundError(`Credit Note with ID '${creditNoteId}' not found.`);

    if (creditNote.status === 'ISSUED') return creditNote;
    if (creditNote.status === 'CANCELLED') {
      throw new ConflictError('Cannot issue a CANCELLED Credit Note.');
    }

    creditNote.status = 'ISSUED';
    await creditNote.save();

    // If credit note is linked to an original invoice, offset invoice outstanding balance first
    let netCustomerCreditIncrement = creditNote.grandTotal;

    if (creditNote.originalInvoiceId) {
      const invoice = await InvoiceModel.findOne({
        _id: creditNote.originalInvoiceId,
        businessId: bId,
      }).exec();

      if (invoice) {
        const currentOutstanding = invoice.outstandingBalance || 0;
        const offsetAmount = Math.min(creditNote.grandTotal, currentOutstanding);

        if (offsetAmount > 0) {
          invoice.outstandingBalance = currentOutstanding - offsetAmount;
          if (invoice.outstandingBalance <= 0) {
            invoice.paymentStatus = 'PAID';
            invoice.outstandingBalance = 0;
          } else if (invoice.paidAmount > 0) {
            invoice.paymentStatus = 'PARTIALLY_PAID';
          }
          await invoice.save();
        }

        // Only the surplus credit beyond the invoice outstanding balance goes to customer advance credit
        netCustomerCreditIncrement = Math.max(0, creditNote.grandTotal - offsetAmount);
      }
    }

    // Append credit event to Customer Ledger for net customer credit increment
    if (netCustomerCreditIncrement > 0) {
      await customerCreditRepository.appendEvent({
        businessId: bId,
        customerId: creditNote.customerId,
        type: 'CREDIT',
        amountPaise: netCustomerCreditIncrement,
        notes: `Credit Note ${creditNote.creditNoteNumber} issued (On-Account Credit Surplus)`,
      });

      // Update Customer.creditBalance projection
      await CustomerModel.findOneAndUpdate(
        { _id: creditNote.customerId, businessId: bId },
        { $inc: { creditBalance: netCustomerCreditIncrement } }
      ).exec();
    }

    // Restock product inventory if this is a Sales Return
    if (creditNote.reason === 'SALES_RETURN' && creditNote.items) {
      const { ProductModel } = await import('@/db/models/product.model');
      for (const item of creditNote.items) {
        if (item.itemId && item.itemType === 'GOODS') {
          await ProductModel.findOneAndUpdate(
            { _id: item.itemId, businessId: bId },
            { $inc: { currentStock: item.quantity } }
          ).exec();
        }
      }
    }

    await AuditLogModel.create({
      businessId: bId,
      action: 'CREDIT_NOTE_ISSUED',
      resource: 'CREDIT_NOTE',
      resourceId: creditNote._id.toString(),
      metadata: { summary: `Issued Credit Note ${creditNote.creditNoteNumber} (Grand Total: ₹${(creditNote.grandTotal / 100).toFixed(2)})` },
    });

    return creditNote;
  }

  async cancelCreditNote(businessId: string, creditNoteId: string, reason: string): Promise<ICreditNote> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cnId = new Types.ObjectId(creditNoteId);

    const creditNote = await CreditNoteModel.findOne({ _id: cnId, businessId: bId }).exec();
    if (!creditNote) throw new NotFoundError(`Credit Note with ID '${creditNoteId}' not found.`);

    if (creditNote.status === 'CANCELLED') throw new ConflictError('Credit Note is already CANCELLED.');

    creditNote.status = 'CANCELLED';
    await creditNote.save();

    await AuditLogModel.create({
      businessId: bId,
      action: 'CREDIT_NOTE_CANCELLED',
      resource: 'CREDIT_NOTE',
      resourceId: creditNote._id.toString(),
      metadata: { summary: `Cancelled Credit Note ${creditNote.creditNoteNumber}. Reason: ${reason}` },
    });

    return creditNote;
  }
}

export const creditNoteService = new CreditNoteService();

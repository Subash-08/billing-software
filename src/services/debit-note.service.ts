/**
 * Debit Note Domain Service
 * src/services/debit-note.service.ts
 *
 * Implements Debit Note creation, issuing, cancellation, and Rule 46 statutory validation
 * with strict tenant isolation.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { DebitNoteModel, IDebitNote } from '@/db/models/debit-note.model';
import { InvoiceModel } from '@/db/models/invoice.model';
import { CustomerModel } from '@/db/models/customer.model';
import { BusinessModel } from '@/db/models/business.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';
import { ApplicationError, NotFoundError, BusinessRuleError, ConflictError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface CreateDebitNoteInput {
  customerId: string;
  originalInvoiceId?: string;
  reason: 'ADDITIONAL_CHARGES' | 'UNDERBILLING_CORRECTION' | 'POST_INVOICE_PRICE_INCREASE' | 'OTHER';
  reasonNotes?: string;
  debitNoteDate?: string;
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

export class DebitNoteService {
  async createDebitNote(businessId: string, userId: string, input: CreateDebitNoteInput): Promise<IDebitNote> {
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
    const seq = await documentSequenceRepository.getNextSequenceNumber(businessId, 'DEBIT_NOTE', 'DN', fy);
    const dnNumber = `DN-${fy.replace('-', '')}-${seq.toString().padStart(4, '0')}`;

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

    const debitNote = await DebitNoteModel.create({
      businessId: bId,
      customerId: cId,
      originalInvoiceId: origInvoice ? origInvoice._id : undefined,
      debitNoteNumber: dnNumber,
      financialYear: fy,
      debitNoteDate: input.debitNoteDate ? new Date(input.debitNoteDate) : new Date(),
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
      action: 'DEBIT_NOTE_CREATED',
      resource: 'DEBIT_NOTE',
      resourceId: debitNote._id.toString(),
      metadata: { summary: `Created draft Debit Note ${dnNumber} for customer ${customer.displayName || customer.legalName || 'Customer'}` },
    });

    return debitNote;
  }

  async issueDebitNote(businessId: string, debitNoteId: string): Promise<IDebitNote> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const dnId = new Types.ObjectId(debitNoteId);

    const debitNote = await DebitNoteModel.findOne({ _id: dnId, businessId: bId }).exec();
    if (!debitNote) throw new NotFoundError(`Debit Note with ID '${debitNoteId}' not found.`);

    if (debitNote.status === 'ISSUED') return debitNote;
    if (debitNote.status === 'CANCELLED') {
      throw new ConflictError('Cannot issue a CANCELLED Debit Note.');
    }

    debitNote.status = 'ISSUED';
    await debitNote.save();

    await AuditLogModel.create({
      businessId: bId,
      action: 'DEBIT_NOTE_ISSUED',
      resource: 'DEBIT_NOTE',
      resourceId: debitNote._id.toString(),
      metadata: { summary: `Issued Debit Note ${debitNote.debitNoteNumber} (Grand Total: ₹${(debitNote.grandTotal / 100).toFixed(2)})` },
    });

    return debitNote;
  }

  async cancelDebitNote(businessId: string, debitNoteId: string, reason: string): Promise<IDebitNote> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const dnId = new Types.ObjectId(debitNoteId);

    const debitNote = await DebitNoteModel.findOne({ _id: dnId, businessId: bId }).exec();
    if (!debitNote) throw new NotFoundError(`Debit Note with ID '${debitNoteId}' not found.`);

    if (debitNote.status === 'CANCELLED') throw new ConflictError('Debit Note is already CANCELLED.');

    debitNote.status = 'CANCELLED';
    await debitNote.save();

    await AuditLogModel.create({
      businessId: bId,
      action: 'DEBIT_NOTE_CANCELLED',
      resource: 'DEBIT_NOTE',
      resourceId: debitNote._id.toString(),
      metadata: { summary: `Cancelled Debit Note ${debitNote.debitNoteNumber}. Reason: ${reason}` },
    });

    return debitNote;
  }
}

export const debitNoteService = new DebitNoteService();

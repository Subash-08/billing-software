import { Types, FilterQuery } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel, IInvoice } from '@/db/models/invoice.model';
import { DocumentSequenceModel } from '@/db/models/document-sequence.model';

export interface InvoiceListFilters {
  status?: string;
  paymentStatus?: string;
  customerId?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class InvoiceRepository {
  /**
   * Atomically increments and returns the next sequential number formatted per Rule 46.
   * Scoped by businessId, documentType, prefix, and financialYear.
   */
  async getNextSequenceNumber(
    businessId: Types.ObjectId | string,
    documentType: string,
    financialYear: string,
    prefix = 'INV'
  ): Promise<{ sequenceNumber: number; formattedInvoiceNumber: string }> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;

    const seqDoc = await DocumentSequenceModel.findOneAndUpdate(
      { businessId: bId, documentType, prefix, financialYear },
      { $inc: { nextSeq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const seqNum = seqDoc.nextSeq - 1; // Current claimed sequence number
    const formattedNum = `${prefix}-${financialYear.replace('-', '')}-${String(seqNum).padStart(4, '0')}`;

    if (formattedNum.length > 16) {
      // Fallback format if prefix is long: e.g. "INV24250001" (11 chars)
      const shortFy = financialYear.replace('-', '').slice(2);
      const shortNum = `${prefix}${shortFy}${String(seqNum).padStart(4, '0')}`;
      if (shortNum.length > 16) {
        throw new Error(`Generated invoice number '${shortNum}' exceeds 16-character Rule 46 limit.`);
      }
      return { sequenceNumber: seqNum, formattedInvoiceNumber: shortNum };
    }

    return { sequenceNumber: seqNum, formattedInvoiceNumber: formattedNum };
  }

  async create(data: Partial<IInvoice>): Promise<IInvoice> {
    await connectToDatabase();
    const invoice = new InvoiceModel(data);
    return invoice.save();
  }

  async findById(businessId: Types.ObjectId | string, id: string): Promise<IInvoice | null> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
    return InvoiceModel.findOne({ _id: id, businessId: bId }).exec();
  }

  /**
   * Atomically claims a DRAFT invoice for issuance transition (DRAFT -> ISSUING).
   * Prevents concurrent race conditions.
   */
  async atomicClaimDraftForIssuance(businessId: Types.ObjectId | string, id: string): Promise<IInvoice | null> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;

    return InvoiceModel.findOneAndUpdate(
      { _id: id, businessId: bId, status: 'DRAFT' },
      { $set: { status: 'VALIDATING' } }, // Atomic claim to VALIDATING state
      { new: true }
    ).exec();
  }

  /**
   * Rollback state from VALIDATING back to DRAFT in case of issuance error/timeout.
   */
  async rollbackIssuanceState(businessId: Types.ObjectId | string, id: string): Promise<void> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
    await InvoiceModel.updateOne({ _id: id, businessId: bId, status: 'VALIDATING' }, { $set: { status: 'DRAFT' } }).exec();
  }

  async update(businessId: Types.ObjectId | string, id: string, data: Partial<IInvoice>): Promise<IInvoice | null> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
    return InvoiceModel.findOneAndUpdate({ _id: id, businessId: bId }, { $set: data }, { new: true }).exec();
  }

  async list(
    businessId: Types.ObjectId | string,
    filters: InvoiceListFilters = {}
  ): Promise<{ items: IInvoice[]; total: number; page: number; totalPages: number }> {
    await connectToDatabase();
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;

    const query: FilterQuery<IInvoice> = { businessId: bId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters.customerId) {
      query.customerId = new Types.ObjectId(filters.customerId);
    }
    if (filters.search) {
      query.$or = [
        { invoiceNumber: { $regex: filters.search, $options: 'i' } },
        { 'billToSnapshot.name': { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.startDate || filters.endDate) {
      query.invoiceDate = {};
      if (filters.startDate) query.invoiceDate.$gte = filters.startDate;
      if (filters.endDate) query.invoiceDate.$lte = filters.endDate;
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      InvoiceModel.find(query).sort({ invoiceDate: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      InvoiceModel.countDocuments(query).exec(),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const invoiceRepository = new InvoiceRepository();

import { Types } from 'mongoose';
import { EInvoiceModel, IEInvoice } from '../models/einvoice.model';

export class EInvoiceRepository {
  async findByInvoiceId(
    businessId: string | Types.ObjectId,
    invoiceId: string | Types.ObjectId
  ): Promise<IEInvoice | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const invId = new Types.ObjectId(invoiceId.toString());
    return EInvoiceModel.findOne({ businessId: bId, invoiceId: invId }).exec();
  }

  async findByIrn(irn: string): Promise<IEInvoice | null> {
    return EInvoiceModel.findOne({ irn }).exec();
  }

  async create(businessId: string | Types.ObjectId, data: Partial<IEInvoice>): Promise<IEInvoice> {
    const bId = new Types.ObjectId(businessId.toString());
    const einvoice = new EInvoiceModel({ ...data, businessId: bId });
    return einvoice.save();
  }

  async updateStatus(
    businessId: string | Types.ObjectId,
    invoiceId: string | Types.ObjectId,
    data: Partial<IEInvoice>
  ): Promise<IEInvoice | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const invId = new Types.ObjectId(invoiceId.toString());
    return EInvoiceModel.findOneAndUpdate(
      { businessId: bId, invoiceId: invId },
      { $set: data },
      { new: true, upsert: true }
    ).exec();
  }
}

export const einvoiceRepository = new EInvoiceRepository();

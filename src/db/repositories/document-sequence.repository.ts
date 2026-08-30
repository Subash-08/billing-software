import { Types } from 'mongoose';
import { DocumentSequenceModel } from '../models/document-sequence.model';

export class DocumentSequenceRepository {
  async getNextSequenceNumber(
    businessId: string | Types.ObjectId,
    documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'QUOTATION' | 'DELIVERY_CHALLAN',
    prefix: string,
    financialYear: string
  ): Promise<number> {
    const bId = new Types.ObjectId(businessId.toString());

    const seq = await DocumentSequenceModel.findOneAndUpdate(
      { businessId: bId, documentType, prefix, financialYear },
      { $inc: { nextSeq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();

    return seq.nextSeq - 1;
  }
}

export const documentSequenceRepository = new DocumentSequenceRepository();

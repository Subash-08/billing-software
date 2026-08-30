import { Types } from 'mongoose';
import { ReceiptModel, IReceipt } from '../models/receipt.model';

export class ReceiptRepository {
  async findByPaymentId(
    businessId: string | Types.ObjectId,
    paymentId: string | Types.ObjectId
  ): Promise<IReceipt | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const payId = new Types.ObjectId(paymentId.toString());
    return ReceiptModel.findOne({ businessId: bId, paymentId: payId }).exec();
  }

  async findByReceiptNumber(
    businessId: string | Types.ObjectId,
    receiptNumber: string
  ): Promise<IReceipt | null> {
    const bId = new Types.ObjectId(businessId.toString());
    return ReceiptModel.findOne({ businessId: bId, receiptNumber }).exec();
  }

  async create(businessId: string | Types.ObjectId, data: Partial<IReceipt>): Promise<IReceipt> {
    const bId = new Types.ObjectId(businessId.toString());
    const receipt = new ReceiptModel({ ...data, businessId: bId });
    return receipt.save();
  }
}

export const receiptRepository = new ReceiptRepository();

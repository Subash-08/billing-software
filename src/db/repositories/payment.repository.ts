import { Types } from 'mongoose';
import { PaymentModel, IPayment } from '../models/payment.model';

export class PaymentRepository {
  async findMany(businessId: string | Types.ObjectId): Promise<IPayment[]> {
    const bId = new Types.ObjectId(businessId.toString());
    return PaymentModel.find({ businessId: bId }).sort({ paymentDate: -1 }).exec();
  }

  async findById(
    businessId: string | Types.ObjectId,
    paymentId: string | Types.ObjectId
  ): Promise<IPayment | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const payId = new Types.ObjectId(paymentId.toString());
    return PaymentModel.findOne({ _id: payId, businessId: bId }).exec();
  }

  async create(businessId: string | Types.ObjectId, data: Partial<IPayment>): Promise<IPayment> {
    const bId = new Types.ObjectId(businessId.toString());
    const payment = new PaymentModel({ ...data, businessId: bId });
    return payment.save();
  }
}

export const paymentRepository = new PaymentRepository();

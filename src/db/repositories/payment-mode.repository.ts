import { PaymentModeModel, IPaymentModeMaster } from '../models/payment-mode.model';

export class PaymentModeRepository {
  async findAllActive(): Promise<IPaymentModeMaster[]> {
    return PaymentModeModel.find({ status: 'ACTIVE' }).sort({ name: 1 }).exec();
  }

  async findByCode(code: string): Promise<IPaymentModeMaster | null> {
    return PaymentModeModel.findOne({ code, status: 'ACTIVE' }).exec();
  }

  async create(data: Partial<IPaymentModeMaster>): Promise<IPaymentModeMaster> {
    const mode = new PaymentModeModel(data);
    return mode.save();
  }
}

export const paymentModeRepository = new PaymentModeRepository();

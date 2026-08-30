import { TaxRateModel, ITaxRateMaster } from '../models/tax-rate.model';

export class TaxRateRepository {
  async findAllActive(): Promise<ITaxRateMaster[]> {
    return TaxRateModel.find({ status: 'ACTIVE' }).sort({ rate: 1 }).exec();
  }

  async findByRate(rate: number): Promise<ITaxRateMaster | null> {
    return TaxRateModel.findOne({ rate, status: 'ACTIVE' }).exec();
  }

  async create(data: Partial<ITaxRateMaster>): Promise<ITaxRateMaster> {
    const taxRate = new TaxRateModel(data);
    return taxRate.save();
  }
}

export const taxRateRepository = new TaxRateRepository();

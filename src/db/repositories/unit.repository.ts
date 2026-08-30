import { UnitModel, IUnitMaster } from '../models/unit.model';

export class UnitRepository {
  async listAll(status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'): Promise<IUnitMaster[]> {
    return UnitModel.find({ status }).sort({ name: 1 }).exec();
  }

  async findBySymbol(symbol: string): Promise<IUnitMaster | null> {
    return UnitModel.findOne({ symbol: symbol.trim() }).exec();
  }

  async findByUqc(uqc: string): Promise<IUnitMaster | null> {
    return UnitModel.findOne({ uqc: uqc.trim().toUpperCase() }).exec();
  }
}

export const unitRepository = new UnitRepository();

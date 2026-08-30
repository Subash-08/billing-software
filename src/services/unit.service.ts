import { unitRepository } from '@/db/repositories/unit.repository';
import { IUnitMaster } from '@/db/models/unit.model';

export class UnitService {
  async listActiveUnits(): Promise<IUnitMaster[]> {
    return unitRepository.listAll('ACTIVE');
  }

  async findBySymbol(symbol: string): Promise<IUnitMaster | null> {
    return unitRepository.findBySymbol(symbol);
  }
}

export const unitService = new UnitService();

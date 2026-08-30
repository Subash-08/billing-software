import { HsnSacModel, IHsnSacMaster } from '../models/hsn-sac.model';

export class HsnSacRepository {
  async findByCode(code: string): Promise<IHsnSacMaster | null> {
    return HsnSacModel.findOne({ code, status: 'ACTIVE' }).exec();
  }

  async search(query: string, limit = 20): Promise<IHsnSacMaster[]> {
    const searchRegex = new RegExp(query, 'i');
    return HsnSacModel.find({
      status: 'ACTIVE',
      $or: [{ code: searchRegex }, { description: searchRegex }],
    })
      .limit(limit)
      .exec();
  }

  async create(data: Partial<IHsnSacMaster>): Promise<IHsnSacMaster> {
    const item = new HsnSacModel(data);
    return item.save();
  }
}

export const hsnSacRepository = new HsnSacRepository();

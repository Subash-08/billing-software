import { Types } from 'mongoose';
import { ServiceModel, IServiceItem } from '../models/service.model';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export interface ServiceListFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  categoryId?: string;
  sacCode?: string;
  search?: string;
}

export interface ListOptions {
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ServiceRepository {
  async create(businessId: string | Types.ObjectId, data: Partial<IServiceItem>): Promise<IServiceItem> {
    const bId = new Types.ObjectId(businessId.toString());

    const sanitizedData = { ...data };
    delete (sanitizedData as any)._id;
    delete (sanitizedData as any).businessId;
    delete (sanitizedData as any).createdAt;
    delete (sanitizedData as any).updatedAt;

    if (sanitizedData.code) {
      sanitizedData.code = sanitizedData.code.trim().toUpperCase();
    }

    const serviceItem = new ServiceModel({ ...sanitizedData, businessId: bId, type: 'SERVICE' });
    return serviceItem.save();
  }

  async findById(
    businessId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId
  ): Promise<IServiceItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(serviceId)) return null;
    const sId = new Types.ObjectId(serviceId.toString());

    return ServiceModel.findOne({ _id: sId, businessId: bId }).exec();
  }

  async findByCode(
    businessId: string | Types.ObjectId,
    code: string
  ): Promise<IServiceItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const normalizedCode = code.trim().toUpperCase();
    return ServiceModel.findOne({ businessId: bId, code: normalizedCode }).exec();
  }

  async list(
    businessId: string | Types.ObjectId,
    filters: ServiceListFilters = {},
    options: ListOptions = {}
  ): Promise<{ services: IServiceItem[]; total: number }> {
    const bId = new Types.ObjectId(businessId.toString());
    const query: Record<string, any> = { businessId: bId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }
    if (filters.sacCode) {
      query.sacCode = filters.sacCode.trim();
    }
    if (filters.search && filters.search.trim().length > 0) {
      const escaped = escapeRegex(filters.search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { sacCode: searchRegex },
        { description: searchRegex },
      ];
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const skip = Math.max(options.skip || 0, 0);
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder === 'desc' ? -1 : 1;

    const [services, total] = await Promise.all([
      ServiceModel.find(query)
        .sort({ [sortBy]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ServiceModel.countDocuments(query).exec(),
    ]);

    return { services, total };
  }

  async update(
    businessId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId,
    data: Partial<IServiceItem>
  ): Promise<IServiceItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(serviceId)) return null;
    const sId = new Types.ObjectId(serviceId.toString());

    const updatePayload = { ...data };
    delete (updatePayload as any)._id;
    delete (updatePayload as any).businessId;
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).updatedAt;

    if (updatePayload.code) {
      updatePayload.code = updatePayload.code.trim().toUpperCase();
    }

    return ServiceModel.findOneAndUpdate(
      { _id: sId, businessId: bId },
      { $set: updatePayload },
      { new: true }
    ).exec();
  }

  async deactivate(
    businessId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId
  ): Promise<IServiceItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(serviceId)) return null;
    const sId = new Types.ObjectId(serviceId.toString());

    return ServiceModel.findOneAndUpdate(
      { _id: sId, businessId: bId },
      { $set: { status: 'INACTIVE' } },
      { new: true }
    ).exec();
  }
}

export const serviceRepository = new ServiceRepository();

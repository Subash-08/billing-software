import { Types } from 'mongoose';
import { CategoryModel, ICategory } from '../models/category.model';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class CategoryRepository {
  async create(businessId: string | Types.ObjectId, data: Partial<ICategory>): Promise<ICategory> {
    const bId = new Types.ObjectId(businessId.toString());

    const sanitizedData = { ...data };
    delete (sanitizedData as any)._id;
    delete (sanitizedData as any).businessId;
    delete (sanitizedData as any).createdAt;
    delete (sanitizedData as any).updatedAt;

    const category = new CategoryModel({ ...sanitizedData, businessId: bId });
    return category.save();
  }

  async findById(
    businessId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId
  ): Promise<ICategory | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(categoryId)) return null;
    const cId = new Types.ObjectId(categoryId.toString());

    return CategoryModel.findOne({ _id: cId, businessId: bId }).exec();
  }

  async list(
    businessId: string | Types.ObjectId,
    type?: 'PRODUCT' | 'SERVICE' | 'BOTH',
    status?: 'ACTIVE' | 'INACTIVE',
    search?: string
  ): Promise<ICategory[]> {
    const bId = new Types.ObjectId(businessId.toString());
    const query: Record<string, any> = { businessId: bId };

    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = { $in: [type, 'BOTH'] };
    }
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.name = searchRegex;
    }

    return CategoryModel.find(query).sort({ name: 1 }).exec();
  }

  async update(
    businessId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId,
    data: Partial<ICategory>
  ): Promise<ICategory | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(categoryId)) return null;
    const cId = new Types.ObjectId(categoryId.toString());

    const updatePayload = { ...data };
    delete (updatePayload as any)._id;
    delete (updatePayload as any).businessId;
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).updatedAt;

    return CategoryModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $set: updatePayload },
      { new: true }
    ).exec();
  }

  async deactivate(
    businessId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId
  ): Promise<ICategory | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(categoryId)) return null;
    const cId = new Types.ObjectId(categoryId.toString());

    return CategoryModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $set: { status: 'INACTIVE' } },
      { new: true }
    ).exec();
  }
}

export const categoryRepository = new CategoryRepository();

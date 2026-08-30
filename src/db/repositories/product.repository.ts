import { Types } from 'mongoose';
import { ProductModel, IProductCatalogItem } from '../models/product.model';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export interface ProductListFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  categoryId?: string;
  hsnCode?: string;
  search?: string;
}

export interface ListOptions {
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductRepository {
  async create(businessId: string | Types.ObjectId, data: Partial<IProductCatalogItem>): Promise<IProductCatalogItem> {
    const bId = new Types.ObjectId(businessId.toString());

    // Sanitize system fields
    const sanitizedData = { ...data };
    delete (sanitizedData as any)._id;
    delete (sanitizedData as any).businessId;
    delete (sanitizedData as any).createdAt;
    delete (sanitizedData as any).updatedAt;

    if (sanitizedData.code) {
      sanitizedData.code = sanitizedData.code.trim().toUpperCase();
    }

    const product = new ProductModel({ ...sanitizedData, businessId: bId, type: 'PRODUCT' });
    return product.save();
  }

  async findById(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<IProductCatalogItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(productId)) return null;
    const pId = new Types.ObjectId(productId.toString());

    return ProductModel.findOne({ _id: pId, businessId: bId }).exec();
  }

  async findByCode(
    businessId: string | Types.ObjectId,
    code: string
  ): Promise<IProductCatalogItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    const normalizedCode = code.trim().toUpperCase();
    return ProductModel.findOne({ businessId: bId, code: normalizedCode }).exec();
  }

  async list(
    businessId: string | Types.ObjectId,
    filters: ProductListFilters = {},
    options: ListOptions = {}
  ): Promise<{ products: IProductCatalogItem[]; total: number }> {
    const bId = new Types.ObjectId(businessId.toString());
    const query: Record<string, any> = { businessId: bId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }
    if (filters.hsnCode) {
      query.hsnCode = filters.hsnCode.trim();
    }
    if (filters.search && filters.search.trim().length > 0) {
      const escaped = escapeRegex(filters.search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { hsnCode: searchRegex },
        { description: searchRegex },
      ];
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const skip = Math.max(options.skip || 0, 0);
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder === 'desc' ? -1 : 1;

    const [products, total] = await Promise.all([
      ProductModel.find(query)
        .sort({ [sortBy]: sortOrder, _id: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ProductModel.countDocuments(query).exec(),
    ]);

    return { products, total };
  }

  async update(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId,
    data: Partial<IProductCatalogItem>
  ): Promise<IProductCatalogItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(productId)) return null;
    const pId = new Types.ObjectId(productId.toString());

    const updatePayload = { ...data };
    delete (updatePayload as any)._id;
    delete (updatePayload as any).businessId;
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).updatedAt;

    if (updatePayload.code) {
      updatePayload.code = updatePayload.code.trim().toUpperCase();
    }

    return ProductModel.findOneAndUpdate(
      { _id: pId, businessId: bId },
      { $set: updatePayload },
      { new: true }
    ).exec();
  }

  async deactivate(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<IProductCatalogItem | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(productId)) return null;
    const pId = new Types.ObjectId(productId.toString());

    return ProductModel.findOneAndUpdate(
      { _id: pId, businessId: bId },
      { $set: { status: 'INACTIVE' } },
      { new: true }
    ).exec();
  }

  async delete(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<boolean> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(productId)) return false;
    const pId = new Types.ObjectId(productId.toString());

    const result = await ProductModel.deleteOne({ _id: pId, businessId: bId }).exec();
    return result.deletedCount > 0;
  }
}

export const productRepository = new ProductRepository();

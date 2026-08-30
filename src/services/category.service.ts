import { Types } from 'mongoose';
import { categoryRepository } from '@/db/repositories/category.repository';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';
import { authService } from './auth.service';
import { ICategory } from '@/db/models/category.model';
import { createCategorySchema, updateCategorySchema, CreateCategoryInput, UpdateCategoryInput } from '@/validations/category.schema';
import { NotFoundError, ConflictError } from '@/lib/errors';

export class CategoryService {
  async createCategory(userId: string | Types.ObjectId, rawData: CreateCategoryInput): Promise<ICategory> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const data = createCategorySchema.parse(rawData);

    try {
      const category = await categoryRepository.create(businessId, {
        name: data.name,
        type: data.type,
        description: data.description,
        status: 'ACTIVE',
      });

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'CATEGORY',
        action: 'CATEGORY_CREATED',
        resourceId: (category._id as Types.ObjectId).toString(),
        metadata: { name: category.name, type: category.type },
      });

      return category;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Category '${data.name}' already exists in your catalog`);
      }
      throw err;
    }
  }

  async listCategories(
    userId: string | Types.ObjectId,
    type?: 'PRODUCT' | 'SERVICE' | 'BOTH',
    status?: 'ACTIVE' | 'INACTIVE',
    search?: string
  ): Promise<ICategory[]> {
    const businessId = await authService.getBusinessIdForUser(userId);
    return categoryRepository.list(businessId, type, status, search);
  }

  async updateCategory(
    userId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId,
    rawData: UpdateCategoryInput
  ): Promise<ICategory> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const data = updateCategorySchema.parse(rawData);

    try {
      const updated = await categoryRepository.update(businessId, categoryId, data);
      if (!updated) {
        throw new NotFoundError('Category not found');
      }

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'CATEGORY',
        action: 'CATEGORY_UPDATED',
        resourceId: (updated._id as Types.ObjectId).toString(),
        metadata: { name: updated.name, type: updated.type, status: updated.status },
      });

      return updated;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Category '${data.name}' already exists in your catalog`);
      }
      throw err;
    }
  }

  async deactivateCategory(userId: string | Types.ObjectId, categoryId: string | Types.ObjectId): Promise<ICategory> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const deactivated = await categoryRepository.deactivate(businessId, categoryId);
    if (!deactivated) {
      throw new NotFoundError('Category not found');
    }

    await auditLogRepository.log(businessId, {
      userId: new Types.ObjectId(userId.toString()),
      resource: 'CATEGORY',
      action: 'CATEGORY_DEACTIVATED',
      resourceId: (deactivated._id as Types.ObjectId).toString(),
      metadata: { name: deactivated.name, status: deactivated.status },
    });

    return deactivated;
  }
}

export const categoryService = new CategoryService();

import { Types } from 'mongoose';
import { serviceRepository, ServiceListFilters, ListOptions } from '@/db/repositories/service.repository';
import { categoryRepository } from '@/db/repositories/category.repository';
import { unitRepository } from '@/db/repositories/unit.repository';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';
import { authService } from './auth.service';
import { IServiceItem } from '@/db/models/service.model';
import { createServiceSchema, updateServiceSchema, serviceQuerySchema, CreateServiceInput, UpdateServiceInput } from '@/validations/service.schema';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { roundToTwoDecimals } from '@/lib/money';

export class ServiceService {
  async createService(userId: string | Types.ObjectId, rawData: CreateServiceInput): Promise<IServiceItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const data = createServiceSchema.parse(rawData);

    // 1. Service Code Uniqueness check
    if (data.code && data.code.trim().length > 0) {
      const existing = await serviceRepository.findByCode(businessId, data.code);
      if (existing) {
        throw new ConflictError(`Service code '${data.code.toUpperCase()}' already exists in your catalog`);
      }
    }

    // 2. Billing Unit resolution & active status check
    const billingUnitSymbol = data.billingUnit.trim();
    const matchedUnit = await unitRepository.findBySymbol(billingUnitSymbol);
    let resolvedBillingUnit = billingUnitSymbol;

    if (matchedUnit) {
      if (matchedUnit.status === 'INACTIVE') {
        throw new ValidationError(`Billing unit '${billingUnitSymbol}' is inactive and cannot be selected for new services`);
      }
      resolvedBillingUnit = matchedUnit.symbol;
    }

    // 3. Category validation & type compatibility check
    let categoryObjId: Types.ObjectId | undefined = undefined;
    if (data.categoryId && data.categoryId.trim().length > 0) {
      if (!Types.ObjectId.isValid(data.categoryId)) {
        throw new ValidationError('Invalid category ID format');
      }
      const category = await categoryRepository.findById(businessId, data.categoryId);
      if (!category) {
        throw new NotFoundError('Category not found or belongs to another business');
      }
      if (category.status === 'INACTIVE') {
        throw new ValidationError(`Category '${category.name}' is inactive and cannot be assigned to new services`);
      }
      if (category.type === 'PRODUCT') {
        throw new ValidationError(`Category '${category.name}' is a PRODUCT-only category and cannot be assigned to a Service`);
      }
      categoryObjId = category._id as Types.ObjectId;
    }

    // 4. Money sanitization
    const sanitizedRate = roundToTwoDecimals(data.rate);

    try {
      const serviceItem = await serviceRepository.create(businessId, {
        name: data.name,
        code: data.code && data.code.trim().length > 0 ? data.code.trim().toUpperCase() : undefined,
        sacCode: data.sacCode,
        billingUnit: resolvedBillingUnit,
        rate: sanitizedRate,
        defaultGstRate: data.defaultGstRate,
        taxTreatment: data.taxTreatment,
        categoryId: categoryObjId,
        description: data.description,
        status: 'ACTIVE',
      });

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'SERVICE',
        action: 'SERVICE_CREATED',
        resourceId: (serviceItem._id as Types.ObjectId).toString(),
        metadata: { name: serviceItem.name, code: serviceItem.code, sacCode: serviceItem.sacCode },
      });

      return serviceItem;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Service code '${data.code?.toUpperCase()}' already exists`);
      }
      throw err;
    }
  }

  async getServiceById(userId: string | Types.ObjectId, serviceId: string | Types.ObjectId): Promise<IServiceItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const serviceItem = await serviceRepository.findById(businessId, serviceId);
    if (!serviceItem) {
      throw new NotFoundError('Service not found');
    }
    return serviceItem;
  }

  async listServices(
    userId: string | Types.ObjectId,
    rawQuery: any
  ): Promise<{ services: IServiceItem[]; total: number; page: number; limit: number }> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const query = serviceQuerySchema.parse(rawQuery);

    const filters: ServiceListFilters = {
      status: query.status,
      categoryId: query.categoryId,
      sacCode: query.sacCode,
      search: query.search,
    };

    const options: ListOptions = {
      limit: query.limit,
      skip: (query.page - 1) * query.limit,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const { services, total } = await serviceRepository.list(businessId, filters, options);

    return {
      services,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateService(
    userId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId,
    rawData: UpdateServiceInput
  ): Promise<IServiceItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const existing = await serviceRepository.findById(businessId, serviceId);
    if (!existing) {
      throw new NotFoundError('Service not found');
    }

    const data = updateServiceSchema.parse(rawData);

    // 1. Service Code uniqueness check if code changing
    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await serviceRepository.findByCode(businessId, data.code);
      if (duplicate && (duplicate._id as Types.ObjectId).toString() !== (existing._id as Types.ObjectId).toString()) {
        throw new ConflictError(`Service code '${data.code.toUpperCase()}' already exists`);
      }
    }

    // 2. Category validation if updating categoryId
    let categoryObjId: Types.ObjectId | undefined = existing.categoryId;
    if (data.categoryId !== undefined) {
      if (data.categoryId === '' || data.categoryId === null) {
        categoryObjId = undefined;
      } else {
        if (!Types.ObjectId.isValid(data.categoryId)) {
          throw new ValidationError('Invalid category ID format');
        }
        const category = await categoryRepository.findById(businessId, data.categoryId);
        if (!category) {
          throw new NotFoundError('Category not found or belongs to another business');
        }
        if (category.type === 'PRODUCT') {
          throw new ValidationError(`Category '${category.name}' is a PRODUCT-only category and cannot be assigned to a Service`);
        }
        categoryObjId = category._id as Types.ObjectId;
      }
    }

    // 3. Billing Unit resolution if changing
    let resolvedBillingUnit = existing.billingUnit;
    if (data.billingUnit) {
      const matchedUnit = await unitRepository.findBySymbol(data.billingUnit.trim());
      if (matchedUnit) {
        resolvedBillingUnit = matchedUnit.symbol;
      } else {
        resolvedBillingUnit = data.billingUnit.trim();
      }
    }

    const updatePayload: Partial<IServiceItem> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.code !== undefined) updatePayload.code = data.code ? data.code.trim().toUpperCase() : undefined;
    if (data.sacCode !== undefined) updatePayload.sacCode = data.sacCode;
    if (data.billingUnit !== undefined) updatePayload.billingUnit = resolvedBillingUnit;
    if (data.rate !== undefined) updatePayload.rate = roundToTwoDecimals(data.rate);
    if (data.defaultGstRate !== undefined) updatePayload.defaultGstRate = data.defaultGstRate;
    if (data.taxTreatment !== undefined) updatePayload.taxTreatment = data.taxTreatment;
    if (data.categoryId !== undefined) updatePayload.categoryId = categoryObjId;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.status !== undefined) updatePayload.status = data.status;

    try {
      const updated = await serviceRepository.update(businessId, serviceId, updatePayload);
      if (!updated) throw new NotFoundError('Service not found');

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'SERVICE',
        action: 'SERVICE_UPDATED',
        resourceId: (updated._id as Types.ObjectId).toString(),
        metadata: { name: updated.name, code: updated.code },
      });

      return updated;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Service code '${data.code?.toUpperCase()}' already exists`);
      }
      throw err;
    }
  }

  async deactivateService(userId: string | Types.ObjectId, serviceId: string | Types.ObjectId): Promise<IServiceItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const deactivated = await serviceRepository.deactivate(businessId, serviceId);
    if (!deactivated) {
      throw new NotFoundError('Service not found');
    }

    await auditLogRepository.log(businessId, {
      userId: new Types.ObjectId(userId.toString()),
      resource: 'SERVICE',
      action: 'SERVICE_DEACTIVATED',
      resourceId: (deactivated._id as Types.ObjectId).toString(),
      metadata: { name: deactivated.name, status: deactivated.status },
    });

    return deactivated;
  }
}

export const serviceService = new ServiceService();
export const serviceItemService = serviceService; // Alias for backward compatibility

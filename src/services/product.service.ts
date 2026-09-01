import { Types } from 'mongoose';
import { productRepository, ProductListFilters, ListOptions } from '@/db/repositories/product.repository';
import { categoryRepository } from '@/db/repositories/category.repository';
import { unitRepository } from '@/db/repositories/unit.repository';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';
import { authService } from './auth.service';
import { IProductCatalogItem } from '@/db/models/product.model';
import { createProductSchema, updateProductSchema, productQuerySchema, CreateProductInput, UpdateProductInput } from '@/validations/product.schema';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { roundToTwoDecimals } from '@/lib/money';
import { deletionPolicyService } from '@/services/deletion-policy.service';

export class ProductService {
  async createProduct(userId: string | Types.ObjectId, rawData: CreateProductInput): Promise<IProductCatalogItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const data = createProductSchema.parse(rawData);

    // 1. SKU Uniqueness check
    if (data.code && data.code.trim().length > 0) {
      const existing = await productRepository.findByCode(businessId, data.code);
      if (existing) {
        throw new ConflictError(`Product code/SKU '${data.code.toUpperCase()}' already exists in your catalog`);
      }
    }

    // 2. Unit/UQC server resolution & active status check
    const unitSymbol = data.unit.trim();
    const matchedUnit = await unitRepository.findBySymbol(unitSymbol);
    let resolvedUnit = unitSymbol;
    let resolvedUqc = data.uqc || 'PCS';

    if (matchedUnit) {
      if (matchedUnit.status === 'INACTIVE') {
        throw new ValidationError(`Unit '${unitSymbol}' is inactive and cannot be selected for new products`);
      }
      resolvedUnit = matchedUnit.symbol;
      resolvedUqc = matchedUnit.uqc;
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
        throw new ValidationError(`Category '${category.name}' is inactive and cannot be assigned to new products`);
      }
      if (category.type === 'SERVICE') {
        throw new ValidationError(`Category '${category.name}' is a SERVICE-only category and cannot be assigned to a Product`);
      }
      categoryObjId = category._id as Types.ObjectId;
    }

    // 4. Money sanitization
    const sanitizedSellingPrice = roundToTwoDecimals(data.sellingPrice);
    const sanitizedPurchasePrice = data.purchasePrice !== undefined ? roundToTwoDecimals(data.purchasePrice) : undefined;

    try {
      const product = await productRepository.create(businessId, {
        name: data.name,
        code: data.code && data.code.trim().length > 0 ? data.code.trim().toUpperCase() : undefined,
        hsnCode: data.hsnCode,
        unit: resolvedUnit,
        uqc: resolvedUqc,
        sellingPrice: sanitizedSellingPrice,
        purchasePrice: sanitizedPurchasePrice,
        defaultGstRate: data.defaultGstRate,
        isPriceInclusiveOfGst: data.isPriceInclusiveOfGst ?? false,
        taxTreatment: data.taxTreatment,
        categoryId: categoryObjId,
        description: data.description,
        trackInventory: data.trackInventory ?? true,
        reorderLevel: data.reorderLevel ?? 0,
        status: 'ACTIVE',
      });

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'PRODUCT',
        action: 'PRODUCT_CREATED',
        resourceId: (product._id as Types.ObjectId).toString(),
        metadata: { name: product.name, code: product.code, hsnCode: product.hsnCode },
      });

      return product;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Product code/SKU '${data.code?.toUpperCase()}' already exists`);
      }
      throw err;
    }
  }

  async getProductById(userId: string | Types.ObjectId, productId: string | Types.ObjectId): Promise<IProductCatalogItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const product = await productRepository.findById(businessId, productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async listProducts(
    userId: string | Types.ObjectId,
    rawQuery: any
  ): Promise<{ products: IProductCatalogItem[]; total: number; page: number; limit: number }> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const query = productQuerySchema.parse(rawQuery);

    const filters: ProductListFilters = {
      status: query.status,
      categoryId: query.categoryId,
      hsnCode: query.hsnCode,
      search: query.search,
    };

    const options: ListOptions = {
      limit: query.limit,
      skip: (query.page - 1) * query.limit,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const { products, total } = await productRepository.list(businessId, filters, options);

    return {
      products,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async updateProduct(
    userId: string | Types.ObjectId,
    productId: string | Types.ObjectId,
    rawData: UpdateProductInput
  ): Promise<IProductCatalogItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const existing = await productRepository.findById(businessId, productId);
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const data = updateProductSchema.parse(rawData);

    // 1. SKU uniqueness check if code changing
    if (data.code && data.code.trim().toUpperCase() !== existing.code) {
      const duplicate = await productRepository.findByCode(businessId, data.code);
      if (duplicate && (duplicate._id as Types.ObjectId).toString() !== (existing._id as Types.ObjectId).toString()) {
        throw new ConflictError(`Product code/SKU '${data.code.toUpperCase()}' already exists`);
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
        if (category.type === 'SERVICE') {
          throw new ValidationError(`Category '${category.name}' is a SERVICE-only category and cannot be assigned to a Product`);
        }
        categoryObjId = category._id as Types.ObjectId;
      }
    }

    // 3. Unit resolution if unit changing
    let resolvedUnit = existing.unit;
    let resolvedUqc = existing.uqc;
    if (data.unit) {
      const matchedUnit = await unitRepository.findBySymbol(data.unit.trim());
      if (matchedUnit) {
        resolvedUnit = matchedUnit.symbol;
        resolvedUqc = matchedUnit.uqc;
      } else {
        resolvedUnit = data.unit.trim();
      }
    }

    const updatePayload: Partial<IProductCatalogItem> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.code !== undefined) updatePayload.code = data.code ? data.code.trim().toUpperCase() : undefined;
    if (data.hsnCode !== undefined) updatePayload.hsnCode = data.hsnCode;
    if (data.unit !== undefined) {
      updatePayload.unit = resolvedUnit;
      updatePayload.uqc = resolvedUqc;
    }
    if (data.sellingPrice !== undefined) updatePayload.sellingPrice = roundToTwoDecimals(data.sellingPrice);
    if (data.purchasePrice !== undefined) updatePayload.purchasePrice = roundToTwoDecimals(data.purchasePrice);
    if (data.defaultGstRate !== undefined) updatePayload.defaultGstRate = data.defaultGstRate;
    if (data.isPriceInclusiveOfGst !== undefined) updatePayload.isPriceInclusiveOfGst = data.isPriceInclusiveOfGst;
    if (data.taxTreatment !== undefined) updatePayload.taxTreatment = data.taxTreatment;
    if (data.categoryId !== undefined) updatePayload.categoryId = categoryObjId;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.trackInventory !== undefined) updatePayload.trackInventory = data.trackInventory;
    if (data.reorderLevel !== undefined) updatePayload.reorderLevel = data.reorderLevel;
    if (data.status !== undefined) updatePayload.status = data.status;

    try {
      const updated = await productRepository.update(businessId, productId, updatePayload);
      if (!updated) throw new NotFoundError('Product not found');

      await auditLogRepository.log(businessId, {
        userId: new Types.ObjectId(userId.toString()),
        resource: 'PRODUCT',
        action: 'PRODUCT_UPDATED',
        resourceId: (updated._id as Types.ObjectId).toString(),
        metadata: { name: updated.name, code: updated.code },
      });

      return updated;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictError(`Product code/SKU '${data.code?.toUpperCase()}' already exists`);
      }
      throw err;
    }
  }

  async deleteProduct(userId: string | Types.ObjectId, productId: string | Types.ObjectId): Promise<{ success: boolean }> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const existing = await productRepository.findById(businessId, productId);
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const policy = await deletionPolicyService.canDeleteProduct(businessId, productId);
    if (!policy.allowed) {
      throw new ValidationError(
        'Product is referenced by issued invoices/notes and cannot be permanently deleted. Deactivate the product instead.'
      );
    }

    await productRepository.delete(businessId, productId);

    await auditLogRepository.log(businessId, {
      userId: new Types.ObjectId(userId.toString()),
      resource: 'PRODUCT',
      action: 'PRODUCT_DEACTIVATED',
      resourceId: productId.toString(),
      metadata: { name: existing.name, actionType: 'HARD_DELETE' },
    });

    return { success: true };
  }

  async deactivateProduct(userId: string | Types.ObjectId, productId: string | Types.ObjectId): Promise<IProductCatalogItem> {
    const businessId = await authService.getBusinessIdForUser(userId);
    const deactivated = await productRepository.deactivate(businessId, productId);
    if (!deactivated) {
      throw new NotFoundError('Product not found');
    }

    await auditLogRepository.log(businessId, {
      userId: new Types.ObjectId(userId.toString()),
      resource: 'PRODUCT',
      action: 'PRODUCT_DEACTIVATED',
      resourceId: (deactivated._id as Types.ObjectId).toString(),
      metadata: { name: deactivated.name, status: deactivated.status },
    });

    return deactivated;
  }
}

export const productService = new ProductService();

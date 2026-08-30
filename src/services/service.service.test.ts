import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { serviceService } from './service.service';
import { categoryService } from './category.service';
import { authService } from './auth.service';
import { UserModel } from '@/db/models/user.model';
import { BusinessModel } from '@/db/models/business.model';
import { ServiceModel } from '@/db/models/service.model';
import { CategoryModel } from '@/db/models/category.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { ZodError } from 'zod';

describe('Phase 9 Service Master & Catalog Isolation Test Suite', () => {
  let userAId: Types.ObjectId;
  let businessAId: Types.ObjectId;
  let userBId: Types.ObjectId;
  let businessBId: Types.ObjectId;
  let serviceAId: Types.ObjectId;
  let categoryServAId: Types.ObjectId;
  let categoryProdAId: Types.ObjectId;

  let isConnected = false;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;
      }
    } catch (e) {
      console.warn('MongoDB connection unavailable for ServiceItemService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected) {
      if (userAId) await UserModel.findByIdAndDelete(userAId);
      if (businessAId) await BusinessModel.findByIdAndDelete(businessAId);
      if (userBId) await UserModel.findByIdAndDelete(userBId);
      if (businessBId) await BusinessModel.findByIdAndDelete(businessBId);
      if (serviceAId) await ServiceModel.findByIdAndDelete(serviceAId);
      if (categoryServAId) await CategoryModel.findByIdAndDelete(categoryServAId);
      if (categoryProdAId) await CategoryModel.findByIdAndDelete(categoryProdAId);
    }
  });

  it('Setup Users, Businesses & Categories', async () => {
    if (!isConnected) return;

    const resA = await authService.registerUserWithBusiness({
      fullName: 'P9 User A Service',
      email: `p9_user_a_serv_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business A Services',
      phone: '9840033333',
      address: '100 Mount Rd',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600002',
      gstRegistrationType: 'REGULAR',
      gstin: '33AAAAA0000A1Z5',
      stateCode: '33',
    });

    userAId = resA.user._id as Types.ObjectId;
    businessAId = resA.business._id as Types.ObjectId;

    const resB = await authService.registerUserWithBusiness({
      fullName: 'P9 User B Service',
      email: `p9_user_b_serv_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business B Services',
      phone: '9840044444',
      address: '200 MG Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstRegistrationType: 'REGULAR',
      gstin: '29AAAAA0000A1Z5',
      stateCode: '29',
    });

    userBId = resB.user._id as Types.ObjectId;
    businessBId = resB.business._id as Types.ObjectId;

    const catServA = await categoryService.createCategory(userAId, {
      name: 'IT Consultancy',
      type: 'SERVICE',
    });
    categoryServAId = catServA._id as Types.ObjectId;

    const catProdA = await categoryService.createCategory(userAId, {
      name: 'Physical Goods Category',
      type: 'PRODUCT',
    });
    categoryProdAId = catProdA._id as Types.ObjectId;

    expect(userAId).toBeDefined();
  });

  it('User A creates Service with normalized uppercase code and valid SAC', async () => {
    if (!isConnected || !userAId) return;

    const service = await serviceService.createService(userAId, {
      name: 'Software Development Consulting',
      code: ' serv-it-001 ', // Should normalize to SERV-IT-001
      sacCode: '998314',
      billingUnit: 'Hrs',
      rate: 2500,
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
      categoryId: categoryServAId.toString(),
    });

    serviceAId = service._id as Types.ObjectId;
    expect(service.name).toBe('Software Development Consulting');
    expect(service.code).toBe('SERV-IT-001');
    expect(service.businessId.toString()).toBe(businessAId.toString());
  });

  it('Category Compatibility: Rejects assigning PRODUCT-only category to a Service', async () => {
    if (!isConnected || !userAId) return;

    await expect(
      serviceService.createService(userAId, {
        name: 'Invalid Service Category',
        sacCode: '998314',
        billingUnit: 'Hrs',
        rate: 1000,
        defaultGstRate: 18,
        taxTreatment: 'TAXABLE',
        categoryId: categoryProdAId.toString(), // PRODUCT category!
      })
    ).rejects.toThrow(ValidationError);
  });

  it('Duplicate Service Code in SAME business rejected with ConflictError (409)', async () => {
    if (!isConnected || !userAId) return;

    await expect(
      serviceService.createService(userAId, {
        name: 'Duplicate Code Service',
        code: 'SERV-IT-001',
        sacCode: '998314',
        billingUnit: 'Hrs',
        rate: 1500,
        defaultGstRate: 18,
        taxTreatment: 'TAXABLE',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('Cross-tenant Service Security: User B CANNOT access or deactivate Service A', async () => {
    if (!isConnected || !userBId || !serviceAId) return;

    await expect(serviceService.getServiceById(userBId, serviceAId)).rejects.toThrow(NotFoundError);
    await expect(serviceService.deactivateService(userBId, serviceAId)).rejects.toThrow(NotFoundError);
  });
});

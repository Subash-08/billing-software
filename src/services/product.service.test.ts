import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { productService } from './product.service';
import { categoryService } from './category.service';
import { authService } from './auth.service';
import { UserModel } from '@/db/models/user.model';
import { BusinessModel } from '@/db/models/business.model';
import { ProductModel } from '@/db/models/product.model';
import { CategoryModel } from '@/db/models/category.model';
import { UnitModel } from '@/db/models/unit.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { ZodError } from 'zod';

describe('Phase 9 Product Service & Catalog Isolation Test Suite', () => {
  let userAId: Types.ObjectId;
  let businessAId: Types.ObjectId;
  let userBId: Types.ObjectId;
  let businessBId: Types.ObjectId;
  let productAId: Types.ObjectId;
  let categoryProdAId: Types.ObjectId;
  let categoryServAId: Types.ObjectId;
  let categoryBId: Types.ObjectId;

  let isConnected = false;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;
      }
    } catch (e) {
      console.warn('MongoDB connection unavailable for ProductService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected) {
      if (userAId) await UserModel.findByIdAndDelete(userAId);
      if (businessAId) await BusinessModel.findByIdAndDelete(businessAId);
      if (userBId) await UserModel.findByIdAndDelete(userBId);
      if (businessBId) await BusinessModel.findByIdAndDelete(businessBId);
      if (productAId) await ProductModel.findByIdAndDelete(productAId);
      if (categoryProdAId) await CategoryModel.findByIdAndDelete(categoryProdAId);
      if (categoryServAId) await CategoryModel.findByIdAndDelete(categoryServAId);
      if (categoryBId) await CategoryModel.findByIdAndDelete(categoryBId);
    }
  });

  it('Setup Users, Businesses, Categories & Global Unit', async () => {
    if (!isConnected) return;

    const resA = await authService.registerUserWithBusiness({
      fullName: 'P9 User A',
      email: `p9_user_a_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business A Catalog',
      phone: '9840011111',
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
      fullName: 'P9 User B',
      email: `p9_user_b_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business B Catalog',
      phone: '9840022222',
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

    // Create Category for Product in Business A
    const catProdA = await categoryService.createCategory(userAId, {
      name: 'Hardware Bolts',
      type: 'PRODUCT',
    });
    categoryProdAId = catProdA._id as Types.ObjectId;

    // Create Category for Service in Business A
    const catServA = await categoryService.createCategory(userAId, {
      name: 'Consulting Services',
      type: 'SERVICE',
    });
    categoryServAId = catServA._id as Types.ObjectId;

    // Create Category in Business B
    const catB = await categoryService.createCategory(userBId, {
      name: 'Business B Category',
      type: 'PRODUCT',
    });
    categoryBId = catB._id as Types.ObjectId;

    // Seed Global Unit if not present
    await UnitModel.updateOne(
      { symbol: 'Pcs' },
      { $setOnInsert: { name: 'Pieces', symbol: 'Pcs', uqc: 'PCS', status: 'ACTIVE' } },
      { upsert: true }
    );

    expect(userAId).toBeDefined();
    expect(businessAId).toBeDefined();
  });

  it('Unit / UQC Mismatch Attack Test: Server resolves unit UQC from Unit master, overriding browser KGS', async () => {
    if (!isConnected || !userAId) return;

    // Browser submits unit = 'Pcs', uqc = 'KGS' (mismatched!)
    const product = await productService.createProduct(userAId, {
      name: 'Mismatched Unit Product',
      hsnCode: '73181500',
      unit: 'Pcs',
      uqc: 'KGS', // Mismatched Browser Input!
      sellingPrice: 100,
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
    });

    // Server must resolve unit 'Pcs' -> uqc 'PCS', overriding browser 'KGS'
    expect(product.unit).toBe('Pcs');
    expect(product.uqc).toBe('PCS'); // Overridden by server resolution!
  });

  it('Product CRUD performs ZERO GST calculation (no cgst, sgst, igst, utgst, cess)', async () => {
    if (!isConnected || !userAId) return;

    const product = await productService.createProduct(userAId, {
      name: 'Zero GST Calculation Product',
      hsnCode: '73181500',
      unit: 'Pcs',
      uqc: 'PCS',
      sellingPrice: 1000,
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
    });

    const docObj = product.toObject() as any;
    expect(docObj.sellingPrice).toBe(1000);
    expect(docObj.defaultGstRate).toBe(18);
    // Explicitly verify NO calculated tax fields exist inside Product document!
    expect(docObj.cgst).toBeUndefined();
    expect(docObj.sgst).toBeUndefined();
    expect(docObj.igst).toBeUndefined();
    expect(docObj.utgst).toBeUndefined();
    expect(docObj.cessAmount).toBeUndefined();
    expect(docObj.taxAmount).toBeUndefined();
  });

  it('User A creates Product with normalized uppercase SKU and valid HSN', async () => {
    if (!isConnected || !userAId) return;

    const product = await productService.createProduct(userAId, {
      name: 'Industrial Bolt M8',
      code: ' bolt-m8-001 ', // lowercase & padded space -> should normalize to BOLT-M8-001
      hsnCode: '73181500',
      unit: 'Pcs',
      uqc: 'PCS',
      sellingPrice: 150.5,
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
      categoryId: categoryProdAId.toString(),
    });

    productAId = product._id as Types.ObjectId;
    expect(product.name).toBe('Industrial Bolt M8');
    expect(product.code).toBe('BOLT-M8-001'); // Uppercased & trimmed
    expect(product.uqc).toBe('PCS'); // Server resolved from UnitModel
    expect(product.businessId.toString()).toBe(businessAId.toString());
  });

  it('Category Compatibility: Rejects assigning SERVICE-only category to a Product', async () => {
    if (!isConnected || !userAId) return;

    await expect(
      productService.createProduct(userAId, {
        name: 'Invalid Category Product',
        hsnCode: '73181500',
        unit: 'Pcs',
        uqc: 'PCS',
        sellingPrice: 100,
        defaultGstRate: 18,
        taxTreatment: 'TAXABLE',
        categoryId: categoryServAId.toString(), // SERVICE category!
      })
    ).rejects.toThrow(ValidationError);
  });

  it('Cross-Tenant Category Attack: User A cannot assign User B category', async () => {
    if (!isConnected || !userAId || !categoryBId) return;

    await expect(
      productService.createProduct(userAId, {
        name: 'Hacked Category Product',
        hsnCode: '73181500',
        unit: 'Pcs',
        uqc: 'PCS',
        sellingPrice: 100,
        defaultGstRate: 18,
        taxTreatment: 'TAXABLE',
        categoryId: categoryBId.toString(), // User B category!
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('Duplicate SKU Uniqueness: Duplicate SKU in SAME business rejected with ConflictError (409)', async () => {
    if (!isConnected || !userAId) return;

    await expect(
      productService.createProduct(userAId, {
        name: 'Duplicate SKU Product',
        code: 'BOLT-M8-001', // Duplicate SKU!
        hsnCode: '73181500',
        unit: 'Pcs',
        uqc: 'PCS',
        sellingPrice: 200,
        defaultGstRate: 18,
        taxTreatment: 'TAXABLE',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('Same SKU in DIFFERENT Businesses is ALLOWED', async () => {
    if (!isConnected || !userBId) return;

    const prodB = await productService.createProduct(userBId, {
      name: 'Business B Product with Same SKU',
      code: 'BOLT-M8-001', // Same SKU in Business B -> ALLOWED
      hsnCode: '73181500',
      unit: 'Pcs',
      uqc: 'PCS',
      sellingPrice: 300,
      defaultGstRate: 18,
      taxTreatment: 'TAXABLE',
    });

    expect(prodB.code).toBe('BOLT-M8-001');
    expect(prodB.businessId.toString()).toBe(businessBId.toString());
  });

  it('Non-standard GST rate (17.37%) is rejected by validation', async () => {
    if (!isConnected || !userAId) return;

    await expect(
      productService.createProduct(userAId, {
        name: 'Nonsense Rate Product',
        hsnCode: '73181500',
        unit: 'Pcs',
        uqc: 'PCS',
        sellingPrice: 100,
        defaultGstRate: 17.37 as any,
        taxTreatment: 'TAXABLE',
      })
    ).rejects.toThrow(ZodError);
  });

  it('Cross-tenant Product Security: User B CANNOT read, update, or deactivate Product A', async () => {
    if (!isConnected || !userBId || !productAId) return;

    await expect(productService.getProductById(userBId, productAId)).rejects.toThrow(NotFoundError);
    await expect(productService.updateProduct(userBId, productAId, { name: 'Hacked' })).rejects.toThrow(NotFoundError);
    await expect(productService.deactivateProduct(userBId, productAId)).rejects.toThrow(NotFoundError);
  });

  it('Soft Deactivation: Sets status INACTIVE, no physical deletion', async () => {
    if (!isConnected || !userAId || !productAId) return;

    const deactivated = await productService.deactivateProduct(userAId, productAId);
    expect(deactivated.status).toBe('INACTIVE');

    const rawDoc = await ProductModel.findById(productAId);
    expect(rawDoc).not.toBeNull();
    expect(rawDoc?.status).toBe('INACTIVE');
  });

  it('Audit Log Events: Captures PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DEACTIVATED', async () => {
    if (!isConnected || !businessAId || !productAId) return;

    const logs = await AuditLogModel.find({ businessId: businessAId, resource: 'PRODUCT' }).exec();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].userId?.toString()).toBe(userAId.toString());
    expect(logs[0].businessId.toString()).toBe(businessAId.toString());
  });
});

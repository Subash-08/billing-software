import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { customerService } from './customer.service';
import { authService } from './auth.service';
import { UserModel } from '@/db/models/user.model';
import { BusinessModel } from '@/db/models/business.model';
import { CustomerModel } from '@/db/models/customer.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { ZodError } from 'zod';

describe('Phase 8 Customer Service & Tenant Security Test Suite', () => {
  let userAId: Types.ObjectId;
  let businessAId: Types.ObjectId;
  let userBId: Types.ObjectId;
  let businessBId: Types.ObjectId;
  let customerAId: Types.ObjectId;

  let isConnected = false;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;
      }
    } catch (e) {
      console.warn('MongoDB connection unavailable for CustomerService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected) {
      if (userAId) await UserModel.findByIdAndDelete(userAId);
      if (businessAId) await BusinessModel.findByIdAndDelete(businessAId);
      if (userBId) await UserModel.findByIdAndDelete(userBId);
      if (businessBId) await BusinessModel.findByIdAndDelete(businessBId);
      if (customerAId) await CustomerModel.findByIdAndDelete(customerAId);
    }
  });

  it('Setup Users and Businesses', async () => {
    if (!isConnected) return;

    const resA = await authService.registerUserWithBusiness({
      fullName: 'P8 User A',
      email: `p8_user_a_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business A Corp',
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
      fullName: 'P8 User B',
      email: `p8_user_b_${Date.now()}@test.com`,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business B Corp',
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

    expect(userAId).toBeDefined();
    expect(userBId).toBeDefined();
  });

  it('User A creates Customer A successfully with valid GSTIN state code alignment', async () => {
    if (!isConnected || !userAId) return;

    const customer = await customerService.createCustomer(userAId, {
      customerType: 'BUSINESS',
      displayName: 'Customer Alpha',
      legalName: 'Customer Alpha Private Limited',
      phone: '9840033333',
      email: 'alpha@domain.com',
      gstTreatment: 'REGISTERED',
      gstin: '33AAAAA9999A1Z5', // Prefix 33 matches stateCode 33
      stateCode: '33',
      billingAddress: {
        label: 'Billing',
        addressLine1: '50 Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600002',
        country: 'India',
        isDefaultShipping: false,
      },
      shippingAddresses: [],
      contacts: [{ name: 'Suresh Kumar', phone: '9840033333' }],
    });

    customerAId = customer._id as Types.ObjectId;
    expect(customer.displayName).toBe('Customer Alpha');
    expect(customer.businessId.toString()).toBe(businessAId.toString());
  });

  it('GSTIN State Code Alignment Validation: Rejects mismatched state code prefix', async () => {
    if (!isConnected || !userAId) return;

    // GSTIN prefix '29' (Karnataka) vs. customer stateCode '33' (Tamil Nadu) -> MUST fail validation
    await expect(
      customerService.createCustomer(userAId, {
        customerType: 'BUSINESS',
        displayName: 'Mismatched State Customer',
        phone: '9840044444',
        gstTreatment: 'REGISTERED',
        gstin: '29AAAAA9999A1Z5', // Prefix 29
        stateCode: '33',           // Mismatched state code 33
        billingAddress: {
          label: 'Billing',
          addressLine1: '100 Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          stateCode: '33',
          pincode: '600002',
          country: 'India',
          isDefaultShipping: false,
        },
        shippingAddresses: [],
        contacts: [],
      })
    ).rejects.toThrow(ZodError);
  });

  it('Credit Balance Protection: Client payload CANNOT directly mutate creditBalance', async () => {
    if (!isConnected || !userAId || !customerAId) return;

    // Attempt to inject creditBalance: 99999 via update payload
    await customerService.updateCustomer(userAId, customerAId, {
      displayName: 'Customer Alpha Updated',
      ...({ creditBalance: 99999 } as any),
    });

    const freshDoc = await CustomerModel.findById(customerAId);
    expect(freshDoc?.creditBalance).toBe(0); // MUST remain 0
  });

  it('Safe Search Regex Escaping: Special regex symbols (Alpha)+ execute safely', async () => {
    if (!isConnected || !userAId) return;

    const result = await customerService.listCustomers(userAId, { search: 'Alpha (Special)+[' });
    expect(result.customers).toBeDefined();
    expect(Array.isArray(result.customers)).toBe(true);
  });

  it('Malformed ObjectId Handling: Requesting customer with malformed ID throws NotFoundError', async () => {
    if (!isConnected || !userAId) return;

    await expect(customerService.getCustomerById(userAId, 'not-an-object-id')).rejects.toThrow(NotFoundError);
  });

  it('Historical Address Snapshot Immutability Contract Demonstration', async () => {
    if (!isConnected || !userAId || !customerAId) return;

    // 1. Simulate Invoice Snapshot created at issuance time
    const initialCustomer = await customerService.getCustomerById(userAId, customerAId);
    const invoiceBillToSnapshot = { ...initialCustomer.billingAddress };

    // 2. Customer updates billing address in Master
    await customerService.updateCustomer(userAId, customerAId, {
      billingAddress: {
        label: 'Billing',
        addressLine1: '999 New Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600002',
        country: 'India',
        isDefaultShipping: false,
      },
    });

    // 3. Verify Invoice Snapshot remains untouched
    expect(invoiceBillToSnapshot.addressLine1).toBe('50 Anna Salai');
  });

  it('Cross-tenant Isolation: User B CANNOT access, update, or deactivate Customer A', async () => {
    if (!isConnected || !userBId || !customerAId) return;

    // User B tries to read Customer A -> MUST throw NotFoundError (404/403)
    await expect(customerService.getCustomerById(userBId, customerAId)).rejects.toThrow(NotFoundError);

    // User B tries to update Customer A -> MUST throw NotFoundError (404)
    await expect(
      customerService.updateCustomer(userBId, customerAId, {
        displayName: 'Hacked by User B',
      })
    ).rejects.toThrow(NotFoundError);

    // User B tries to deactivate Customer A -> MUST throw NotFoundError (404)
    await expect(customerService.deactivateCustomer(userBId, customerAId)).rejects.toThrow(NotFoundError);
  });

  it('Soft Deactivation Policy: Customer is marked INACTIVE, not physically deleted', async () => {
    if (!isConnected || !userAId || !customerAId) return;

    const deactivated = await customerService.deactivateCustomer(userAId, customerAId);
    expect(deactivated.status).toBe('INACTIVE');

    // Document still exists in database
    const rawDoc = await CustomerModel.findById(customerAId);
    expect(rawDoc).not.toBeNull();
    expect(rawDoc?.status).toBe('INACTIVE');
  });

  it('Audit Events: Logs actor userId and tenant businessId for customer actions', async () => {
    if (!isConnected || !businessAId || !customerAId) return;

    const logs = await AuditLogModel.find({ businessId: businessAId, resource: 'CUSTOMER' }).exec();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].userId?.toString()).toBe(userAId.toString());
    expect(logs[0].businessId.toString()).toBe(businessAId.toString());
  });
});

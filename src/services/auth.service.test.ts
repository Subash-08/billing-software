import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { authService } from './auth.service';
import { businessService } from './business.service';
import { UserModel } from '@/db/models/user.model';
import { BusinessModel } from '@/db/models/business.model';
import { ForbiddenError, ValidationError } from '@/lib/errors';

describe('AuthService & Business Tenant Ownership Security Matrix', () => {
  let createdUserAId: Types.ObjectId;
  let createdBusinessAId: Types.ObjectId;
  let createdUserBId: Types.ObjectId;
  let createdBusinessBId: Types.ObjectId;

  let isConnected = false;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;
      }
    } catch (e) {
      console.warn('MongoDB connection unavailable for AuthService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected) {
      if (createdUserAId) await UserModel.findByIdAndDelete(createdUserAId);
      if (createdBusinessAId) await BusinessModel.findByIdAndDelete(createdBusinessAId);
      if (createdUserBId) await UserModel.findByIdAndDelete(createdUserBId);
      if (createdBusinessBId) await BusinessModel.findByIdAndDelete(createdBusinessBId);
    }
  });

  it('registerUserWithBusiness creates User and Business atomically with 1:1 binding', async () => {
    if (!isConnected) return;

    const email = `testuser_a_${Date.now()}@domain.com`;
    const res = await authService.registerUserWithBusiness({
      fullName: 'Test User A',
      email,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business A Legal Name',
      phone: '9876543210',
      address: '123 Main St',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      gstRegistrationType: 'REGULAR',
      gstin: '33AAAAA0000A1Z5',
      stateCode: '33',
    });

    expect(res.user).toBeDefined();
    expect(res.business).toBeDefined();
    expect(res.business.userId.toString()).toBe(res.user._id.toString());

    createdUserAId = res.user._id as Types.ObjectId;
    createdBusinessAId = res.business._id as Types.ObjectId;
  });

  it('registerUserWithBusiness rejects duplicate email registration', async () => {
    if (!isConnected || !createdUserAId) return;

    const userDoc = await UserModel.findById(createdUserAId);
    if (!userDoc) return;

    await expect(
      authService.registerUserWithBusiness({
        fullName: 'Duplicate User',
        email: userDoc.email,
        password: 'password123',
        confirmPassword: 'password123',
        businessName: 'Duplicate Business',
        phone: '9876543210',
        address: '123 Main St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        gstRegistrationType: 'UNREGISTERED',
        stateCode: '33',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('User A CANNOT update Business B (Malicious Cross-Tenant Attack Rejection)', async () => {
    if (!isConnected || !createdUserAId || !createdBusinessAId) return;

    // Create Business B owned by User B
    const emailB = `testuser_b_${Date.now()}@domain.com`;
    const resB = await authService.registerUserWithBusiness({
      fullName: 'Test User B',
      email: emailB,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business B Legal Name',
      phone: '9876543211',
      address: '456 Second St',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstRegistrationType: 'UNREGISTERED',
      stateCode: '29',
    });

    createdUserBId = resB.user._id as Types.ObjectId;
    createdBusinessBId = resB.business._id as Types.ObjectId;

    // User A attempts to update Business B profile -> MUST throw ForbiddenError (403)
    await expect(
      businessService.updateBusinessProfile(createdBusinessBId, createdUserAId, {
        legalName: 'HACKED BY USER A',
        businessType: 'PROPRIETORSHIP',
        phone: '9999999999',
        address: 'Hacked Address',
        city: 'Hacked City',
        state: 'Hacked State',
        pincode: '600001',
        stateCode: '33',
        gstRegistrationType: 'UNREGISTERED',
      })
    ).rejects.toThrow(ForbiddenError);

    // Verify Business B remains completely unmodified in MongoDB
    const freshBusinessB = await BusinessModel.findById(createdBusinessBId);
    expect(freshBusinessB?.legalName).toBe('Business B Legal Name');
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { businessService } from './business.service';
import { authService } from './auth.service';
import { UserModel } from '@/db/models/user.model';
import { BusinessModel } from '@/db/models/business.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { ForbiddenError, ValidationError } from '@/lib/errors';

describe('Phase 7 Business Service & Settings Isolation Test Suite', () => {
  let userAId: Types.ObjectId;
  let businessAId: Types.ObjectId;
  let userBId: Types.ObjectId;
  let businessBId: Types.ObjectId;

  let isConnected = false;

  beforeAll(async () => {
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        isConnected = true;
      }
    } catch (e) {
      console.warn('MongoDB connection unavailable for BusinessService tests.', e);
    }
  });

  afterAll(async () => {
    if (isConnected) {
      if (userAId) await UserModel.findByIdAndDelete(userAId);
      if (businessAId) await BusinessModel.findByIdAndDelete(businessAId);
      if (userBId) await UserModel.findByIdAndDelete(userBId);
      if (businessBId) await BusinessModel.findByIdAndDelete(businessBId);
    }
  });

  it('Authenticated User A can read and update own Business settings', async () => {
    if (!isConnected) return;

    const email = `p7_user_a_${Date.now()}@domain.com`;
    const resA = await authService.registerUserWithBusiness({
      fullName: 'P7 User A',
      email,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business A Legal',
      phone: '9876543210',
      address: '123 Tech Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
      gstRegistrationType: 'REGULAR',
      gstin: '33AAAAA0000A1Z5',
      stateCode: '33',
    });

    userAId = resA.user._id as Types.ObjectId;
    businessAId = resA.business._id as Types.ObjectId;

    // Update Profile
    const updated = await businessService.updateBusinessProfile(businessAId, userAId, {
      legalName: 'Business A Updated Legal Name',
      tradeName: 'Trade Brand A',
      businessType: 'PRIVATE_LIMITED',
      phone: '9876543210',
      address: '123 Tech Park',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
      stateCode: '33',
      gstRegistrationType: 'REGULAR',
    });

    expect(updated.legalName).toBe('Business A Updated Legal Name');
    expect(updated.tradeName).toBe('Trade Brand A');
  });

  it('Cross-tenant Isolation: User A CANNOT update Business B settings', async () => {
    if (!isConnected || !userAId || !businessAId) return;

    // Create Business B owned by User B
    const emailB = `p7_user_b_${Date.now()}@domain.com`;
    const resB = await authService.registerUserWithBusiness({
      fullName: 'P7 User B',
      email: emailB,
      password: 'password123',
      confirmPassword: 'password123',
      businessName: 'Business B Legal',
      phone: '9876543211',
      address: '456 Second St',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstRegistrationType: 'UNREGISTERED',
      stateCode: '29',
    });

    userBId = resB.user._id as Types.ObjectId;
    businessBId = resB.business._id as Types.ObjectId;

    // User A attempts to update Business B GST Settings -> MUST throw ForbiddenError (403)
    await expect(
      businessService.updateGstSettings(businessBId, userAId, {
        registrationType: 'REGULAR',
        gstin: '29AAAAA0000A1Z5',
        stateCode: '29',
      })
    ).rejects.toThrow(ForbiddenError);
  });

  it('Targeted $set Update Isolation: Updating Bank Details leaves GST & Branding settings unmodified', async () => {
    if (!isConnected || !userAId || !businessAId) return;

    // Update GST Settings first
    await businessService.updateGstSettings(businessAId, userAId, {
      registrationType: 'REGULAR',
      gstin: '33AAAAA0000A1Z5',
      stateCode: '33',
    });

    // Update Bank Details
    await businessService.updateBankDetails(businessAId, userAId, {
      accountHolderName: 'Business A Account',
      bankName: 'HDFC Bank',
      accountNumber: '5010023456789',
      ifscCode: 'HDFC0001234',
      accountType: 'CURRENT',
    });

    // Verify Business document has updated bank details AND retained GST settings
    const freshDoc = await BusinessModel.findById(businessAId);
    expect(freshDoc?.bankDetails?.bankName).toBe('HDFC Bank');
    expect(freshDoc?.bankDetails?.ifscCode).toBe('HDFC0001234');
    expect(freshDoc?.gstSettings?.stateCode).toBe('33');
  });

  it('Sanitized Audit Logging: Bank account numbers and secrets are NEVER recorded in audit logs', async () => {
    if (!isConnected || !userAId || !businessAId) return;

    const secretAccount = '999888777666';
    await businessService.updateBankDetails(businessAId, userAId, {
      accountHolderName: 'Secret Account Holder',
      bankName: 'ICICI Bank',
      accountNumber: secretAccount,
      ifscCode: 'ICIC0001234',
    });

    const logs = await AuditLogModel.find({ businessId: businessAId, action: 'BANK_DETAILS_UPDATED' }).exec();
    expect(logs.length).toBeGreaterThan(0);

    const logString = JSON.stringify(logs[logs.length - 1].metadata);
    expect(logString).not.toContain(secretAccount);
  });

  it('Derived Onboarding Progress calculates correctly from persisted settings', async () => {
    if (!isConnected || !userAId || !businessAId) return;

    const progress = await businessService.getDerivedOnboardingProgress(businessAId);
    expect(progress.percentage).toBeGreaterThan(0);
    expect(progress.items.accountCreated).toBe(true);
    expect(progress.items.businessDetails).toBe(true);
  });
});

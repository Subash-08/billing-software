import { Types } from 'mongoose';
import { businessRepository } from '@/db/repositories/business.repository';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';
import { IBusiness } from '@/db/models/business.model';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import {
  businessProfileSchema,
  gstSettingsSchema,
  bankDetailsSchema,
  brandingSchema,
  invoiceSettingsSchema,
  paymentSettingsSchema,
  BusinessProfileInput,
  GstSettingsInput,
  BankDetailsInput,
  BrandingInput,
  InvoiceSettingsInput,
  PaymentSettingsInput,
} from '@/validations/business.schema';

export interface DerivedOnboardingProgress {
  percentage: number;
  items: {
    accountCreated: boolean;
    businessDetails: boolean;
    gstProfile: boolean;
    bankDetails: boolean;
    logoUploaded: boolean;
    invoiceSettingsConfigured: boolean;
    paymentSettingsConfigured: boolean;
  };
}

export class BusinessService {
  async getBusinessProfile(businessId: string | Types.ObjectId): Promise<IBusiness> {
    const business = await businessRepository.findById(businessId);
    if (!business) {
      throw new NotFoundError('Business profile not found');
    }
    return business;
  }

  async getBusinessByUserId(userId: string | Types.ObjectId): Promise<IBusiness | null> {
    return businessRepository.findByUserId(userId);
  }

  /**
   * Helper to verify tenant ownership before executing setting mutations
   */
  private async verifyOwnership(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId
  ): Promise<IBusiness> {
    const business = await businessRepository.findById(targetBusinessId);
    if (!business) {
      throw new NotFoundError('Business profile not found');
    }
    if (business.userId.toString() !== authenticatedUserId.toString()) {
      throw new ForbiddenError('Access denied: You do not have permission to modify this business profile');
    }
    return business;
  }

  /**
   * 1. Update Business Profile & Contact Information
   */
  async updateBusinessProfile(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: BusinessProfileInput & Record<string, any>
  ): Promise<IBusiness> {
    const validatedData = businessProfileSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const { logoUrl, signatureUrl, bankDetails, invoiceSettings, gstSettings, ...profileFields } = validatedData;

    const updateObj: Record<string, any> = { ...profileFields };

    if (logoUrl !== undefined) {
      updateObj['branding.logo.secureUrl'] = logoUrl;
      updateObj['branding.invoiceLogo.secureUrl'] = logoUrl;
    }
    if (signatureUrl !== undefined) {
      updateObj['branding.signature.secureUrl'] = signatureUrl;
    }
    if (bankDetails) {
      updateObj.bankDetails = bankDetails;
    }
    if (invoiceSettings) {
      updateObj.invoiceSettings = invoiceSettings;
    }
    if (gstSettings) {
      updateObj.gstSettings = gstSettings;
    }

    const updated = await businessRepository.update(targetBusinessId, updateObj);
    if (!updated) throw new NotFoundError('Business profile update failed');

    // Audit Event (Sanitized)
    await auditLogRepository.log(targetBusinessId, {
      action: 'BUSINESS_PROFILE_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { legalNameChanged: true, logoUpdated: Boolean(logoUrl) },
    });

    return updated;
  }

  /**
   * 2. Update GST & Tax Configuration
   */
  async updateGstSettings(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: GstSettingsInput
  ): Promise<IBusiness> {
    const validatedData = gstSettingsSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const updated = await businessRepository.updateGstSettings(targetBusinessId, {
      registrationType: validatedData.registrationType,
      gstin: validatedData.gstin,
      gstinStatus: validatedData.gstin ? 'NOT_VALIDATED' : 'NOT_VALIDATED',
      stateCode: validatedData.stateCode,
      isComposition: validatedData.isComposition,
    });
    if (!updated) throw new NotFoundError('GST settings update failed');

    // Audit Event (Sanitized: NO full GSTIN in audit log metadata!)
    await auditLogRepository.log(targetBusinessId, {
      action: 'GST_SETTINGS_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { registrationType: validatedData.registrationType, stateCode: validatedData.stateCode },
    });

    return updated;
  }

  /**
   * 3. Update Bank Details
   */
  async updateBankDetails(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: BankDetailsInput
  ): Promise<IBusiness> {
    const validatedData = bankDetailsSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const updated = await businessRepository.updateBankDetails(targetBusinessId, validatedData);
    if (!updated) throw new NotFoundError('Bank details update failed');

    // Audit Event (Sanitized Law: NEVER log plain bank account numbers!)
    await auditLogRepository.log(targetBusinessId, {
      action: 'BANK_DETAILS_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { bankName: validatedData.bankName, accountUpdated: true },
    });

    return updated;
  }

  /**
   * 4. Update Branding Assets (Logo, Invoice Logo, Signature)
   */
  async updateBranding(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: BrandingInput
  ): Promise<IBusiness> {
    const validatedData = brandingSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const updated = await businessRepository.updateBranding(targetBusinessId, validatedData);
    if (!updated) throw new NotFoundError('Branding update failed');

    await auditLogRepository.log(targetBusinessId, {
      action: 'BRANDING_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { logoUpdated: Boolean(validatedData.logo?.secureUrl) },
    });

    return updated;
  }

  /**
   * 5. Update Invoice Configuration (Prefix, FY Format, Terms, Notes)
   */
  async updateInvoiceSettings(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: InvoiceSettingsInput
  ): Promise<IBusiness> {
    const validatedData = invoiceSettingsSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const updated = await businessRepository.updateInvoiceSettings(targetBusinessId, validatedData);
    if (!updated) throw new NotFoundError('Invoice settings update failed');

    await auditLogRepository.log(targetBusinessId, {
      action: 'INVOICE_SETTINGS_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { prefix: validatedData.prefix, financialYearFormat: validatedData.financialYearFormat },
    });

    return updated;
  }

  /**
   * 6. Update Payment Settings (Enabled modes, Custom labels, Display order)
   */
  async updatePaymentSettings(
    targetBusinessId: string | Types.ObjectId,
    authenticatedUserId: string | Types.ObjectId,
    data: PaymentSettingsInput
  ): Promise<IBusiness> {
    const validatedData = paymentSettingsSchema.parse(data);
    await this.verifyOwnership(targetBusinessId, authenticatedUserId);

    const updated = await businessRepository.updatePaymentSettings(targetBusinessId, validatedData);
    if (!updated) throw new NotFoundError('Payment settings update failed');

    await auditLogRepository.log(targetBusinessId, {
      action: 'PAYMENT_SETTINGS_UPDATED',
      resource: 'BUSINESS',
      resourceId: targetBusinessId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { totalModes: validatedData.length },
    });

    return updated;
  }

  /**
   * 7. Derive Onboarding Progress dynamically from persisted MongoDB document fields
   */
  async getDerivedOnboardingProgress(businessId: string | Types.ObjectId): Promise<DerivedOnboardingProgress> {
    const business = await this.getBusinessProfile(businessId);

    const items = {
      accountCreated: true,
      businessDetails: Boolean(business.legalName && business.phone && business.address && business.city),
      gstProfile: Boolean(business.gstSettings?.registrationType || business.gstRegistrationType),
      bankDetails: Boolean(business.bankDetails?.accountNumber && business.bankDetails?.ifscCode),
      logoUploaded: Boolean(business.branding?.logo?.secureUrl),
      invoiceSettingsConfigured: Boolean(business.invoiceSettings?.prefix),
      paymentSettingsConfigured: Boolean(business.paymentSettings && business.paymentSettings.length > 0),
    };

    const completedCount = Object.values(items).filter(Boolean).length;
    const totalCount = Object.keys(items).length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return { percentage, items };
  }
}

export const businessService = new BusinessService();

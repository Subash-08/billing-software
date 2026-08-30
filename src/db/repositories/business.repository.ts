import { Types } from 'mongoose';
import {
  BusinessModel,
  IBusiness,
  IBusinessGstSettings,
  IBusinessBankDetails,
  IBusinessBranding,
  IBusinessInvoiceSettings,
  IBusinessPaymentModeSetting,
} from '../models/business.model';

export class BusinessRepository {
  async findByUserId(userId: string | Types.ObjectId): Promise<IBusiness | null> {
    return BusinessModel.findOne({ userId: new Types.ObjectId(userId.toString()) }).exec();
  }

  async findById(businessId: string | Types.ObjectId): Promise<IBusiness | null> {
    return BusinessModel.findById(businessId).exec();
  }

  async create(data: Partial<IBusiness>): Promise<IBusiness> {
    const business = new BusinessModel(data);
    return business.save();
  }

  /**
   * Generic targeted update using $set operator
   */
  async update(businessId: string | Types.ObjectId, data: Partial<IBusiness>): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(businessId, { $set: data }, { new: true }).exec();
  }

  /**
   * Concurrency-safe targeted updates for individual settings domains
   */
  async updateGstSettings(
    businessId: string | Types.ObjectId,
    gstSettings: IBusinessGstSettings
  ): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(
      businessId,
      {
        $set: {
          gstSettings,
          gstRegistrationType: gstSettings.registrationType === 'UNREGISTERED' ? 'UNREGISTERED' : 'REGULAR',
          gstin: gstSettings.gstin,
          gstinStatus: gstSettings.gstinStatus,
          stateCode: gstSettings.stateCode,
        },
      },
      { new: true }
    ).exec();
  }

  async updateBankDetails(
    businessId: string | Types.ObjectId,
    bankDetails: IBusinessBankDetails
  ): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: { bankDetails } },
      { new: true }
    ).exec();
  }

  async updateBranding(
    businessId: string | Types.ObjectId,
    branding: IBusinessBranding
  ): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: { branding } },
      { new: true }
    ).exec();
  }

  async updateInvoiceSettings(
    businessId: string | Types.ObjectId,
    invoiceSettings: IBusinessInvoiceSettings
  ): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: { invoiceSettings } },
      { new: true }
    ).exec();
  }

  async updatePaymentSettings(
    businessId: string | Types.ObjectId,
    paymentSettings: IBusinessPaymentModeSetting[]
  ): Promise<IBusiness | null> {
    return BusinessModel.findByIdAndUpdate(
      businessId,
      { $set: { paymentSettings } },
      { new: true }
    ).exec();
  }
}

export const businessRepository = new BusinessRepository();

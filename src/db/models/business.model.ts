import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICloudinaryAsset {
  publicId?: string;
  secureUrl?: string;
  width?: number;
  height?: number;
  uploadedAt?: Date | string;
}

export interface IBusinessGstSettings {
  registrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'OTHER';
  gstin?: string;
  gstinStatus: 'NOT_VALIDATED' | 'VALID' | 'INVALID' | 'SUSPENDED' | 'CANCELLED' | 'UNKNOWN';
  stateCode: string;
  isComposition?: boolean;
}

export interface IBusinessBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountType?: 'SAVINGS' | 'CURRENT' | 'CC' | 'OD';
  upiId?: string;
}

export interface IBusinessBranding {
  logo?: ICloudinaryAsset;
  invoiceLogo?: ICloudinaryAsset;
  signature?: ICloudinaryAsset;
}

export interface IBusinessInvoiceSettings {
  prefix?: string;
  financialYearFormat?: 'YY-YY' | 'YYYY-YY' | 'NONE';
  numberingType?: 'AUTOMATIC' | 'MANUAL';
  defaultPaymentTermsDays?: number;
  defaultNotes?: string;
  defaultTermsAndConditions?: string;
  footerText?: string;
}

export interface IBusinessPaymentModeSetting {
  modeCode: string;
  enabled: boolean;
  customLabel?: string;
  displayOrder: number;
}

export interface IBusiness extends Document {
  userId: Types.ObjectId;
  legalName: string;
  tradeName?: string;
  businessType?: 'PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'OTHER';
  phone: string;
  email?: string;
  website?: string;
  gstRegistrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'SEZ' | 'OTHER';
  gstin?: string;
  gstinStatus: 'NOT_VALIDATED' | 'VALID' | 'INVALID' | 'SUSPENDED' | 'CANCELLED' | 'UNKNOWN';
  stateCode: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstSettings?: IBusinessGstSettings;
  bankDetails?: IBusinessBankDetails;
  branding?: IBusinessBranding;
  invoiceSettings?: IBusinessInvoiceSettings;
  paymentSettings?: IBusinessPaymentModeSetting[];
  createdAt: Date;
  updatedAt: Date;
}

const CloudinaryAssetSchema = new Schema<ICloudinaryAsset>(
  {
    publicId: String,
    secureUrl: String,
    width: Number,
    height: Number,
    uploadedAt: Date,
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusiness>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    legalName: {
      type: String,
      required: true,
      trim: true,
    },
    tradeName: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'OTHER'],
      default: 'PROPRIETORSHIP',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    gstRegistrationType: {
      type: String,
      enum: ['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ', 'OTHER'],
      default: 'REGULAR',
      required: true,
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    gstinStatus: {
      type: String,
      enum: ['NOT_VALIDATED', 'VALID', 'INVALID', 'SUSPENDED', 'CANCELLED', 'UNKNOWN'],
      default: 'NOT_VALIDATED',
      required: true,
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
    },
    address: String,
    city: String,
    state: String,
    pincode: String,
    gstSettings: {
      registrationType: {
        type: String,
        enum: ['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'OTHER'],
        default: 'REGULAR',
      },
      gstin: String,
      gstinStatus: {
        type: String,
        enum: ['NOT_VALIDATED', 'VALID', 'INVALID', 'SUSPENDED', 'CANCELLED', 'UNKNOWN'],
        default: 'NOT_VALIDATED',
      },
      stateCode: String,
      isComposition: Boolean,
    },
    bankDetails: {
      accountHolderName: String,
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      branch: String,
      accountType: {
        type: String,
        enum: ['SAVINGS', 'CURRENT', 'CC', 'OD'],
        default: 'CURRENT',
      },
      upiId: String,
    },
    branding: {
      logo: CloudinaryAssetSchema,
      invoiceLogo: CloudinaryAssetSchema,
      signature: CloudinaryAssetSchema,
    },
    invoiceSettings: {
      prefix: { type: String, default: 'INV' },
      financialYearFormat: { type: String, enum: ['YY-YY', 'YYYY-YY', 'NONE'], default: 'YY-YY' },
      numberingType: { type: String, enum: ['AUTOMATIC', 'MANUAL'], default: 'AUTOMATIC' },
      defaultPaymentTermsDays: { type: Number, default: 30 },
      defaultNotes: String,
      defaultTermsAndConditions: String,
      footerText: String,
    },
    paymentSettings: [
      {
        modeCode: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        customLabel: String,
        displayOrder: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const BusinessModel: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>('Business', BusinessSchema);

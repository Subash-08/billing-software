import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SupplierGstTreatment = 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'OVERSEAS';

export interface ISupplierAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  stateCode: string;
  pincode: string;
  country?: string;
}

export interface ISupplierBankDetails {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  branch?: string;
}

export interface ISupplier extends Document {
  businessId: Types.ObjectId;
  name: string;
  legalName?: string;
  gstin?: string;
  gstTreatment: SupplierGstTreatment;
  stateCode: string;
  phone?: string;
  email?: string;
  address: ISupplierAddress;
  bankDetails?: ISupplierBankDetails;
  outstandingBalancePaise: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierAddressSchema = new Schema<ISupplierAddress>({
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  district: { type: String, trim: true },
  state: { type: String, required: true, trim: true },
  stateCode: { type: String, required: true, trim: true, length: 2 },
  pincode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India' },
}, { _id: false });

const SupplierBankDetailsSchema = new Schema<ISupplierBankDetails>({
  accountName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  bankName: { type: String, trim: true },
  ifscCode: { type: String, trim: true, uppercase: true },
  branch: { type: String, trim: true },
}, { _id: false });

const SupplierSchema = new Schema<ISupplier>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    gstTreatment: {
      type: String,
      enum: ['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'OVERSEAS'],
      default: 'REGISTERED',
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: SupplierAddressSchema,
      required: true,
    },
    bankDetails: SupplierBankDetailsSchema,
    outstandingBalancePaise: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

SupplierSchema.index({ businessId: 1, name: 1 });
SupplierSchema.index({ businessId: 1, gstin: 1 });
SupplierSchema.index({ businessId: 1, status: 1 });

export const SupplierModel: Model<ISupplier> =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICustomerAddress {
  id?: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district?: string;
  state: string;
  stateCode: string;
  pincode: string;
  country?: string;
  isDefaultShipping?: boolean;
}

export interface IContactPerson {
  name: string;
  phone?: string;
  email?: string;
  designation?: string;
}

export interface ICustomer extends Document {
  businessId: Types.ObjectId;
  customerType: 'BUSINESS' | 'INDIVIDUAL';
  displayName: string;
  legalName?: string;
  phone: string;
  email?: string;
  gstTreatment: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'EXPORT' | 'OTHER' | 'REGULAR' | 'OVERSEAS';
  gstin?: string;
  stateCode: string;
  billingAddress: ICustomerAddress;
  shippingAddresses: ICustomerAddress[];
  contacts: IContactPerson[];
  creditBalance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export const CustomerAddressSchema = new Schema<ICustomerAddress>(
  {
    id: { type: String },
    label: { type: String, default: 'Default' },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    isDefaultShipping: { type: Boolean, default: false },
  },
  { _id: false }
);

export const ContactPersonSchema = new Schema<IContactPerson>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    designation: { type: String, trim: true },
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    customerType: {
      type: String,
      enum: ['BUSINESS', 'INDIVIDUAL'],
      default: 'BUSINESS',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
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
    gstTreatment: {
      type: String,
      enum: ['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'EXPORT', 'OTHER', 'REGULAR', 'OVERSEAS'],
      default: 'REGISTERED',
      required: true,
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    stateCode: {
      type: String,
      required: true,
      trim: true,
    },
    billingAddress: {
      type: CustomerAddressSchema,
      required: true,
    },
    shippingAddresses: {
      type: [CustomerAddressSchema],
      default: [],
    },
    contacts: {
      type: [ContactPersonSchema],
      default: [],
    },
    creditBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes per docs/30-index-strategy.md
CustomerSchema.index({ businessId: 1, displayName: 1 });
CustomerSchema.index({ businessId: 1, phone: 1 });
CustomerSchema.index({ businessId: 1, gstin: 1 });
CustomerSchema.index({ businessId: 1, status: 1 });

export const CustomerModel: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { TaxTreatmentType } from './product.model';

export interface IServiceItem extends Document {
  businessId: Types.ObjectId;
  type: 'SERVICE';
  name: string;
  code?: string;
  sacCode: string;
  billingUnit: string;
  rate: number;
  defaultGstRate: number;
  taxTreatment: TaxTreatmentType;
  categoryId?: Types.ObjectId;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IServiceItem>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['SERVICE'],
      default: 'SERVICE',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    sacCode: {
      type: String,
      required: true,
      trim: true,
    },
    billingUnit: {
      type: String,
      required: true,
      default: 'Job',
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    defaultGstRate: {
      type: Number,
      required: true,
      default: 18,
    },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    description: String,
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

ServiceSchema.index({ businessId: 1, name: 1 });
ServiceSchema.index({ businessId: 1, code: 1 }, { unique: true, sparse: true });
ServiceSchema.index({ businessId: 1, categoryId: 1 });
ServiceSchema.index({ businessId: 1, status: 1 });

export const ServiceModel: Model<IServiceItem> =
  mongoose.models.Service || mongoose.model<IServiceItem>('Service', ServiceSchema);

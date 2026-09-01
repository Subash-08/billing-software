import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type RecurringFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

export interface IRecurringItemTemplate {
  productId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  ratePaise: number;
  gstRate: number;
  priceMode: 'EXCLUSIVE' | 'INCLUSIVE';
}

export interface IRecurringInvoice extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  title: string;
  frequency: RecurringFrequency;
  intervalDays?: number;
  startDate: Date;
  endDate?: Date;
  nextRunDate: Date;
  lastRunDate?: Date;
  documentType: string;
  items: IRecurringItemTemplate[];
  autoIssue: boolean;
  generatedCount: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
}

const RecurringItemSchema = new Schema<IRecurringItemTemplate>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true, default: 'GOODS' },
  name: { type: String, required: true, trim: true },
  description: String,
  hsnSacCode: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unit: { type: String, required: true, default: 'PCS' },
  ratePaise: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  priceMode: { type: String, enum: ['EXCLUSIVE', 'INCLUSIVE'], default: 'EXCLUSIVE' },
}, { _id: false });

const RecurringInvoiceSchema = new Schema<IRecurringInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
      required: true,
      default: 'MONTHLY',
    },
    intervalDays: Number,
    startDate: { type: Date, required: true, default: Date.now },
    endDate: Date,
    nextRunDate: { type: Date, required: true, index: true },
    lastRunDate: Date,
    documentType: { type: String, default: 'TAX_INVOICE' },
    items: [RecurringItemSchema],
    autoIssue: { type: Boolean, default: false },
    generatedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

RecurringInvoiceSchema.index({ businessId: 1, nextRunDate: 1, status: 1 });

export const RecurringInvoiceModel: Model<IRecurringInvoice> =
  mongoose.models.RecurringInvoice || mongoose.model<IRecurringInvoice>('RecurringInvoice', RecurringInvoiceSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDebitNoteItemSnapshot {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  uqc: string;
  rate: number; // in paise
  taxableAmount: number; // in paise
  gstRate: number; // e.g. 18
  cgstAmount: number; // in paise
  sgstAmount: number; // in paise
  igstAmount: number; // in paise
  totalAmount: number; // in paise
}

export interface IDebitNote extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  originalInvoiceId?: Types.ObjectId;
  debitNoteNumber: string;
  financialYear: string;
  debitNoteDate: Date;
  reason: 'ADDITIONAL_CHARGES' | 'UNDERBILLING_CORRECTION' | 'POST_INVOICE_PRICE_INCREASE' | 'OTHER';
  reasonNotes?: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  items: IDebitNoteItemSnapshot[];
  subTotal: number; // in paise
  totalTaxable: number; // in paise
  totalCgst: number; // in paise
  totalSgst: number; // in paise
  totalIgst: number; // in paise
  roundOff: number; // in paise
  grandTotal: number; // in paise
  createdAt: Date;
  updatedAt: Date;
}

const DebitNoteSchema = new Schema<IDebitNote>(
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
    originalInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    debitNoteNumber: {
      type: String,
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    debitNoteDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: {
      type: String,
      enum: ['ADDITIONAL_CHARGES', 'UNDERBILLING_CORRECTION', 'POST_INVOICE_PRICE_INCREASE', 'OTHER'],
      required: true,
      default: 'ADDITIONAL_CHARGES',
    },
    reasonNotes: String,
    status: {
      type: String,
      enum: ['DRAFT', 'ISSUED', 'CANCELLED'],
      default: 'DRAFT',
      index: true,
    },
    items: [
      {
        itemId: Schema.Types.ObjectId,
        itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true },
        name: { type: String, required: true },
        hsnSacCode: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        uqc: { type: String, required: true },
        rate: { type: Number, required: true },
        taxableAmount: { type: Number, required: true },
        gstRate: { type: Number, required: true },
        cgstAmount: { type: Number, required: true, default: 0 },
        sgstAmount: { type: Number, required: true, default: 0 },
        igstAmount: { type: Number, required: true, default: 0 },
        totalAmount: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true, default: 0 },
    totalTaxable: { type: Number, required: true, default: 0 },
    totalCgst: { type: Number, required: true, default: 0 },
    totalSgst: { type: Number, required: true, default: 0 },
    totalIgst: { type: Number, required: true, default: 0 },
    roundOff: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

DebitNoteSchema.index({ businessId: 1, debitNoteNumber: 1, financialYear: 1 }, { unique: true });

export const DebitNoteModel: Model<IDebitNote> =
  mongoose.models.DebitNote || mongoose.model<IDebitNote>('DebitNote', DebitNoteSchema);

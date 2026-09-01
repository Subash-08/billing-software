import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICreditNoteItemSnapshot {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  freeQuantity?: number;
  unit: string;
  uqc: string;
  enteredRatePaise: number;
  isPriceInclusiveOfGst?: boolean;
  taxableAmountPaise: number;
  gstRate: number;
  cgstRate?: number;
  sgstRate?: number;
  utgstRate?: number;   // Added: mirrors IInvoiceItemSnapshot
  igstRate?: number;
  taxRateId?: string;
  taxRateVersion?: string;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  utgstAmountPaise?: number; // Added: mirrors IInvoiceItemSnapshot
  igstAmountPaise: number;
  cessRate?: number;         // Added: mirrors IInvoiceItemSnapshot
  cessAmountPaise?: number;  // Added: mirrors IInvoiceItemSnapshot
  totalAmountPaise: number;
}

export interface ICreditNote extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  // Original document lineage (populated at creation time from invoice snapshot)
  originalInvoiceId?: Types.ObjectId;
  originalInvoiceNumber?: string;    // Denormalized snapshot of original number
  originalInvoiceDate?: Date;        // Denormalized snapshot of original date
  originalFinancialYear?: string;    // e.g. '2025-26'
  originalDocumentType?: string;     // e.g. 'TAX_INVOICE'
  creditNoteNumber: string;
  financialYear: string;
  creditNoteDate: Date;
  reason: 'SALES_RETURN' | 'RATE_REDUCTION' | 'POST_SALE_DISCOUNT' | 'CANCELLATION' | 'OTHER';
  reasonNotes?: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  items: ICreditNoteItemSnapshot[];
  subTotal: number; // in paise
  totalTaxable: number; // in paise
  totalCgst: number; // in paise
  totalSgst: number; // in paise
  totalUtgst: number; // in paise (added)
  totalIgst: number; // in paise
  totalCess: number; // in paise (added)
  roundOff: number; // in paise
  grandTotal: number; // in paise
  // Compliance policy version stamps (recorded at issuance)
  hsnPolicyVersion?: string;
  gstrClassificationPolicyVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
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
    creditNoteNumber: {
      type: String,
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    creditNoteDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: {
      type: String,
      enum: ['SALES_RETURN', 'RATE_REDUCTION', 'POST_SALE_DISCOUNT', 'CANCELLATION', 'OTHER'],
      required: true,
      default: 'SALES_RETURN',
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
        itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true, default: 'GOODS' },
        name: { type: String, required: true },
        description: String,
        hsnCode: String,
        sacCode: String,
        quantity: { type: Number, required: true },
        freeQuantity: { type: Number, default: 0 },
        unit: { type: String, required: true },
        uqc: { type: String, required: true },
        enteredRatePaise: { type: Number, required: true },
        isPriceInclusiveOfGst: { type: Boolean, default: false },
        taxableAmountPaise: { type: Number, required: true },
        gstRate: { type: Number, required: true },
        cgstRate: { type: Number, default: 0 },
        sgstRate: { type: Number, default: 0 },
        utgstRate: { type: Number, default: 0 },
        igstRate: { type: Number, default: 0 },
        taxRateId: String,
        taxRateVersion: String,
        cgstAmountPaise: { type: Number, required: true, default: 0 },
        sgstAmountPaise: { type: Number, required: true, default: 0 },
        utgstAmountPaise: { type: Number, default: 0 },
        igstAmountPaise: { type: Number, required: true, default: 0 },
        cessRate: { type: Number, default: 0 },
        cessAmountPaise: { type: Number, default: 0 },
        totalAmountPaise: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true, default: 0 },
    totalTaxable: { type: Number, required: true, default: 0 },
    totalCgst: { type: Number, required: true, default: 0 },
    totalSgst: { type: Number, required: true, default: 0 },
    totalUtgst: { type: Number, required: true, default: 0 },
    totalIgst: { type: Number, required: true, default: 0 },
    totalCess: { type: Number, required: true, default: 0 },
    roundOff: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    // Lineage fields (denormalized from original invoice at CN creation)
    originalInvoiceNumber: String,
    originalInvoiceDate: Date,
    originalFinancialYear: String,
    originalDocumentType: String,
    // Policy version stamps
    hsnPolicyVersion: String,
    gstrClassificationPolicyVersion: String,
  },
  { timestamps: true }
);

CreditNoteSchema.index({ businessId: 1, creditNoteNumber: 1, financialYear: 1 }, { unique: true });

export const CreditNoteModel: Model<ICreditNote> =
  mongoose.models.CreditNote || mongoose.model<ICreditNote>('CreditNote', CreditNoteSchema);

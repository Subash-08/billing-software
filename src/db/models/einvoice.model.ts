import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IEInvoice extends Document {
  businessId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  status: 'NOT_REQUIRED' | 'NOT_GENERATED' | 'VALIDATING' | 'SUBMITTING' | 'GENERATED' | 'REJECTED' | 'CANCELLED';
  irn?: string;
  irpProvider?: string;
  schemaVersion?: string;
  signedQrCode?: string;
  submittedAt?: Date;
  generatedAt?: Date;
  cancelledAt?: Date;
  errorMessage?: string;
}

const EInvoiceSchema = new Schema<IEInvoice>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, unique: true },
    status: {
      type: String,
      enum: ['NOT_REQUIRED', 'NOT_GENERATED', 'VALIDATING', 'SUBMITTING', 'GENERATED', 'REJECTED', 'CANCELLED'],
      default: 'NOT_GENERATED',
      required: true,
    },
    irn: { type: String, unique: true, sparse: true },
    irpProvider: String,
    schemaVersion: String,
    signedQrCode: String,
    submittedAt: Date,
    generatedAt: Date,
    cancelledAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

EInvoiceSchema.index({ businessId: 1, invoiceId: 1 }, { unique: true });

export const EInvoiceModel: Model<IEInvoice> =
  mongoose.models.EInvoice || mongoose.model<IEInvoice>('EInvoice', EInvoiceSchema);

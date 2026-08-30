import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IReceipt extends Document {
  businessId: Types.ObjectId;
  paymentId: Types.ObjectId;
  receiptNumber: string;
  pdfUrl?: string;
  generatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    receiptNumber: { type: String, required: true },
    pdfUrl: String,
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ReceiptSchema.index({ businessId: 1, receiptNumber: 1 }, { unique: true });

export const ReceiptModel: Model<IReceipt> =
  mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema);

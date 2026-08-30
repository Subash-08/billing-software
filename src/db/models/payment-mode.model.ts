import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentModeMaster extends Document {
  code: string;
  name: string;
  category: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE';
}

const PaymentModeSchema = new Schema<IPaymentModeMaster>(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'CUSTOM'],
      required: true,
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const PaymentModeModel: Model<IPaymentModeMaster> =
  mongoose.models.PaymentMode || mongoose.model<IPaymentModeMaster>('PaymentMode', PaymentModeSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefund extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  paymentId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  refundNumber: string;
  refundDate: Date;
  amountPaise: number;
  refundMode: string;
  referenceNumber?: string;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'CANCELLED';
  createdByUserId: Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
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
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    refundNumber: {
      type: String,
      required: true,
    },
    refundDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    refundMode: {
      type: String,
      required: true,
      default: 'BANK_TRANSFER',
    },
    referenceNumber: String,
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSED', 'CANCELLED'],
      default: 'PROCESSED',
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedAt: Date,
  },
  { timestamps: true }
);

RefundSchema.index({ businessId: 1, refundNumber: 1 }, { unique: true });

export const RefundModel: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>('Refund', RefundSchema);

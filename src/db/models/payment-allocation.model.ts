/**
 * PaymentAllocation Model — Immutable Ledger Event
 * src/db/models/payment-allocation.model.ts
 *
 * Rule 19 [A1]: Allocations are a separate collection — never embedded in Payment.
 * Each document is created once and never mutated. Reversal creates PaymentReversal
 * documents that reduce the effective active amount.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPaymentAllocation extends Document {
  businessId: Types.ObjectId;
  paymentId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  customerId: Types.ObjectId;
  allocatedAmountPaise: number;  // Integer paise; IMMUTABLE
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAllocationSchema = new Schema<IPaymentAllocation>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    allocatedAmountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true }
);

// Query active allocations for a payment
PaymentAllocationSchema.index({ businessId: 1, paymentId: 1 });
// Authoritative cancellation check: count active allocations by invoice [C1]
PaymentAllocationSchema.index({ businessId: 1, invoiceId: 1 });
// Customer-level queries
PaymentAllocationSchema.index({ businessId: 1, customerId: 1 });

export const PaymentAllocationModel: Model<IPaymentAllocation> =
  mongoose.models.PaymentAllocation ||
  mongoose.model<IPaymentAllocation>('PaymentAllocation', PaymentAllocationSchema);

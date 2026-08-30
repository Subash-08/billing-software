/**
 * PaymentReversal Model — Append-Only; Multiple Per Allocation [A3]
 * src/db/models/payment-reversal.model.ts
 *
 * Rule 20: Multiple PaymentReversal documents MAY reference the same allocationId.
 * No unique index on allocationId — the ceiling is enforced atomically in the transaction.
 *
 * Rule 20 / A3: Every reversal request carries reversalIdempotencyKey + reversalRequestHash.
 * Unique index on { businessId, reversalIdempotencyKey }.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPaymentReversal extends Document {
  businessId: Types.ObjectId;
  paymentId: Types.ObjectId;
  allocationId: Types.ObjectId;       // NOT unique — multiple reversals per allocation allowed
  reversedAmountPaise: number;        // Integer paise; SUM per allocationId <= allocation amount
  reversalIdempotencyKey: string;     // Unique per businessId [A3]
  reversalRequestHash: string;        // Canonical payload fingerprint [A3]
  reason: string;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentReversalSchema = new Schema<IPaymentReversal>(
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
    allocationId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentAllocation',
      required: true,
    },
    reversedAmountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    reversalIdempotencyKey: {
      type: String,
      required: true,
    },
    reversalRequestHash: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Reversal idempotency: unique per business [A3]
PaymentReversalSchema.index(
  { businessId: 1, reversalIdempotencyKey: 1 },
  { unique: true }
);

// Query all reversals for an allocation (for ceiling check) — NOT unique
PaymentReversalSchema.index({ businessId: 1, allocationId: 1 });

// Query all reversals for a payment (for status derivation)
PaymentReversalSchema.index({ businessId: 1, paymentId: 1 });

export const PaymentReversalModel: Model<IPaymentReversal> =
  mongoose.models.PaymentReversal ||
  mongoose.model<IPaymentReversal>('PaymentReversal', PaymentReversalSchema);

/**
 * Payment Model — Immutable Financial Event [A1]
 * src/db/models/payment.model.ts
 *
 * Rule 19: Payment is a pure financial event. No allocations array.
 * Allocations live entirely in PaymentAllocationModel.
 *
 * Payment.status is a DERIVED PROJECTION computed from PaymentReversal events.
 * Never mutate status to "apply" a reversal. Use derivePaymentStatus() from
 * the settlement engine instead.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICustomerSnapshot {
  customerId: Types.ObjectId;
  displayName: string;
  phone: string;
  email?: string;
  gstin?: string;
  billingAddressLine: string;
  billingCity: string;
  billingState: string;
  billingStateCode: string;
  billingPincode?: string;
}

export const CustomerSnapshotSchema = new Schema<ICustomerSnapshot>(
  {
    customerId: { type: Schema.Types.ObjectId, required: true },
    displayName: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    gstin: String,
    billingAddressLine: { type: String, required: true },
    billingCity: { type: String, required: true },
    billingState: { type: String, required: true },
    billingStateCode: { type: String, required: true },
    billingPincode: String,
  },
  { _id: false }
);

export interface IPaymentModeSnapshot {
  modeId: Types.ObjectId;
  code: string;
  name: string;
}

export const PaymentModeSnapshotSchema = new Schema<IPaymentModeSnapshot>(
  {
    modeId: { type: Schema.Types.ObjectId, required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

export interface IPayment extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  customerSnapshot: ICustomerSnapshot;  // Immutable at creation
  receiptNumber: string;                // From DocumentSequence; unique within businessId+FY
  financialYear: string;                // e.g. "2026-27"
  paymentDate: string;                  // YYYY-MM-DD Asia/Kolkata [Rule 26]
  amountPaise: number;                  // Integer paise; IMMUTABLE after creation
  paymentModeId: Types.ObjectId;        // FK to PaymentModeModel [Rule 25]
  paymentModeSnapshot: IPaymentModeSnapshot; // Immutable snapshot at payment creation [Point 7]
  referenceNumber?: string;
  idempotencyKey: string;               // Unique per businessId
  requestHash: string;                  // Canonical payload fingerprint for idempotency race
  notes?: string;
  // Derived projection — recomputed from PaymentReversal events; never authoritative source
  status: 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REVERSED';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
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
    customerSnapshot: { type: CustomerSnapshotSchema, required: true },
    receiptNumber: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true },
    paymentDate: { type: String, required: true },  // YYYY-MM-DD stored as string
    amountPaise: { type: Number, required: true, min: 1 },
    paymentModeId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentMode',
      required: true,
    },
    paymentModeSnapshot: { type: PaymentModeSnapshotSchema, required: true },
    referenceNumber: { type: String, trim: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    notes: { type: String, trim: true },
    // Derived projection: updated asynchronously after reversal events
    status: {
      type: String,
      enum: ['COMPLETED', 'REVERSED', 'PARTIALLY_REVERSED'],
      default: 'COMPLETED',
      required: true,
    },
  },
  { timestamps: true }
);

// Idempotency: unique per business [Rule 19 / A1]
PaymentSchema.index({ businessId: 1, idempotencyKey: 1 }, { unique: true });
// Receipt number: unique per business [Rule 29]
PaymentSchema.index({ businessId: 1, receiptNumber: 1 }, { unique: true });
// Query by customer and date
PaymentSchema.index({ businessId: 1, customerId: 1, paymentDate: -1 });
// Query by date for reporting
PaymentSchema.index({ businessId: 1, paymentDate: -1 });

export const PaymentModel: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

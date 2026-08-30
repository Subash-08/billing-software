/**
 * CustomerCreditLedger Model — Append-Only Events [Rule 21]
 * src/db/models/customer-credit-ledger.model.ts
 *
 * Rule 21: This collection is the AUTHORITATIVE source for customer credit.
 * Customer.creditBalance is a DERIVED PROJECTION. Reconciliation may repair
 * the projection but NEVER modifies ledger events.
 *
 * Three invariants:
 * - Invariant B: SUM(DEBIT_ALLOCATION for sourceCreditId) <= source.amountPaise
 * - Invariant C: SUM(CREDIT) - SUM(DEBIT_ALLOCATION) + SUM(REVERSAL) >= 0
 *
 * Rule 23: Every DEBIT_ALLOCATION MUST reference sourceCreditId.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type CreditEventType = 'CREDIT' | 'DEBIT_ALLOCATION' | 'REVERSAL';

export interface ICustomerCreditLedger extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  paymentId: Types.ObjectId;
  type: CreditEventType;
  amountPaise: number;              // Always positive; direction determined by type
  sourceCreditId?: Types.ObjectId;  // Required for DEBIT_ALLOCATION; refs originating CREDIT._id
  invoiceId?: Types.ObjectId;       // Set when DEBIT_ALLOCATION is consumed against an invoice
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerCreditLedgerSchema = new Schema<ICustomerCreditLedger>(
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
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT_ALLOCATION', 'REVERSAL'],
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    sourceCreditId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerCreditLedger',
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Primary query: customer credit history in chronological order
CustomerCreditLedgerSchema.index({ businessId: 1, customerId: 1, createdAt: 1 });

// Invariant B enforcement: sum DEBIT_ALLOCATION events for a source credit
CustomerCreditLedgerSchema.index({ businessId: 1, sourceCreditId: 1 });

// Payment-level credit queries
CustomerCreditLedgerSchema.index({ businessId: 1, paymentId: 1 });

export const CustomerCreditLedgerModel: Model<ICustomerCreditLedger> =
  mongoose.models.CustomerCreditLedger ||
  mongoose.model<ICustomerCreditLedger>('CustomerCreditLedger', CustomerCreditLedgerSchema);

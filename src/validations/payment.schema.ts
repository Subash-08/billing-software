/**
 * Payment Validation Schema — Zod
 * src/validations/payment.schema.ts
 *
 * Rule 15: Zod validation on all API endpoints and client forms.
 * Rule 26: All business dates are YYYY-MM-DD strings.
 * Rule 19: amountPaise is a server-side integer after conversion.
 *
 * Receipt number is generated server-side inside the transaction (Rule 29).
 * Never generated on form open.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared Refinements
// ---------------------------------------------------------------------------

const BusinessDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00+05:30`);
    return !isNaN(d.getTime());
  }, 'Invalid calendar date');

// ---------------------------------------------------------------------------
// Record Payment
// ---------------------------------------------------------------------------

/**
 * A single explicit allocation within a payment.
 * allocationAmountPaise comes from the UI (converted from rupees by the form).
 */
export const ExplicitAllocationSchema = z.object({
  invoiceId: z.string().length(24, 'Invalid invoice ID'),
  allocationAmountPaise: z
    .number()
    .int('Allocation amount must be an integer (paise)')
    .positive('Allocation amount must be positive'),
});

/**
 * RecordPayment request. Sent by the client; validated server-side before any DB access.
 */
export const RecordPaymentSchema = z.object({
  customerId: z.string().length(24, 'Invalid customer ID'),
  paymentDate: BusinessDateString,
  amountPaise: z
    .number()
    .int('Payment amount must be an integer (paise)')
    .positive('Payment amount must be positive'),
  paymentModeId: z.string().length(24, 'Invalid payment mode ID'),
  referenceNumber: z.string().max(100).optional(),
  idempotencyKey: z.string().min(1, 'Idempotency key is required').max(128),
  requestHash: z.string().min(1, 'Request hash is required').max(256),
  notes: z.string().max(500).optional(),
  // Optional explicit allocations; if empty → FIFO auto-allocation
  allocations: z.array(ExplicitAllocationSchema).optional().default([]),
  // Flag: if true, do not auto-allocate; treat as pure advance/on-account payment
  onAccountOnly: z.boolean().optional().default(false),
});

export type RecordPaymentInput = z.input<typeof RecordPaymentSchema>;
export type RecordPaymentParsedOutput = z.infer<typeof RecordPaymentSchema>;

// ---------------------------------------------------------------------------
// Reverse Payment
// ---------------------------------------------------------------------------

export const ReversePaymentSchema = z.object({
  allocationId: z.string().length(24, 'Invalid allocation ID'),
  reversedAmountPaise: z
    .number()
    .int('Reversal amount must be an integer (paise)')
    .positive('Reversal amount must be positive'),
  reason: z.string().min(1, 'Reason is required').max(500),
  reversalIdempotencyKey: z.string().min(1).max(128),
  reversalRequestHash: z.string().min(1).max(256),
});

export type ReversePaymentInput = z.infer<typeof ReversePaymentSchema>;

// ---------------------------------------------------------------------------
// Outstanding / Aging Query
// ---------------------------------------------------------------------------

export const OutstandingQuerySchema = z.object({
  customerId: z.string().length(24).optional(),
  reportDate: BusinessDateString.optional(),  // Defaults to today (IST) if omitted
});

export type OutstandingQueryInput = z.infer<typeof OutstandingQuerySchema>;

// ---------------------------------------------------------------------------
// Customer Statement Query
// ---------------------------------------------------------------------------

export const CustomerStatementQuerySchema = z.object({
  fromDate: BusinessDateString.optional(),
  toDate: BusinessDateString.optional(),
});

export type CustomerStatementQueryInput = z.infer<typeof CustomerStatementQuerySchema>;

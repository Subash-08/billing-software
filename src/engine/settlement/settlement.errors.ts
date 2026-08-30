/**
 * Settlement Engine — Domain Errors
 * src/engine/settlement/settlement.errors.ts
 *
 * All settlement domain errors. These are pure domain types — no HTTP concerns.
 * API routes translate these to appropriate HTTP responses.
 */

import { ApplicationError, ConflictError, BusinessRuleError, NotFoundError } from '@/lib/errors';

// ---------------------------------------------------------------------------
// Payment Recording
// ---------------------------------------------------------------------------

export class InvalidPaymentAmountError extends BusinessRuleError {
  constructor(message = 'Payment amount must be a positive safe integer in paise.') {
    super(message, { code: 'INVALID_PAYMENT_AMOUNT' });
  }
}

export class UnsafeIntegerError extends BusinessRuleError {
  constructor(field: string, value: number) {
    super(`${field} value ${value} is not a safe integer.`, { code: 'UNSAFE_INTEGER', field, value });
  }
}

export class CustomerNotFoundError extends NotFoundError {
  constructor(customerId: string) {
    super(`Customer '${customerId}' not found or does not belong to this business.`);
  }
}

export class InvoiceNotFoundError extends NotFoundError {
  constructor(invoiceId: string) {
    super(`Invoice '${invoiceId}' not found or does not belong to this business.`);
  }
}

export class PaymentCustomerMismatchError extends BusinessRuleError {
  constructor(invoiceId: string) {
    super(
      `Invoice '${invoiceId}' belongs to a different customer than the payment.`,
      { code: 'PAYMENT_CUSTOMER_MISMATCH' }
    );
  }
}

export class InvalidInvoiceStateError extends BusinessRuleError {
  constructor(invoiceId: string, state: string) {
    super(
      `Invoice '${invoiceId}' is in state '${state}' and cannot receive payment allocation.`,
      { code: 'INVALID_INVOICE_STATE', invoiceId, state }
    );
  }
}

export class PaymentAllocationExceedsOutstandingError extends BusinessRuleError {
  constructor(invoiceId: string, requested: number, available: number) {
    super(
      `Allocation of ${requested} paise exceeds outstanding balance of ${available} paise on invoice '${invoiceId}'.`,
      { code: 'ALLOCATION_EXCEEDS_OUTSTANDING', invoiceId, requested, available }
    );
  }
}

export class PaymentDatePrecedesInvoiceError extends BusinessRuleError {
  constructor(paymentDate: string, invoiceDate: string, invoiceId: string) {
    super(
      `Payment date '${paymentDate}' precedes invoice date '${invoiceDate}' on invoice '${invoiceId}'. ` +
      `Record as advance payment (no invoice allocation) instead.`,
      { code: 'PAYMENT_DATE_PRECEDES_INVOICE', paymentDate, invoiceDate, invoiceId }
    );
  }
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

export class IdempotencyConflictError extends ConflictError {
  constructor(idempotencyKey: string) {
    super(
      `Idempotency key '${idempotencyKey}' was already used with a different payload. ` +
      `This key cannot be reused for a different payment.`
    );
  }
}

// ---------------------------------------------------------------------------
// Payment Mode
// ---------------------------------------------------------------------------

export class PaymentModeNotFoundError extends NotFoundError {
  constructor(paymentModeId: string) {
    super(`Payment mode '${paymentModeId}' not found.`);
  }
}

export class InactivePaymentModeError extends BusinessRuleError {
  constructor(paymentModeName: string) {
    super(
      `Payment mode '${paymentModeName}' is currently inactive and cannot be used for new payments.`,
      { code: 'INACTIVE_PAYMENT_MODE' }
    );
  }
}

// ---------------------------------------------------------------------------
// Reversal
// ---------------------------------------------------------------------------

export class ReversalIdempotencyConflictError extends ConflictError {
  constructor(reversalIdempotencyKey: string) {
    super(
      `Reversal idempotency key '${reversalIdempotencyKey}' was already used with a different payload.`
    );
  }
}

export class ReversalExceedsAllocationError extends BusinessRuleError {
  constructor(allocationId: string, requested: number, remaining: number) {
    super(
      `Reversal of ${requested} paise exceeds remaining active allocation of ${remaining} paise for allocation '${allocationId}'.`,
      { code: 'REVERSAL_EXCEEDS_ALLOCATION', allocationId, requested, remaining }
    );
  }
}

export class PaymentCannotBeReversedAfterCreditConsumptionError extends BusinessRuleError {
  constructor(paymentId: string) {
    super(
      `Payment '${paymentId}' cannot be reversed because its on-account credit has been partially or fully consumed. ` +
      `Reverse the downstream credit consumption first.`,
      { code: 'PAYMENT_CREDIT_ALREADY_CONSUMED', paymentId }
    );
  }
}

// ---------------------------------------------------------------------------
// Credit Ledger
// ---------------------------------------------------------------------------

export class InsufficientCreditError extends BusinessRuleError {
  constructor(customerId: string, requested: number, available: number) {
    super(
      `Customer '${customerId}' has insufficient credit. Requested: ${requested} paise, Available: ${available} paise.`,
      { code: 'INSUFFICIENT_CREDIT', customerId, requested, available }
    );
  }
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

export class InvoiceHasActivePaymentsError extends ConflictError {
  constructor(invoiceIdentifier?: string) {
    const isHumanNumber = invoiceIdentifier && !invoiceIdentifier.match(/^[0-9a-fA-F]{24}$/);
    const label = isHumanNumber ? `'${invoiceIdentifier}' ` : '';
    super(
      `Invoice ${label}has active payment receipts recorded and cannot be cancelled directly. Please issue a Credit Note / Sales Return to adjust the balance.`
    );
  }
}

// ---------------------------------------------------------------------------
// Customer Lifecycle
// ---------------------------------------------------------------------------

export class CustomerHasTransactionsError extends BusinessRuleError {
  constructor(customerId: string) {
    super(
      `Customer '${customerId}' has financial transactions (invoices, payments, or credit ledger entries) ` +
      `and cannot be hard-deleted. Deactivate/archive the customer instead.`,
      { code: 'CUSTOMER_HAS_TRANSACTIONS', customerId }
    );
  }
}

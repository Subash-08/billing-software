import { ApplicationError } from '@/lib/errors';

export class GstEngineError extends ApplicationError {
  constructor(message: string, code = 'GST_ENGINE_ERROR', statusCode = 400, details?: unknown) {
    super(message, code, statusCode, details);
  }
}

export class InvalidStateCodeError extends GstEngineError {
  constructor(stateCode: string) {
    super(`Invalid GST state code '${stateCode}'. Must be a 2-digit numeric code from 01 to 38.`, 'INVALID_STATE_CODE', 400);
  }
}

export class NegativeTaxableAmountError extends GstEngineError {
  constructor(amount: number) {
    super(`Taxable paise amount must be a non-negative safe integer. Received: ${amount}`, 'NEGATIVE_TAXABLE_AMOUNT', 400);
  }
}

export class UnsafeIntegerError extends GstEngineError {
  constructor(fieldName: string, value: unknown) {
    super(`Field '${fieldName}' must be a valid safe integer. Received: ${value}`, 'UNSAFE_INTEGER_ERROR', 400);
  }
}

export class InvalidQuantityError extends GstEngineError {
  constructor(message: string) {
    super(message, 'INVALID_QUANTITY_ERROR', 400);
  }
}

export class MissingQuantityForCessError extends GstEngineError {
  constructor() {
    super('Quantity is mandatory when specific per-unit Cess (cessAmountPerUnitPaise) is specified.', 'MISSING_QUANTITY_FOR_CESS', 400);
  }
}

export class TaxRateNotFoundError extends GstEngineError {
  constructor(rate: number, date?: Date) {
    const dateStr = date ? date.toISOString().split('T')[0] : 'current';
    super(`No active TaxRate master record found for rate ${rate}% on date ${dateStr}.`, 'TAX_RATE_NOT_FOUND', 404);
  }
}

export class TaxRateConfigurationError extends GstEngineError {
  constructor(message: string) {
    super(message, 'TAX_RATE_CONFIGURATION_ERROR', 500);
  }
}

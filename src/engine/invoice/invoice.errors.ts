import { ApplicationError } from '@/lib/errors';
export { UnsafeIntegerError } from '../gst/gst.errors';

export class InvoiceEngineError extends ApplicationError {
  constructor(message: string, code = 'INVOICE_ENGINE_ERROR', statusCode = 400, details?: unknown) {
    super(message, code, statusCode, details);
  }
}

export class EmptyInvoiceItemsError extends InvoiceEngineError {
  constructor() {
    super('Invoice calculation requires at least one line item.', 'EMPTY_INVOICE_ITEMS', 400);
  }
}

export class DiscountExceedsLineValueError extends InvoiceEngineError {
  constructor(itemName: string, discountPaise: number, grossPaise: number) {
    super(
      `Line discount (${discountPaise} paise) for item '${itemName}' cannot exceed gross line value (${grossPaise} paise).`,
      'DISCOUNT_EXCEEDS_LINE_VALUE',
      400
    );
  }
}

export class DiscountExceedsInvoiceValueError extends InvoiceEngineError {
  constructor(discountPaise: number, subtotalPaise: number) {
    super(
      `Total invoice discount (${discountPaise} paise) cannot exceed eligible invoice value (${subtotalPaise} paise).`,
      'DISCOUNT_EXCEEDS_INVOICE_VALUE',
      400
    );
  }
}

export class MissingAdditionalChargeTaxRateError extends InvoiceEngineError {
  constructor(chargeName: string) {
    super(
      `Taxable additional charge '${chargeName}' requires a valid resolvedTaxRate.`,
      'MISSING_ADDITIONAL_CHARGE_TAX_RATE',
      400
    );
  }
}

export class InvalidInvoiceInputError extends InvoiceEngineError {
  constructor(message: string) {
    super(message, 'INVALID_INVOICE_INPUT', 400);
  }
}

import { z } from 'zod';

export const InvoiceLineItemInputSchema = z
  .object({
    itemId: z.string().optional(),
    itemType: z.enum(['GOODS', 'SERVICES']).optional().default('GOODS'),
    name: z.string().min(1, 'Item name is required'),
    description: z.string().optional(),
    hsnCode: z.string().trim().optional(),
    sacCode: z.string().trim().optional(),
    hsnSacCode: z.string().trim().optional(),
    quantity: z.number().positive('Quantity must be greater than 0'),
    freeQuantity: z.number().nonnegative().optional().default(0),
    unit: z.string().min(1, 'Unit is required'),
    uqc: z.string().min(1, 'UQC is required'),
    rate: z.number().nonnegative('Rate amount must be non-negative').optional(),
    enteredRate: z.number().nonnegative('Entered rate must be non-negative').optional(),
    isPriceInclusiveOfGst: z.boolean().optional().default(false),
    lineDiscount: z
      .object({
        type: z.enum(['FIXED', 'PERCENTAGE']),
        value: z.number().nonnegative(),
        taxTreatment: z.enum(['REDUCE_TAXABLE_VALUE', 'COMMERCIAL_ONLY']).optional().default('REDUCE_TAXABLE_VALUE'),
      })
      .optional(),
    taxTreatment: z.enum(['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED']).optional().default('TAXABLE'),
    gstRate: z.number().nonnegative().optional(),
    cessAmountPerUnit: z.number().nonnegative().optional(),
  })
  .refine(
    (data) => {
      const code = data.hsnCode || data.sacCode || data.hsnSacCode;
      if (!code) return true; // Optional code at input level if master fallback will occur
      if (data.itemType === 'SERVICES' && data.hsnCode && !data.sacCode) {
        return false; // HSN on SERVICES is invalid
      }
      if (data.itemType === 'GOODS' && data.sacCode && !data.hsnCode) {
        return false; // SAC on GOODS is invalid
      }
      return true;
    },
    {
      message: 'GOODS items must use HSN code and SERVICES items must use SAC code.',
      path: ['hsnCode'],
    }
  );

export const AdditionalChargeInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Charge name is required'),
  amount: z.number().nonnegative('Charge amount must be non-negative'), // Amount in Rupees
  valuationTreatment: z.enum(['TAXABLE', 'NON_TAXABLE']),
  taxTreatment: z.enum(['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED']).optional().default('TAXABLE'),
  gstRate: z.number().nonnegative().optional(),
});

export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  documentType: z
    .enum([
      'TAX_INVOICE',
      'BILL_OF_SUPPLY',
      'CREDIT_NOTE',
      'DEBIT_NOTE',
      'QUOTATION',
      'PROFORMA',
      'SALES_ORDER',
      'DELIVERY_CHALLAN',
    ])
    .optional()
    .default('TAX_INVOICE'),
  supplyType: z
    .enum([
      'B2B',
      'B2C',
      'SEZ_WITH_PAYMENT',
      'SEZ_WITHOUT_PAYMENT',
      'EXPORT_WITH_PAYMENT',
      'EXPORT_WITHOUT_PAYMENT',
      'DEEMED_EXPORT',
    ])
    .optional()
    .default('B2B'),
  taxTreatment: z.enum(['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED']).optional().default('TAXABLE'),
  placeOfSupplyStateCode: z.string().min(2, 'Place of supply state code is required'),
  reverseCharge: z.boolean().optional().default(false),
  items: z.array(InvoiceLineItemInputSchema).min(1, 'At least one line item is required'),
  invoiceDiscount: z
    .object({
      type: z.enum(['FIXED', 'PERCENTAGE']),
      value: z.number().nonnegative(),
      taxTreatment: z.enum(['REDUCE_TAXABLE_VALUE', 'COMMERCIAL_ONLY']).optional().default('REDUCE_TAXABLE_VALUE'),
    })
    .optional(),
  additionalCharges: z.array(AdditionalChargeInputSchema).optional(),
  roundOffPolicy: z.enum(['NEAREST_RUPEE', 'DISABLED']).optional().default('NEAREST_RUPEE'),
  notes: z.string().optional(),
});

export type CreateInvoiceInput = z.input<typeof CreateInvoiceSchema>;
export type CreateInvoiceOutput = z.output<typeof CreateInvoiceSchema>;

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial();

export const CancelInvoiceSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters long'),
});

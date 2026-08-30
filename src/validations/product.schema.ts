import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required').max(200, 'Product name too long'),
  code: z.string().trim().toUpperCase().max(50, 'SKU code too long').optional().or(z.literal('')),
  hsnCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,8}$/, 'HSN code must be 4, 6, or 8 digits'),
  unit: z.string().trim().min(1, 'Unit is required').default('Pcs'),
  uqc: z.string().trim().toUpperCase().min(1, 'UQC is required').default('PCS'),
  sellingPrice: z
    .number({ invalid_type_error: 'Selling price must be a valid number' })
    .min(0, 'Price cannot be negative')
    .refine((val) => Number.isFinite(val), 'Price must be finite'),
  purchasePrice: z
    .number({ invalid_type_error: 'Purchase price must be a valid number' })
    .min(0, 'Purchase price cannot be negative')
    .refine((val) => Number.isFinite(val), 'Purchase price must be finite')
    .optional(),
  defaultGstRate: z
    .number({ invalid_type_error: 'GST rate must be a number' })
    .refine((val) => [0, 5, 12, 18, 28].includes(val), 'Default GST rate must be a standard rate (0%, 5%, 12%, 18%, 28%)')
    .default(18),
  taxTreatment: z
    .enum(['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'])
    .default('TAXABLE'),
  categoryId: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().max(1000, 'Description too long').optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  categoryId: z.string().optional(),
  hsnCode: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;

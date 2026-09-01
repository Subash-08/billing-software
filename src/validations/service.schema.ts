import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'Service name is required').max(200, 'Service name too long'),
  code: z.string().trim().toUpperCase().max(50, 'Service code too long').optional().or(z.literal('')),
  sacCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,6}$/, 'SAC code must be 4 to 6 numeric digits'),
  billingUnit: z.string().trim().min(1, 'Billing unit is required').default('Job'),
  uqc: z.string().trim().toUpperCase().optional().default('JOB'),
  rate: z
    .number({ invalid_type_error: 'Service rate must be a valid number' })
    .min(0, 'Service rate cannot be negative')
    .refine((val) => Number.isFinite(val), 'Service rate must be finite'),
  defaultGstRate: z
    .number({ invalid_type_error: 'GST rate must be a number' })
    .nonnegative('GST rate cannot be negative')
    .refine((val) => Number.isFinite(val), 'GST rate must be finite')
    .default(18),
  defaultTaxRateId: z.string().trim().optional().or(z.literal('')),
  isPriceInclusiveOfGst: z.boolean().optional().default(false),
  taxTreatment: z
    .enum(['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'])
    .default('TAXABLE'),
  categoryId: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().max(1000, 'Description too long').optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const serviceQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  categoryId: z.string().optional(),
  sacCode: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
});

export type CreateServiceInput = z.input<typeof createServiceSchema>;
export type UpdateServiceInput = z.input<typeof updateServiceSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;

import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'Service name is required').max(200, 'Service name too long'),
  code: z.string().trim().toUpperCase().max(50, 'Service code too long').optional().or(z.literal('')),
  sacCode: z
    .string()
    .trim()
    .regex(/^[0-9]{4,6}$/, 'SAC code must be 4 to 6 digits (e.g., 998311)'),
  billingUnit: z.string().trim().min(1, 'Billing unit is required').default('Job'),
  rate: z
    .number({ invalid_type_error: 'Service rate must be a valid number' })
    .min(0, 'Service rate cannot be negative')
    .refine((val) => Number.isFinite(val), 'Service rate must be finite'),
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

export const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const serviceQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  categoryId: z.string().optional(),
  sacCode: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;

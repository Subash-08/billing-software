import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required').max(100, 'Category name too long'),
  type: z.enum(['PRODUCT', 'SERVICE', 'BOTH']).default('BOTH'),
  description: z.string().trim().max(500, 'Description too long').optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

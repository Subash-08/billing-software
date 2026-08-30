import { z } from 'zod';

export const customerAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().max(50, 'Label too long').default('Default'),
  addressLine1: z.string().trim().min(3, 'Address line 1 is required').max(300, 'Address line 1 too long'),
  addressLine2: z.string().trim().max(300, 'Address line 2 too long').optional(),
  city: z.string().trim().min(2, 'City is required').max(100, 'City name too long'),
  district: z.string().trim().max(100, 'District name too long').optional(),
  state: z.string().trim().min(2, 'State is required').max(100, 'State name too long'),
  stateCode: z.string().trim().length(2, '2-digit state code is required').regex(/^[0-9]{2}$/, 'State code must be 2 numeric digits'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits'),
  country: z.string().trim().max(100).default('India'),
  isDefaultShipping: z.boolean().default(false),
});

export const contactPersonSchema = z.object({
  name: z.string().trim().min(2, 'Contact person name is required').max(100, 'Contact name too long'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be 10 digits').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('Valid email address required').optional().or(z.literal('')),
  designation: z.string().trim().max(100, 'Designation too long').optional(),
});

const baseCustomerObject = z.object({
  customerType: z.enum(['BUSINESS', 'INDIVIDUAL']).default('BUSINESS'),
  displayName: z.string().trim().min(2, 'Display name is required').max(200, 'Display name cannot exceed 200 characters'),
  legalName: z.string().trim().max(200, 'Legal name cannot exceed 200 characters').optional(),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().trim().toLowerCase().email('Valid email address required').optional().or(z.literal('')),
  gstTreatment: z
    .enum(['REGISTERED', 'UNREGISTERED', 'COMPOSITION', 'SEZ', 'EXPORT', 'OTHER', 'REGULAR', 'OVERSEAS'])
    .default('REGISTERED'),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  stateCode: z.string().trim().length(2, '2-digit state code is required').regex(/^[0-9]{2}$/, 'State code must be 2 numeric digits'),
  billingAddress: customerAddressSchema,
  shippingAddresses: z.array(customerAddressSchema).max(20, 'Maximum 20 shipping addresses allowed per customer').default([]),
  contacts: z.array(contactPersonSchema).max(10, 'Maximum 10 contact persons allowed per customer').default([]),
});

export const createCustomerSchema = baseCustomerObject
  .refine(
    (data) => {
      // GSTIN Format Check if supplied & registered
      if (data.gstTreatment !== 'UNREGISTERED' && data.gstin && data.gstin.length > 0) {
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin);
      }
      return true;
    },
    {
      message: 'Invalid 15-character GSTIN format (e.g. 33AAAAA0000A1Z5)',
      path: ['gstin'],
    }
  )
  .refine(
    (data) => {
      // GSTIN State Code Alignment Check: First 2 digits of GSTIN must match stateCode
      if (data.gstin && data.gstin.length >= 2) {
        const gstinStatePrefix = data.gstin.substring(0, 2);
        return gstinStatePrefix === data.stateCode;
      }
      return true;
    },
    {
      message: 'GSTIN first 2 digits must match the selected Place of Supply State Code',
      path: ['gstin'],
    }
  );

export const updateCustomerSchema = baseCustomerObject.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  gstTreatment: z.string().optional(),
  customerType: z.enum(['BUSINESS', 'INDIVIDUAL']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type ContactPersonInput = z.infer<typeof contactPersonSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;

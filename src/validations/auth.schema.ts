import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(8, 'Confirm password is required'),

  // Step 2: Business Basics
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  businessEmail: z.string().trim().toLowerCase().email('Valid business email required').optional().or(z.literal('')),
  address: z.string().trim().min(5, 'Address must be at least 5 characters'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits'),

  // Step 3: GST Setup
  gstRegistrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ', 'OTHER']).default('REGULAR'),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  stateCode: z.string().trim().length(2, '2-digit state code required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  if (data.gstRegistrationType !== 'UNREGISTERED' && data.gstin) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin);
  }
  return true;
}, {
  message: 'Invalid 15-character GSTIN format (e.g. 33AAAAA0000A1Z5)',
  path: ['gstin'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmNewPassword: z.string().min(8, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

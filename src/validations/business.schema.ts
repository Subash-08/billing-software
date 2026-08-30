import { z } from 'zod';

const baseOnboardingObject = z.object({
  legalName: z.string().trim().min(2, 'Legal business name is required'),
  tradeName: z.string().trim().optional(),
  businessType: z.enum(['PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'OTHER']).optional().default('PROPRIETORSHIP'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  email: z.string().trim().toLowerCase().email('Valid email address required').optional().or(z.literal('')),
  website: z.string().trim().optional(),
  address: z.string().trim().min(5, 'Address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().min(2, 'State is required'),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits'),
  gstRegistrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'SEZ', 'OTHER']).default('REGULAR'),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  stateCode: z.string().trim().length(2, '2-digit state code required'),
});

export const onboardingSchema = baseOnboardingObject.refine((data) => {
  if (data.gstRegistrationType !== 'UNREGISTERED' && data.gstin) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin);
  }
  return true;
}, {
  message: 'Invalid 15-character GSTIN format (e.g. 33AAAAA0000A1Z5)',
  path: ['gstin'],
});

export const businessProfileSchema = baseOnboardingObject.extend({
  logoUrl: z.string().optional().or(z.literal('')),
  signatureUrl: z.string().optional().or(z.literal('')),
  bankDetails: z.any().optional(),
  invoiceSettings: z.any().optional(),
  gstSettings: z.any().optional(),
});

export const gstSettingsSchema = z.object({
  registrationType: z.enum(['REGULAR', 'COMPOSITION', 'UNREGISTERED', 'OTHER']),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  stateCode: z.string().trim().length(2, '2-digit state code required'),
  isComposition: z.boolean().optional(),
}).refine((data) => {
  if (data.registrationType !== 'UNREGISTERED' && data.gstin) {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin);
  }
  return true;
}, {
  message: 'Invalid 15-character GSTIN format (e.g. 33AAAAA0000A1Z5)',
  path: ['gstin'],
});

export const bankDetailsSchema = z.object({
  accountHolderName: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  ifscCode: z.string().trim().toUpperCase().optional().or(z.literal('')),
  branch: z.string().trim().optional(),
  accountType: z.enum(['SAVINGS', 'CURRENT', 'CC', 'OD']).optional(),
  upiId: z.string().trim().optional(),
}).refine((data) => {
  if (data.ifscCode && data.ifscCode.length > 0) {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode);
  }
  return true;
}, {
  message: 'Invalid 11-character IFSC code format (e.g. SBIN0001234)',
  path: ['ifscCode'],
});

export const cloudinaryAssetSchema = z.object({
  publicId: z.string().optional(),
  secureUrl: z.string().url('Valid image URL required').optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  uploadedAt: z.date().optional().or(z.string().optional()),
});

export const brandingSchema = z.object({
  logo: cloudinaryAssetSchema.optional(),
  invoiceLogo: cloudinaryAssetSchema.optional(),
  signature: cloudinaryAssetSchema.optional(),
});

export const invoiceSettingsSchema = z.object({
  prefix: z.string().trim().min(1, 'Invoice prefix required').default('INV'),
  financialYearFormat: z.enum(['YY-YY', 'YYYY-YY', 'NONE']).default('YY-YY'),
  numberingType: z.enum(['AUTOMATIC', 'MANUAL']).default('AUTOMATIC'),
  defaultPaymentTermsDays: z.number().min(0, 'Days must be >= 0').default(30),
  defaultNotes: z.string().optional(),
  defaultTermsAndConditions: z.string().optional(),
  footerText: z.string().optional(),
});

export const paymentSettingsSchema = z.array(
  z.object({
    modeCode: z.string().trim().min(1, 'Payment mode code required'),
    enabled: z.boolean(),
    customLabel: z.string().trim().optional(),
    displayOrder: z.number().default(0),
  })
);

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type GstSettingsInput = z.infer<typeof gstSettingsSchema>;
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;
export type BrandingInput = z.infer<typeof brandingSchema>;
export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

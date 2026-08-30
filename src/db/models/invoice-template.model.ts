/**
 * Invoice & Document Template Mongoose Model
 * src/db/models/invoice-template.model.ts
 *
 * Stores customizable presentation templates for Tax Invoices and Payment Receipts.
 * Rule 46 Mandatory GST Fields are locked and enforced by domain field policy layer.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type HeaderLayoutType = 'LOGO_LEFT' | 'LOGO_CENTER' | 'LOGO_RIGHT' | 'DETAILS_ONLY';

export interface IInvoiceTemplate extends Document {
  businessId: Types.ObjectId;
  name: string;
  code: string;
  documentType: 'TAX_INVOICE' | 'PAYMENT_RECEIPT';
  isDefault: boolean;
  version: number;

  headerConfig: {
    layout: HeaderLayoutType;
    showLogo: boolean;
    showTagline: boolean;
    showPhone: boolean;
    showEmail: boolean;
  };

  fieldVisibility: {
    businessPan: boolean;
    businessCin: boolean;
    businessWebsite: boolean;
    customerPhone: boolean;
    customerEmail: boolean;
    shippingAddress: boolean;
    vehicleNumber: boolean;
    transportMode: boolean;
    eWayBillNumber: boolean;
    bankDetails: boolean;
    paymentQrCode: boolean;
    termsAndConditions: boolean;
    declaration: boolean;
    authorizedSignature: boolean;
    customerSignature: boolean;
  };

  sectionOrder: string[];

  colorTheme: {
    primaryColor: string;
    accentColor: string;
  };

  termsText: string;
  declarationText: string;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceTemplateSchema = new Schema<IInvoiceTemplate>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    documentType: { type: String, enum: ['TAX_INVOICE', 'PAYMENT_RECEIPT'], default: 'TAX_INVOICE' },
    isDefault: { type: Boolean, default: true },
    version: { type: Number, default: 1 },

    headerConfig: {
      layout: { type: String, enum: ['LOGO_LEFT', 'LOGO_CENTER', 'LOGO_RIGHT', 'DETAILS_ONLY'], default: 'LOGO_LEFT' },
      showLogo: { type: Boolean, default: true },
      showTagline: { type: Boolean, default: true },
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: true },
    },

    fieldVisibility: {
      businessPan: { type: Boolean, default: false },
      businessCin: { type: Boolean, default: false },
      businessWebsite: { type: Boolean, default: false },
      customerPhone: { type: Boolean, default: true },
      customerEmail: { type: Boolean, default: true },
      shippingAddress: { type: Boolean, default: true },
      vehicleNumber: { type: Boolean, default: false },
      transportMode: { type: Boolean, default: false },
      eWayBillNumber: { type: Boolean, default: false },
      bankDetails: { type: Boolean, default: true },
      paymentQrCode: { type: Boolean, default: true },
      termsAndConditions: { type: Boolean, default: true },
      declaration: { type: Boolean, default: true },
      authorizedSignature: { type: Boolean, default: true },
      customerSignature: { type: Boolean, default: false },
    },

    sectionOrder: {
      type: [String],
      default: [
        'HEADER',
        'CUSTOMER_DETAILS',
        'INVOICE_META',
        'ITEM_TABLE',
        'TAX_SUMMARY',
        'BANK_DETAILS',
        'TERMS',
        'SIGNATURE',
      ],
    },

    colorTheme: {
      primaryColor: { type: String, default: '#0f172a' },
      accentColor: { type: String, default: '#2563eb' },
    },

    termsText: {
      type: String,
      default: '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
    },
    declarationText: {
      type: String,
      default: 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
    },
  },
  { timestamps: true }
);

// Index for querying business templates by documentType
InvoiceTemplateSchema.index({ businessId: 1, documentType: 1, isDefault: -1 });

export const InvoiceTemplateModel: Model<IInvoiceTemplate> =
  mongoose.models.InvoiceTemplate || mongoose.model<IInvoiceTemplate>('InvoiceTemplate', InvoiceTemplateSchema);

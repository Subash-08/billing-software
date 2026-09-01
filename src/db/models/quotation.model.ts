/**
 * Quotation Model
 * src/db/models/quotation.model.ts
 *
 * A commercial offer to a customer — NOT a tax document.
 * Does not affect receivables, revenue, or invoice numbering series.
 * On acceptance, can be converted to: Sales Order | Invoice (shortcut).
 *
 * Conversion rule:
 *   convertToDocument() copies editable commercial data (customer, items, prices, discounts),
 *   recalculates GST for the new document date — does NOT copy the financial snapshot.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface IQuotationLineItem {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  unit: string;
  enteredRatePaise: number;
  isPriceInclusiveOfGst: boolean;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValueRaw?: number;
  discountAmountPaise: number;
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  gstRate: number;
  taxRateId: string;
  taxableAmountPaise: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  cessRate: number;
  cessAmountPaise: number;
  totalAmountPaise: number;
}

export interface IQuotation extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  quotationNumber: string;
  financialYear: string;
  status: QuotationStatus;
  quotationDate: Date;
  validUntil?: Date;
  supplyType: 'B2B' | 'B2C' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'EXPORT_WITH_PAYMENT' | 'EXPORT_WITHOUT_PAYMENT' | 'DEEMED_EXPORT';
  placeOfSupplyStateCode: string;
  lineItems: IQuotationLineItem[];
  // Document-level financial totals (all paise)
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  grandTotal: number;
  // Conversion tracking
  convertedToSalesOrderId?: Types.ObjectId;
  convertedToInvoiceId?: Types.ObjectId;
  conversionDate?: Date;
  // Content
  notes?: string;
  termsAndConditions?: string;
  // Concurrency
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationLineItemSchema = new Schema<IQuotationLineItem>(
  {
    itemId: Schema.Types.ObjectId,
    itemType: { type: String, enum: ['GOODS', 'SERVICES'], default: 'GOODS' },
    name: { type: String, required: true },
    description: String,
    hsnCode: String,
    sacCode: String,
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    enteredRatePaise: { type: Number, required: true, min: 0 },
    isPriceInclusiveOfGst: { type: Boolean, default: false },
    discountType: { type: String, enum: ['FIXED', 'PERCENTAGE'] },
    discountValueRaw: Number,
    discountAmountPaise: { type: Number, default: 0 },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    gstRate: { type: Number, required: true, min: 0 },
    taxRateId: { type: String, default: '' },
    taxableAmountPaise: { type: Number, required: true, min: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    cgstAmountPaise: { type: Number, default: 0 },
    sgstAmountPaise: { type: Number, default: 0 },
    igstAmountPaise: { type: Number, default: 0 },
    cessRate: { type: Number, default: 0 },
    cessAmountPaise: { type: Number, default: 0 },
    totalAmountPaise: { type: Number, required: true },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    quotationNumber: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'],
      default: 'DRAFT',
      required: true,
    },
    quotationDate: { type: Date, required: true },
    validUntil: Date,
    supplyType: {
      type: String,
      enum: ['B2B', 'B2C', 'SEZ_WITH_PAYMENT', 'SEZ_WITHOUT_PAYMENT', 'EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT', 'DEEMED_EXPORT'],
      default: 'B2B',
    },
    placeOfSupplyStateCode: { type: String, required: true },
    lineItems: { type: [QuotationLineItemSchema], required: true, default: [] },
    subTotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTaxable: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalCess: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    convertedToSalesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    convertedToInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    conversionDate: Date,
    notes: String,
    termsAndConditions: String,
    revision: { type: Number, default: 1, required: true },
  },
  { timestamps: true }
);

QuotationSchema.index({ businessId: 1, quotationNumber: 1 }, { unique: true });
QuotationSchema.index({ businessId: 1, customerId: 1, status: 1 });
QuotationSchema.index({ businessId: 1, quotationDate: -1 });
QuotationSchema.index({ businessId: 1, status: 1, validUntil: 1 }); // for expiry checks

export const QuotationModel: Model<IQuotation> =
  mongoose.models.Quotation || mongoose.model<IQuotation>('Quotation', QuotationSchema);

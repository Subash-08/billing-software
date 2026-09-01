/**
 * Sales Order Model
 * src/db/models/sales-order.model.ts
 *
 * A confirmed sales commitment — NOT a tax document.
 * Tracks fulfilment via line-level quantities across multiple delivery challans and invoices.
 *
 * Line-level quantity tracking:
 *   orderedQty   — original committed quantity
 *   deliveredQty — cumulative qty across linked delivery challans
 *   invoicedQty  — cumulative qty across linked invoices
 *   cancelledQty — if line was partially or fully cancelled
 *   pendingQty   — orderedQty - deliveredQty - cancelledQty (derived, stored for query efficiency)
 *
 * Status derivation:
 *   OPEN     — no lines fulfilled yet
 *   PARTIAL  — some but not all lines fully delivered/invoiced
 *   FULFILLED — all lines invoicedQty >= orderedQty
 *   CANCELLED — cancelled by user
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type SalesOrderStatus = 'OPEN' | 'PARTIAL' | 'FULFILLED' | 'CANCELLED';

export interface ISalesOrderLineItem {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  unit: string;
  // Line-level quantity tracking — correction 2 from user review
  orderedQty: number;
  deliveredQty: number;   // updated as delivery challans are dispatched
  invoicedQty: number;    // updated as invoices are issued
  cancelledQty: number;
  pendingQty: number;     // stored for query efficiency; derived = orderedQty - deliveredQty - cancelledQty
  enteredRatePaise: number;
  isPriceInclusiveOfGst: boolean;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValueRaw?: number;
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  gstRate: number;
  taxRateId: string;
}

export interface ISalesOrder extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderNumber: string;
  financialYear: string;
  status: SalesOrderStatus;
  // Source reference
  quotationId?: Types.ObjectId;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  supplyType: 'B2B' | 'B2C' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'EXPORT_WITH_PAYMENT' | 'EXPORT_WITHOUT_PAYMENT' | 'DEEMED_EXPORT';
  placeOfSupplyStateCode: string;
  lineItems: ISalesOrderLineItem[];
  // Linked fulfilment documents
  deliveryChallanIds: Types.ObjectId[];
  invoiceIds: Types.ObjectId[];
  // Content
  notes?: string;
  termsAndConditions?: string;
  // Concurrency
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const SalesOrderLineItemSchema = new Schema<ISalesOrderLineItem>(
  {
    itemId: Schema.Types.ObjectId,
    itemType: { type: String, enum: ['GOODS', 'SERVICES'], default: 'GOODS' },
    name: { type: String, required: true },
    description: String,
    hsnCode: String,
    sacCode: String,
    unit: { type: String, required: true },
    orderedQty: { type: Number, required: true, min: 0 },
    deliveredQty: { type: Number, default: 0, min: 0 },
    invoicedQty: { type: Number, default: 0, min: 0 },
    cancelledQty: { type: Number, default: 0, min: 0 },
    pendingQty: { type: Number, default: 0, min: 0 },
    enteredRatePaise: { type: Number, required: true, min: 0 },
    isPriceInclusiveOfGst: { type: Boolean, default: false },
    discountType: { type: String, enum: ['FIXED', 'PERCENTAGE'] },
    discountValueRaw: Number,
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    gstRate: { type: Number, required: true, min: 0 },
    taxRateId: { type: String, default: '' },
  },
  { _id: false }
);

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderNumber: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED'],
      default: 'OPEN',
      required: true,
    },
    quotationId: { type: Schema.Types.ObjectId, ref: 'Quotation' },
    orderDate: { type: Date, required: true },
    expectedDeliveryDate: Date,
    supplyType: {
      type: String,
      enum: ['B2B', 'B2C', 'SEZ_WITH_PAYMENT', 'SEZ_WITHOUT_PAYMENT', 'EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT', 'DEEMED_EXPORT'],
      default: 'B2B',
    },
    placeOfSupplyStateCode: { type: String, required: true },
    lineItems: { type: [SalesOrderLineItemSchema], required: true, default: [] },
    deliveryChallanIds: { type: [Schema.Types.ObjectId], ref: 'DeliveryChallan', default: [] },
    invoiceIds: { type: [Schema.Types.ObjectId], ref: 'Invoice', default: [] },
    notes: String,
    termsAndConditions: String,
    revision: { type: Number, default: 1, required: true },
  },
  { timestamps: true }
);

SalesOrderSchema.index({ businessId: 1, orderNumber: 1 }, { unique: true });
SalesOrderSchema.index({ businessId: 1, customerId: 1, status: 1 });
SalesOrderSchema.index({ businessId: 1, orderDate: -1 });
SalesOrderSchema.index({ businessId: 1, status: 1 });
SalesOrderSchema.index({ businessId: 1, quotationId: 1 });

export const SalesOrderModel: Model<ISalesOrder> =
  mongoose.models.SalesOrder || mongoose.model<ISalesOrder>('SalesOrder', SalesOrderSchema);

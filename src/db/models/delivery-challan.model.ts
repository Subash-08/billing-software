/**
 * Delivery Challan Model
 * src/db/models/delivery-challan.model.ts
 *
 * A goods movement document — NOT always a tax document.
 *
 * deliveryReason governs the business context per Rule 55 GST:
 *   SUPPLY    — goods moving for a sale; an invoice will be raised
 *   JOB_WORK  — goods sent for processing (may not require tax invoice at dispatch)
 *   APPROVAL  — goods sent on approval basis
 *   REPAIR    — goods sent for repair
 *   RETURN    — goods being returned to supplier
 *   OTHER     — any other movement
 *
 * invoiceRequired — explicitly set rather than assumed:
 *   true  → invoice will be or has been raised against this challan
 *   false → challan is the final document for this movement (job-work, return, etc.)
 *
 * Tax treatment: NOT determined by the challan model.
 * The GST engine determines tax on the linked invoice. The challan itself
 * does not generate GST liability unless it is used as an invoice substitute
 * per Rule 55, which requires explicit business configuration — not auto-assumed.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type DeliveryReason =
  | 'SUPPLY'      // goods for sale — invoice required
  | 'JOB_WORK'   // Rule 55: goods for processing
  | 'APPROVAL'   // goods on approval
  | 'REPAIR'     // goods for repair
  | 'RETURN'     // goods return movement
  | 'OTHER';

export type DeliveryChallanStatus = 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface IDeliveryChallanLineItem {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  unit: string;
  quantity: number;
  enteredRatePaise: number;
  notes?: string;
}

export interface IDeliveryChallan extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  challanNumber: string;
  financialYear: string;
  status: DeliveryChallanStatus;
  // Delivery reason — determines GST treatment context per Rule 55
  deliveryReason: DeliveryReason;
  // Explicit flag — not derived from deliveryReason automatically
  invoiceRequired: boolean;
  challanDate: Date;
  dispatchDate?: Date;
  deliveryDate?: Date;
  // Source references
  salesOrderId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;       // set when this challan has been invoiced
  lineItems: IDeliveryChallanLineItem[];
  // Transport details for e-way bill if required
  transportDetails?: {
    transporterName?: string;
    transporterId?: string;
    vehicleNumber?: string;
    lrNumber?: string;
    ewayBillNumber?: string;
  };
  // Addresses (for dispatch)
  dispatchFromAddress?: {
    name: string;
    addressLine: string;
    city: string;
    state: string;
    stateCode: string;
    pincode?: string;
  };
  deliverToAddress?: {
    name: string;
    addressLine: string;
    city: string;
    state: string;
    stateCode: string;
    pincode?: string;
  };
  notes?: string;
  // Concurrency
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryChallanLineItemSchema = new Schema<IDeliveryChallanLineItem>(
  {
    itemId: Schema.Types.ObjectId,
    itemType: { type: String, enum: ['GOODS', 'SERVICES'], default: 'GOODS' },
    name: { type: String, required: true },
    description: String,
    hsnCode: String,
    sacCode: String,
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    enteredRatePaise: { type: Number, default: 0, min: 0 },
    notes: String,
  },
  { _id: false }
);

const TransportDetailsSchema = new Schema(
  {
    transporterName: String,
    transporterId: String,
    vehicleNumber: String,
    lrNumber: String,
    ewayBillNumber: String,
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    name: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    stateCode: { type: String, required: true },
    pincode: String,
  },
  { _id: false }
);

const DeliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    challanNumber: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
      default: 'DRAFT',
      required: true,
    },
    deliveryReason: {
      type: String,
      enum: ['SUPPLY', 'JOB_WORK', 'APPROVAL', 'REPAIR', 'RETURN', 'OTHER'],
      default: 'SUPPLY',
      required: true,
    },
    invoiceRequired: { type: Boolean, default: true },
    challanDate: { type: Date, required: true },
    dispatchDate: Date,
    deliveryDate: Date,
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    lineItems: { type: [DeliveryChallanLineItemSchema], required: true, default: [] },
    transportDetails: TransportDetailsSchema,
    dispatchFromAddress: AddressSchema,
    deliverToAddress: AddressSchema,
    notes: String,
    revision: { type: Number, default: 1, required: true },
  },
  { timestamps: true }
);

DeliveryChallanSchema.index({ businessId: 1, challanNumber: 1 }, { unique: true });
DeliveryChallanSchema.index({ businessId: 1, customerId: 1, status: 1 });
DeliveryChallanSchema.index({ businessId: 1, challanDate: -1 });
DeliveryChallanSchema.index({ businessId: 1, salesOrderId: 1 });
DeliveryChallanSchema.index({ businessId: 1, status: 1 });

export const DeliveryChallanModel: Model<IDeliveryChallan> =
  mongoose.models.DeliveryChallan ||
  mongoose.model<IDeliveryChallan>('DeliveryChallan', DeliveryChallanSchema);

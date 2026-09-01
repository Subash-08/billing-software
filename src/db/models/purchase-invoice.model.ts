import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPurchaseItemSnapshot {
  productId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  unit: string;
  ratePaise: number;
  isPriceInclusiveOfGst: boolean;
  taxableAmountPaise: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  utgstRate?: number;
  cessRate?: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  utgstAmountPaise?: number;
  cessAmountPaise?: number;
  totalAmountPaise: number;
}

export interface IPurchaseInvoice extends Document {
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  purchaseNumber: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: Date;
  financialYear: string;
  purchaseDate: Date;
  status: 'DRAFT' | 'RECORDED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  supplierSnapshot: {
    name: string;
    legalName?: string;
    gstin?: string;
    stateCode: string;
    addressLine?: string;
  };
  items: IPurchaseItemSnapshot[];
  subTotalPaise: number;
  totalTaxablePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalUtgstPaise: number;
  totalIgstPaise: number;
  totalCessPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  paidAmountPaise: number;
  outstandingBalancePaise: number;
  notes?: string;
  recordedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItemSnapshot>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true, default: 'GOODS' },
  name: { type: String, required: true, trim: true },
  hsnCode: { type: String, trim: true },
  sacCode: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0.001 },
  unit: { type: String, required: true, default: 'PCS' },
  ratePaise: { type: Number, required: true, min: 0 },
  isPriceInclusiveOfGst: { type: Boolean, default: false },
  taxableAmountPaise: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  cgstRate: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  utgstRate: { type: Number, default: 0 },
  cessRate: { type: Number, default: 0 },
  cgstAmountPaise: { type: Number, default: 0 },
  sgstAmountPaise: { type: Number, default: 0 },
  igstAmountPaise: { type: Number, default: 0 },
  utgstAmountPaise: { type: Number, default: 0 },
  cessAmountPaise: { type: Number, default: 0 },
  totalAmountPaise: { type: Number, required: true, min: 0 },
}, { _id: false });

const PurchaseInvoiceSchema = new Schema<IPurchaseInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplierInvoiceNumber: { type: String, trim: true },
    supplierInvoiceDate: Date,
    financialYear: { type: String, required: true },
    purchaseDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['DRAFT', 'RECORDED', 'CANCELLED'],
      default: 'DRAFT',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
    },
    supplierSnapshot: {
      name: { type: String, required: true },
      legalName: String,
      gstin: String,
      stateCode: { type: String, required: true },
      addressLine: String,
    },
    items: [PurchaseItemSchema],
    subTotalPaise: { type: Number, required: true },
    totalTaxablePaise: { type: Number, required: true },
    totalCgstPaise: { type: Number, default: 0 },
    totalSgstPaise: { type: Number, default: 0 },
    totalUtgstPaise: { type: Number, default: 0 },
    totalIgstPaise: { type: Number, default: 0 },
    totalCessPaise: { type: Number, default: 0 },
    roundOffPaise: { type: Number, default: 0 },
    grandTotalPaise: { type: Number, required: true },
    paidAmountPaise: { type: Number, default: 0 },
    outstandingBalancePaise: { type: Number, required: true },
    notes: String,
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

PurchaseInvoiceSchema.index({ businessId: 1, purchaseNumber: 1 }, { unique: true });
PurchaseInvoiceSchema.index({ businessId: 1, supplierId: 1, purchaseDate: -1 });

export const PurchaseInvoiceModel: Model<IPurchaseInvoice> =
  mongoose.models.PurchaseInvoice || mongoose.model<IPurchaseInvoice>('PurchaseInvoice', PurchaseInvoiceSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPurchaseReturnItem {
  productId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  unit: string;
  ratePaise: number;
  taxableAmountPaise: number;
  gstRate: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  totalAmountPaise: number;
}

export interface IPurchaseReturn extends Document {
  businessId: Types.ObjectId;
  supplierId: Types.ObjectId;
  purchaseInvoiceId?: Types.ObjectId;
  purchaseReturnNumber: string;
  returnDate: Date;
  reason: string;
  items: IPurchaseReturnItem[];
  totalTaxablePaise: number;
  totalTaxPaise: number;
  grandTotalPaise: number;
  status: 'ISSUED' | 'CANCELLED';
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseReturnItemSchema = new Schema<IPurchaseReturnItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true, default: 'GOODS' },
  name: { type: String, required: true, trim: true },
  hsnCode: String,
  sacCode: String,
  quantity: { type: Number, required: true, min: 0.001 },
  unit: { type: String, required: true, default: 'PCS' },
  ratePaise: { type: Number, required: true, min: 0 },
  taxableAmountPaise: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  cgstAmountPaise: { type: Number, default: 0 },
  sgstAmountPaise: { type: Number, default: 0 },
  igstAmountPaise: { type: Number, default: 0 },
  totalAmountPaise: { type: Number, required: true, min: 0 },
}, { _id: false });

const PurchaseReturnSchema = new Schema<IPurchaseReturn>(
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
    purchaseInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseInvoice',
    },
    purchaseReturnNumber: {
      type: String,
      required: true,
      trim: true,
    },
    returnDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    items: [PurchaseReturnItemSchema],
    totalTaxablePaise: { type: Number, required: true },
    totalTaxPaise: { type: Number, required: true },
    grandTotalPaise: { type: Number, required: true },
    status: {
      type: String,
      enum: ['ISSUED', 'CANCELLED'],
      default: 'ISSUED',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

PurchaseReturnSchema.index({ businessId: 1, purchaseReturnNumber: 1 }, { unique: true });
PurchaseReturnSchema.index({ businessId: 1, supplierId: 1 });

export const PurchaseReturnModel: Model<IPurchaseReturn> =
  mongoose.models.PurchaseReturn || mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);

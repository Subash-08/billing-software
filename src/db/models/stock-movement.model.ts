import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type StockMovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE';

export type StockReferenceType =
  | 'INVOICE'
  | 'CREDIT_NOTE'
  | 'PURCHASE_ORDER'
  | 'ADJUSTMENT'
  | 'OPENING';

export interface IStockMovement extends Document {
  businessId: Types.ObjectId;
  productId: Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  unit: string;
  referenceType: StockReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  previousStock: number;
  newStock: number;
  notes?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['OPENING', 'PURCHASE', 'SALE', 'SALE_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      default: 'PCS',
    },
    referenceType: {
      type: String,
      enum: ['INVOICE', 'CREDIT_NOTE', 'PURCHASE_ORDER', 'ADJUSTMENT', 'OPENING'],
      required: true,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

StockMovementSchema.index({ businessId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ businessId: 1, referenceType: 1, referenceId: 1 });
StockMovementSchema.index(
  { businessId: 1, productId: 1, referenceType: 1, referenceId: 1 },
  { unique: true, sparse: true }
);

export const StockMovementModel: Model<IStockMovement> =
  mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

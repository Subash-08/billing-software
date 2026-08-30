import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type TaxTreatmentType = 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';

export interface IProductCatalogItem extends Document {
  businessId: Types.ObjectId;
  type: 'PRODUCT';
  name: string;
  code?: string;
  hsnCode: string;
  unit: string;
  uqc: string;
  sellingPrice: number;
  purchasePrice?: number;
  defaultGstRate: number;
  taxTreatment: TaxTreatmentType;
  categoryId?: Types.ObjectId;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const ProductCatalogSchema = new Schema<IProductCatalogItem>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['PRODUCT'],
      default: 'PRODUCT',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    hsnCode: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      default: 'Pcs',
    },
    uqc: {
      type: String,
      required: true,
      default: 'PCS',
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePrice: {
      type: Number,
      min: 0,
    },
    defaultGstRate: {
      type: Number,
      required: true,
      default: 18,
    },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    description: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

ProductCatalogSchema.index({ businessId: 1, name: 1 });
ProductCatalogSchema.index({ businessId: 1, code: 1 }, { unique: true, sparse: true });
ProductCatalogSchema.index({ businessId: 1, categoryId: 1 });
ProductCatalogSchema.index({ businessId: 1, status: 1 });

export const ProductModel: Model<IProductCatalogItem> =
  mongoose.models.Product || mongoose.model<IProductCatalogItem>('Product', ProductCatalogSchema);

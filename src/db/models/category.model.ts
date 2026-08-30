import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICategory extends Document {
  businessId: Types.ObjectId;
  name: string;
  type: 'PRODUCT' | 'SERVICE' | 'BOTH';
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['PRODUCT', 'SERVICE', 'BOTH'],
      default: 'BOTH',
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

CategorySchema.index({ businessId: 1, name: 1 }, { unique: true });
CategorySchema.index({ businessId: 1, status: 1 });

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

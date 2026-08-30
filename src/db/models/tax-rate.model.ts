import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaxRateMaster extends Document {
  rate: number;
  cgstRate: number;
  sgstRate: number;
  utgstRate: number;
  igstRate: number;
  cessRate: number;
  cessType?: 'AD_VALOREM' | 'SPECIFIC' | 'BOTH';
  applicableTo: 'GOODS' | 'SERVICES' | 'BOTH';
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceNotification?: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const TaxRateMasterSchema = new Schema<ITaxRateMaster>(
  {
    rate: { type: Number, required: true, index: true },
    cgstRate: { type: Number, required: true },
    sgstRate: { type: Number, required: true },
    utgstRate: { type: Number, required: true, default: 0 },
    igstRate: { type: Number, required: true },
    cessRate: { type: Number, default: 0 },
    cessType: { type: String, enum: ['AD_VALOREM', 'SPECIFIC', 'BOTH'] },
    applicableTo: { type: String, enum: ['GOODS', 'SERVICES', 'BOTH'], default: 'BOTH' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: Date,
    sourceNotification: String,
    version: { type: String, default: '1.0' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

TaxRateMasterSchema.index({ rate: 1, status: 1 });

export const TaxRateModel: Model<ITaxRateMaster> =
  mongoose.models.TaxRate || mongoose.model<ITaxRateMaster>('TaxRate', TaxRateMasterSchema);

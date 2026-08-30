import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHsnSacMaster extends Document {
  code: string;
  type: 'HSN' | 'SAC';
  description: string;
  defaultGstRate: number;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: Date;
  effectiveTo?: Date;
}

const HsnSacMasterSchema = new Schema<IHsnSacMaster>(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['HSN', 'SAC'], required: true },
    description: { type: String, required: true },
    defaultGstRate: { type: Number, required: true, default: 18 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: Date,
  },
  { timestamps: true }
);

export const HsnSacModel: Model<IHsnSacMaster> =
  mongoose.models.HSNSAC || mongoose.model<IHsnSacMaster>('HSNSAC', HsnSacMasterSchema);

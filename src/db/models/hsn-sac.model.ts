import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHsnSacMaster extends Document {
  code: string;
  type: 'HSN' | 'SAC';
  description: string;
  chapter?: string;
  heading?: string;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: Date;
  effectiveTo?: Date;
}

const HsnSacMasterSchema = new Schema<IHsnSacMaster>(
  {
    code: { type: String, required: true, index: true },
    type: { type: String, enum: ['HSN', 'SAC'], required: true },
    description: { type: String, required: true },
    chapter: String,
    heading: String,
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: Date,
  },
  { timestamps: true }
);

HsnSacMasterSchema.index({ code: 1, type: 1 });
HsnSacMasterSchema.index({ description: 'text', code: 'text' });

export const HsnSacModel: Model<IHsnSacMaster> =
  mongoose.models.HSNSAC || mongoose.model<IHsnSacMaster>('HSNSAC', HsnSacMasterSchema);


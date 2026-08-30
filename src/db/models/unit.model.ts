import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUnitMaster extends Document {
  name: string;
  symbol: string;
  uqc: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const UnitMasterSchema = new Schema<IUnitMaster>(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, trim: true },
    uqc: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

UnitMasterSchema.index({ status: 1 });

export const UnitModel: Model<IUnitMaster> =
  mongoose.models.Unit || mongoose.model<IUnitMaster>('Unit', UnitMasterSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAttachment extends Document {
  businessId: Types.ObjectId;
  entityType: 'INVOICE' | 'CUSTOMER' | 'BUSINESS' | 'PAYMENT';
  entityId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  mimeType: string;
  cloudinaryPublicId?: string;
  url: string;
  uploadedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    entityType: { type: String, enum: ['INVOICE', 'CUSTOMER', 'BUSINESS', 'PAYMENT'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    cloudinaryPublicId: String,
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AttachmentSchema.index({ businessId: 1, entityType: 1, entityId: 1 });

export const AttachmentModel: Model<IAttachment> =
  mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', AttachmentSchema);

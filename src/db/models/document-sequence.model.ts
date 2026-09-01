import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDocumentSequence extends Document {
  businessId: Types.ObjectId;
  documentType:
    | 'TAX_INVOICE'
    | 'BILL_OF_SUPPLY'
    | 'CREDIT_NOTE'
    | 'DEBIT_NOTE'
    | 'QUOTATION'
    | 'PROFORMA'
    | 'SALES_ORDER'
    | 'DELIVERY_CHALLAN'
    | 'RECEIPT';
  financialYear: string;
  prefix: string;
  nextSeq: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSequenceSchema = new Schema<IDocumentSequence>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    documentType: {
      type: String,
      enum: [
        'TAX_INVOICE',
        'BILL_OF_SUPPLY',
        'CREDIT_NOTE',
        'DEBIT_NOTE',
        'QUOTATION',
        'PROFORMA',
        'SALES_ORDER',
        'DELIVERY_CHALLAN',
        'RECEIPT',
      ],
      required: true,
    },
    financialYear: { type: String, required: true },
    prefix: { type: String, required: true },
    nextSeq: { type: Number, required: true, default: 1, min: 1 },
  },
  { timestamps: true }
);

DocumentSequenceSchema.index(
  { businessId: 1, documentType: 1, prefix: 1, financialYear: 1 },
  { unique: true }
);

export const DocumentSequenceModel: Model<IDocumentSequence> =
  mongoose.models.DocumentSequence ||
  mongoose.model<IDocumentSequence>('DocumentSequence', DocumentSequenceSchema);

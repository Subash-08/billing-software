import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IInvoiceItemSnapshot {
  itemId?: Types.ObjectId;
  name: string;
  hsnSacCode: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  uqc: string;
  rate: number;
  discountAmount: number;
  taxableAmount: number;
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  utgstAmount: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalAmount: number;
}

export const InvoiceItemSchema = new Schema<IInvoiceItemSnapshot>(
  {
    itemId: Schema.Types.ObjectId,
    name: { type: String, required: true },
    hsnSacCode: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    freeQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true },
    uqc: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    gstRate: { type: Number, required: true, min: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    utgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    cessRate: { type: Number, default: 0 },
    cessAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
  },
  { _id: false }
);

export interface IAddressSnapshot {
  name: string;
  gstin?: string;
  addressLine: string;
  city: string;
  state: string;
  stateCode: string;
  pincode?: string;
  phone?: string;
  logoUrl?: string;
}

export const AddressSnapshotSchema = new Schema<IAddressSnapshot>(
  {
    name: { type: String, required: true },
    gstin: String,
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    stateCode: { type: String, required: true },
    pincode: String,
    phone: String,
    logoUrl: String,
  },
  { _id: false }
);

export interface IInvoice extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  invoiceNumber: string;
  financialYear: string;
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'QUOTATION' | 'DELIVERY_CHALLAN';
  supplyType: 'B2B' | 'B2C' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'EXPORT_WITH_PAYMENT' | 'EXPORT_WITHOUT_PAYMENT' | 'DEEMED_EXPORT';
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  status: 'DRAFT' | 'VALIDATING' | 'READY_TO_ISSUE' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  invoiceDate: Date;
  dueDate: Date;
  currency: string;
  exchangeRate: number;
  billFromSnapshot: IAddressSnapshot;
  dispatchFromSnapshot?: IAddressSnapshot;
  billToSnapshot: IAddressSnapshot;
  shipToSnapshot?: IAddressSnapshot;
  supplyDetails: {
    placeOfSupplyStateCode: string;
    reverseCharge: boolean;
    igstOnIntra?: boolean;
    ecommerceOperatorGstin?: string;
    transporterName?: string;
    transporterId?: string;
    vehicleNumber?: string;
  };
  items: IInvoiceItemSnapshot[];
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalUtgst: number;
  totalIgst: number;
  totalCess: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  calculationTrace?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    invoiceNumber: { type: String, required: true, trim: true },
    financialYear: { type: String, required: true },
    documentType: {
      type: String,
      enum: ['TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE', 'QUOTATION', 'DELIVERY_CHALLAN'],
      default: 'TAX_INVOICE',
      required: true,
    },
    supplyType: {
      type: String,
      enum: ['B2B', 'B2C', 'SEZ_WITH_PAYMENT', 'SEZ_WITHOUT_PAYMENT', 'EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT', 'DEEMED_EXPORT'],
      default: 'B2B',
      required: true,
    },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'VALIDATING', 'READY_TO_ISSUE', 'ISSUED', 'CANCELLED'],
      default: 'DRAFT',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
      required: true,
    },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    currency: { type: String, default: 'INR' },
    exchangeRate: { type: Number, default: 1.0 },
    billFromSnapshot: { type: AddressSnapshotSchema, required: true },
    dispatchFromSnapshot: AddressSnapshotSchema,
    billToSnapshot: { type: AddressSnapshotSchema, required: true },
    shipToSnapshot: AddressSnapshotSchema,
    supplyDetails: {
      placeOfSupplyStateCode: { type: String, required: true },
      reverseCharge: { type: Boolean, default: false },
      igstOnIntra: { type: Boolean, default: false },
      ecommerceOperatorGstin: String,
      transporterName: String,
      transporterId: String,
      vehicleNumber: String,
    },
    items: { type: [InvoiceItemSchema], required: true },
    subTotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalTaxable: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalUtgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalCess: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    calculationTrace: Object,
  },
  { timestamps: true }
);

InvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ businessId: 1, status: 1, invoiceDate: -1 });
InvoiceSchema.index({ businessId: 1, customerId: 1, paymentStatus: 1 });
InvoiceSchema.index({ businessId: 1, invoiceDate: -1 });

export const InvoiceModel: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

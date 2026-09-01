import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IInvoiceItemSnapshot {
  itemId?: Types.ObjectId;
  itemType: 'GOODS' | 'SERVICES';
  name: string;
  description?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  uqc: string;
  enteredRatePaise: number;
  isPriceInclusiveOfGst: boolean;
  discountType?: 'FIXED' | 'PERCENTAGE';
  discountValueRaw?: number;
  discountAmountPaise: number;
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  taxRateId: string;
  taxRateVersion: string;
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  utgstAmountPaise: number;
  igstAmountPaise: number;
  cessRate: number;
  cessAmountPaise: number;
  totalAmountPaise: number;
}

export const InvoiceItemSchema = new Schema<IInvoiceItemSnapshot>(
  {
    itemId: Schema.Types.ObjectId,
    itemType: { type: String, enum: ['GOODS', 'SERVICES'], required: true, default: 'GOODS' },
    name: { type: String, required: true },
    description: String,
    hsnCode: String,
    sacCode: String,
    quantity: { type: Number, required: true, min: 0 },
    freeQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true },
    uqc: { type: String, required: true },
    enteredRatePaise: { type: Number, required: true, min: 0 },
    isPriceInclusiveOfGst: { type: Boolean, default: false },
    discountType: { type: String, enum: ['FIXED', 'PERCENTAGE'] },
    discountValueRaw: Number,
    discountAmountPaise: { type: Number, default: 0, min: 0 },
    taxTreatment: {
      type: String,
      enum: ['TAXABLE', 'NIL_RATED', 'EXEMPT', 'NON_GST', 'ZERO_RATED'],
      default: 'TAXABLE',
    },
    gstRate: { type: Number, required: true, min: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    taxRateId: { type: String, default: '' },
    taxRateVersion: { type: String, default: '1.0' },
    taxableAmountPaise: { type: Number, required: true, min: 0 },
    cgstAmountPaise: { type: Number, default: 0 },
    sgstAmountPaise: { type: Number, default: 0 },
    utgstAmountPaise: { type: Number, default: 0 },
    igstAmountPaise: { type: Number, default: 0 },
    cessRate: { type: Number, default: 0 },
    cessAmountPaise: { type: Number, default: 0 },
    totalAmountPaise: { type: Number, required: true },
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

export type EInvoiceStatus = 'NOT_REQUIRED' | 'PENDING' | 'GENERATED' | 'CANCELLED' | 'FAILED';

export interface IInvoice extends Document {
  businessId: Types.ObjectId;
  customerId: Types.ObjectId;
  invoiceNumber: string;
  financialYear: string;
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'QUOTATION' | 'PROFORMA' | 'SALES_ORDER' | 'DELIVERY_CHALLAN';
  supplyType: 'B2B' | 'B2C' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'EXPORT_WITH_PAYMENT' | 'EXPORT_WITHOUT_PAYMENT' | 'DEEMED_EXPORT';
  taxTreatment: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  // Three independent lifecycle axes — no coupling between them
  status: 'DRAFT' | 'VALIDATING' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  einvoiceStatus: EInvoiceStatus;
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
  // Document-level financial snapshot (all in integer paise)
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
  returnedAmount?: number;
  outstandingBalance: number;
  // Calculation + Compliance trace (policy versions, warnings, decisions)
  calculationTrace?: Record<string, unknown>;
  // Optimistic concurrency — incremented atomically on every draft update
  revision: number;
  // Issuance idempotency — sparse unique index prevents duplicate issuance
  issuanceIdempotencyKey?: string;
  shareToken?: string;
  shareTokenExpiresAt?: Date;
  notes?: string;
  termsAndConditions?: string;
  createdById: Types.ObjectId;
  /** Immutable template snapshot taken at invoice issuance. Used for historical PDF reproduction. */
  templateSnapshot?: {
    templateId?: string;
    templateVersion?: number;
    templateMode: string;
    paperSize: string;
    orientation: string;
    pageMargins: { topMm: number; bottomMm: number; leftMm: number; rightMm: number };
    letterheadConfig?: {
      reservedHeaderHeightMm: number;
      reservedFooterHeightMm: number;
      calibrationTopOffsetMm: number;
      calibrationLeftOffsetMm: number;
      backgroundMediaUrl?: string;
    };
    logoConfig?: { enabled: boolean; alignment: string; widthMm: number; maxHeightMm: number };
    companyHeaderConfig?: Record<string, unknown>;
    signatoryConfig?: Record<string, unknown>;
    headerConfig?: Record<string, unknown>;
    itemColumns?: Array<{ key: string; label: string; visible: boolean; align: string }>;
    fieldVisibility?: Record<string, string>;
    sectionOrder?: string[];
    styling?: Record<string, unknown>;
    termsText?: string;
    declarationText?: string;
    logoUrl?: string;
    signatureUrl?: string;
    snapshotAt: string;
  };
  // Audit signatures
  issuedAt?: Date;
  issuedBy?: Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancellationReason?: string;
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
      enum: ['TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE', 'QUOTATION', 'PROFORMA', 'SALES_ORDER', 'DELIVERY_CHALLAN'],
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
      enum: ['DRAFT', 'VALIDATING', 'ISSUED', 'CANCELLED'],
      default: 'DRAFT',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID'],
      default: 'UNPAID',
      required: true,
    },
    einvoiceStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'GENERATED', 'CANCELLED', 'FAILED'],
      default: 'NOT_REQUIRED',
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
    returnedAmount: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    calculationTrace: Object,
    // Optimistic concurrency
    revision: { type: Number, default: 1, required: true },
    issuanceIdempotencyKey: { type: String, sparse: true },
    shareToken: String,
    shareTokenExpiresAt: Date,
    notes: String,
    termsAndConditions: String,
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
    templateSnapshot: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    // Audit signatures
    issuedAt: Date,
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
  },
  { timestamps: true }
);

InvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ businessId: 1, status: 1, invoiceDate: -1 });
InvoiceSchema.index({ businessId: 1, customerId: 1, paymentStatus: 1 });
InvoiceSchema.index({ businessId: 1, invoiceDate: -1 });
// Idempotency key: sparse so null values are not indexed
InvoiceSchema.index({ businessId: 1, issuanceIdempotencyKey: 1 }, { unique: true, sparse: true });

export const InvoiceModel: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

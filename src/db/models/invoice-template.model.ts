/**
 * Invoice & Document Template Mongoose Model
 * src/db/models/invoice-template.model.ts
 *
 * Template modes:
 *   STANDARD              — Full company header/logo on blank A4 paper
 *   PRE_PRINTED_LETTERHEAD — Physical pre-printed stationery. Suppresses logo/header.
 *                           Reserves configurable top/bottom margins for existing print.
 *   DIGITAL_LETTERHEAD    — Renders user-uploaded background image behind content on blank A4.
 *
 * Tristate FieldVisibilityValue:
 *   VISIBLE — Always shown (user-forced)
 *   HIDDEN  — Always hidden (user-forced)
 *   AUTO    — Resolved by engine from TransactionContext (e.g. IGST only for inter-state)
 *
 * REQUIRED fields (per Rule 46 GST compliance) cannot be stored as HIDDEN.
 * FORBIDDEN fields cannot be stored as VISIBLE.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type HeaderLayoutType = 'LOGO_LEFT' | 'LOGO_CENTER' | 'LOGO_RIGHT' | 'DETAILS_ONLY';
export type TemplateMode = 'STANDARD' | 'PRE_PRINTED_LETTERHEAD' | 'DIGITAL_LETTERHEAD';
export type PaperSize = 'A4';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type LogoAlignment = 'LEFT' | 'CENTER' | 'RIGHT';

// Three-state field visibility
export type FieldVisibilityValue = 'VISIBLE' | 'HIDDEN' | 'AUTO';
const FIELD_VISIBILITY_ENUM = ['VISIBLE', 'HIDDEN', 'AUTO'];

// ─── Sub-interfaces ────────────────────────────────────────────────────────

export interface IPageMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface ILetterheadConfig {
  /** Height (mm) reserved at top of page for physical letterhead header. Content starts below this. */
  reservedHeaderHeightMm: number;
  /** Height (mm) reserved at bottom of page for physical letterhead footer. Content stops above this. */
  reservedFooterHeightMm: number;
  /** Fine-tuning offset (mm) applied to content top — for printer alignment correction. */
  calibrationTopOffsetMm: number;
  /** Fine-tuning offset (mm) applied to content left — for printer alignment correction. */
  calibrationLeftOffsetMm: number;
  /** Digital letterhead background image URL (only used in DIGITAL_LETTERHEAD mode) */
  backgroundMediaUrl?: string;
  /** Opacity of background (0–1), only for digital letterhead */
  backgroundOpacity?: number;
}

export interface ILogoConfig {
  enabled: boolean;
  alignment: LogoAlignment;
  /** Display width in mm on printed document */
  widthMm: number;
  /** Max display height in mm (auto-proportional) */
  maxHeightMm: number;
}

export interface ISignatoryConfig {
  showAuthorizedSignature: boolean;
  showCustomerSignature: boolean;
  signatoryLabel: string;
  signatoryName?: string;
  designation?: string;
  /** URL of scanned signature image (from business branding) */
  signatureImageUrl?: string;
}

export interface ICompanyHeaderConfig {
  showName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showWebsite: boolean;
  showPan: boolean;
  alignment: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface IColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  align: 'LEFT' | 'CENTER' | 'RIGHT';
}

export interface IStylingConfig {
  /** Base font-size in pt for body text */
  baseFontSizePt: number;
  /** Table density: comfortable / compact */
  tableDensity: 'COMFORTABLE' | 'COMPACT';
  /** Accent color hex for table header, totals row */
  accentColor: string;
  /** Primary text color */
  primaryColor: string;
}

// ─── Main Interface ────────────────────────────────────────────────────────

export interface IInvoiceTemplate extends Document {
  businessId: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'DELIVERY_CHALLAN' | 'PAYMENT_RECEIPT';
  isDefault: boolean;
  isActive: boolean;
  version: number;

  // ─── Print Configuration ───────────────────────────────────────────────
  templateMode: TemplateMode;
  paperSize: PaperSize;
  orientation: PageOrientation;
  pageMargins: IPageMargins;
  letterheadConfig: ILetterheadConfig;

  // ─── Company Presentation ──────────────────────────────────────────────
  logoConfig: ILogoConfig;
  companyHeaderConfig: ICompanyHeaderConfig;
  signatoryConfig: ISignatoryConfig;

  // ─── Invoice Header Display ────────────────────────────────────────────
  headerConfig: {
    layout: HeaderLayoutType;
    showLogo: boolean;
    showTagline: boolean;
    showPhone: boolean;
    showEmail: boolean;
    invoiceTitleOverride?: string;
  };

  // ─── Item Table Column Config ──────────────────────────────────────────
  itemColumns: IColumnConfig[];

  // ─── Field Visibility (tristate AUTO/VISIBLE/HIDDEN) ──────────────────
  fieldVisibility: {
    // Business header optional fields
    businessPan: FieldVisibilityValue;
    businessCin: FieldVisibilityValue;
    businessWebsite: FieldVisibilityValue;
    // Customer section
    customerPhone: FieldVisibilityValue;
    customerEmail: FieldVisibilityValue;
    shippingAddress: FieldVisibilityValue;
    customerGstin: FieldVisibilityValue;
    // Invoice metadata
    reverseCharge: FieldVisibilityValue;
    placeOfSupply: FieldVisibilityValue;
    dueDate: FieldVisibilityValue;
    referenceNumber: FieldVisibilityValue;
    // Transport (optional)
    vehicleNumber: FieldVisibilityValue;
    transportMode: FieldVisibilityValue;
    eWayBillNumber: FieldVisibilityValue;
    // Bottom sections
    bankDetails: FieldVisibilityValue;
    paymentQrCode: FieldVisibilityValue;
    termsAndConditions: FieldVisibilityValue;
    declaration: FieldVisibilityValue;
    authorizedSignature: FieldVisibilityValue;
    customerSignature: FieldVisibilityValue;
    // Totals section
    subtotalRow: FieldVisibilityValue;
    discountRow: FieldVisibilityValue;
    taxableValueRow: FieldVisibilityValue;
    cgstRow: FieldVisibilityValue;
    sgstRow: FieldVisibilityValue;
    utgstRow: FieldVisibilityValue;
    igstRow: FieldVisibilityValue;
    cessRow: FieldVisibilityValue;
    roundOffRow: FieldVisibilityValue;
    amountInWords: FieldVisibilityValue;
    // Compliance
    eInvoiceQr: FieldVisibilityValue;
    irnNumber: FieldVisibilityValue;
  };

  sectionOrder: string[];
  styling: IStylingConfig;
  termsText: string;
  declarationText: string;
  notesText?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────

const PageMarginsSchema = new Schema<IPageMargins>({
  topMm:    { type: Number, default: 10, min: 0 },
  bottomMm: { type: Number, default: 10, min: 0 },
  leftMm:   { type: Number, default: 10, min: 0 },
  rightMm:  { type: Number, default: 10, min: 0 },
}, { _id: false });

const LetterheadConfigSchema = new Schema<ILetterheadConfig>({
  reservedHeaderHeightMm:  { type: Number, default: 40, min: 0 },
  reservedFooterHeightMm:  { type: Number, default: 25, min: 0 },
  calibrationTopOffsetMm:  { type: Number, default: 0 },
  calibrationLeftOffsetMm: { type: Number, default: 0 },
  backgroundMediaUrl:      String,
  backgroundOpacity:       { type: Number, default: 1, min: 0, max: 1 },
}, { _id: false });

const LogoConfigSchema = new Schema<ILogoConfig>({
  enabled:    { type: Boolean, default: true },
  alignment:  { type: String, enum: ['LEFT', 'CENTER', 'RIGHT'], default: 'LEFT' },
  widthMm:    { type: Number, default: 40, min: 5, max: 100 },
  maxHeightMm: { type: Number, default: 20, min: 5, max: 60 },
}, { _id: false });

const SignatoryConfigSchema = new Schema<ISignatoryConfig>({
  showAuthorizedSignature: { type: Boolean, default: true },
  showCustomerSignature:   { type: Boolean, default: false },
  signatoryLabel:          { type: String, default: 'Authorized Signatory' },
  signatoryName:           String,
  designation:             String,
  signatureImageUrl:       String,
}, { _id: false });

const CompanyHeaderConfigSchema = new Schema<ICompanyHeaderConfig>({
  showName:    { type: Boolean, default: true },
  showAddress: { type: Boolean, default: true },
  showPhone:   { type: Boolean, default: true },
  showEmail:   { type: Boolean, default: true },
  showGstin:   { type: Boolean, default: true },
  showWebsite: { type: Boolean, default: false },
  showPan:     { type: Boolean, default: false },
  alignment:   { type: String, enum: ['LEFT', 'CENTER', 'RIGHT'], default: 'LEFT' },
}, { _id: false });

const ColumnConfigSchema = new Schema<IColumnConfig>({
  key:     { type: String, required: true },
  label:   { type: String, required: true },
  visible: { type: Boolean, default: true },
  align:   { type: String, enum: ['LEFT', 'CENTER', 'RIGHT'], default: 'LEFT' },
}, { _id: false });

const StylingConfigSchema = new Schema<IStylingConfig>({
  baseFontSizePt: { type: Number, default: 9, min: 7, max: 14 },
  tableDensity:   { type: String, enum: ['COMFORTABLE', 'COMPACT'], default: 'COMFORTABLE' },
  accentColor:    { type: String, default: '#1e40af' },
  primaryColor:   { type: String, default: '#0f172a' },
}, { _id: false });

const DEFAULT_ITEM_COLUMNS: IColumnConfig[] = [
  { key: 'serialNo',     label: '#',            visible: true,  align: 'CENTER' },
  { key: 'name',         label: 'Item',         visible: true,  align: 'LEFT' },
  { key: 'hsnSac',       label: 'HSN/SAC',      visible: true,  align: 'CENTER' },
  { key: 'quantity',     label: 'Qty',          visible: true,  align: 'RIGHT' },
  { key: 'unit',         label: 'Unit',         visible: true,  align: 'CENTER' },
  { key: 'rate',         label: 'Rate',         visible: true,  align: 'RIGHT' },
  { key: 'discount',     label: 'Discount',     visible: false, align: 'RIGHT' },
  { key: 'taxableValue', label: 'Taxable',      visible: true,  align: 'RIGHT' },
  { key: 'gstRate',      label: 'GST %',        visible: false, align: 'CENTER' },
  { key: 'cgst',         label: 'CGST',         visible: false, align: 'RIGHT' },
  { key: 'sgst',         label: 'SGST',         visible: false, align: 'RIGHT' },
  { key: 'igst',         label: 'IGST',         visible: false, align: 'RIGHT' },
  { key: 'cess',         label: 'Cess',         visible: false, align: 'RIGHT' },
  { key: 'total',        label: 'Amount',       visible: true,  align: 'RIGHT' },
];

const InvoiceTemplateSchema = new Schema<IInvoiceTemplate>(
  {
    businessId:   { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name:         { type: String, required: true, trim: true },
    code:         { type: String, required: true, trim: true },
    description:  String,
    documentType: {
      type: String,
      enum: ['TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE', 'DELIVERY_CHALLAN', 'PAYMENT_RECEIPT'],
      default: 'TAX_INVOICE',
    },
    isDefault: { type: Boolean, default: false },
    isActive:  { type: Boolean, default: true },
    version:   { type: Number, default: 1 },

    // ─── Print configuration ───────────────────────────────────────────
    templateMode: {
      type: String,
      enum: ['STANDARD', 'PRE_PRINTED_LETTERHEAD', 'DIGITAL_LETTERHEAD'],
      default: 'STANDARD',
    },
    paperSize:    { type: String, enum: ['A4'], default: 'A4' },
    orientation:  { type: String, enum: ['PORTRAIT', 'LANDSCAPE'], default: 'PORTRAIT' },
    pageMargins:       { type: PageMarginsSchema, default: () => ({}) },
    letterheadConfig:  { type: LetterheadConfigSchema, default: () => ({}) },

    // ─── Company presentation ──────────────────────────────────────────
    logoConfig:          { type: LogoConfigSchema, default: () => ({}) },
    companyHeaderConfig: { type: CompanyHeaderConfigSchema, default: () => ({}) },
    signatoryConfig:     { type: SignatoryConfigSchema, default: () => ({}) },

    // ─── Legacy + extended header ──────────────────────────────────────
    headerConfig: {
      layout:               { type: String, enum: ['LOGO_LEFT', 'LOGO_CENTER', 'LOGO_RIGHT', 'DETAILS_ONLY'], default: 'LOGO_LEFT' },
      showLogo:             { type: Boolean, default: true },
      showTagline:          { type: Boolean, default: false },
      showPhone:            { type: Boolean, default: true },
      showEmail:            { type: Boolean, default: true },
      invoiceTitleOverride: String,
    },

    // ─── Item table columns ────────────────────────────────────────────
    itemColumns: { type: [ColumnConfigSchema], default: DEFAULT_ITEM_COLUMNS },

    // ─── Field visibility (tristate) ───────────────────────────────────
    fieldVisibility: {
      businessPan:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      businessCin:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      businessWebsite:      { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      customerPhone:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      customerEmail:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      shippingAddress:      { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      customerGstin:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      reverseCharge:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      placeOfSupply:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      dueDate:              { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      referenceNumber:      { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      vehicleNumber:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      transportMode:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      eWayBillNumber:       { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      bankDetails:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      paymentQrCode:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      termsAndConditions:   { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      declaration:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      authorizedSignature:  { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      customerSignature:    { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      subtotalRow:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      discountRow:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      taxableValueRow:      { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      cgstRow:              { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      sgstRow:              { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      utgstRow:             { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      igstRow:              { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      cessRow:              { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'AUTO' },
      roundOffRow:          { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      amountInWords:        { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'VISIBLE' },
      eInvoiceQr:           { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
      irnNumber:            { type: String, enum: FIELD_VISIBILITY_ENUM, default: 'HIDDEN' },
    },

    sectionOrder: {
      type: [String],
      default: ['HEADER', 'CUSTOMER_DETAILS', 'INVOICE_META', 'ITEM_TABLE', 'TAX_SUMMARY', 'BANK_DETAILS', 'TERMS', 'SIGNATURE'],
    },

    styling:         { type: StylingConfigSchema, default: () => ({}) },
    termsText:       { type: String, default: '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.' },
    declarationText: { type: String, default: 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.' },
    notesText:       String,
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
InvoiceTemplateSchema.index({ businessId: 1, name: 1 }, { unique: true });
InvoiceTemplateSchema.index({ businessId: 1, documentType: 1, isDefault: -1 });
InvoiceTemplateSchema.index({ businessId: 1, isActive: 1 });

export const InvoiceTemplateModel: Model<IInvoiceTemplate> =
  mongoose.models.InvoiceTemplate ||
  mongoose.model<IInvoiceTemplate>('InvoiceTemplate', InvoiceTemplateSchema);

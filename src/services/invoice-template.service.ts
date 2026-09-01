/**
 * Multi-Template Document Engine
 * src/services/invoice-template.service.ts
 *
 * Rules:
 * 1. Multi-Template CRUD: Businesses can create, list, edit, clone, select default, and delete templates.
 * 2. Active Default Guard: Default active templates CANNOT be deleted without first selecting another template as default.
 * 3. Rule 46 Field Policy: Statutory mandatory fields (Business Name, GSTIN, Invoice #, Date, HSN/SAC, Values, Tax Rates, Tax Amounts, Totals) are non-removable.
 * 4. Tenant Isolation: All operations are strictly scoped to authenticated user's businessId.
 * 5. templateMode: STANDARD | PRE_PRINTED_LETTERHEAD | DIGITAL_LETTERHEAD
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceTemplateModel, IInvoiceTemplate } from '@/db/models/invoice-template.model';
import { ApplicationError, NotFoundError, BusinessRuleError, ValidationError } from '@/lib/errors';

const DEFAULT_ITEM_COLUMNS = [
  { key: 'serialNo',     label: '#',       visible: true,  align: 'CENTER' },
  { key: 'name',         label: 'Item',    visible: true,  align: 'LEFT' },
  { key: 'hsnSac',       label: 'HSN/SAC', visible: true,  align: 'CENTER' },
  { key: 'quantity',     label: 'Qty',     visible: true,  align: 'RIGHT' },
  { key: 'unit',         label: 'Unit',    visible: true,  align: 'CENTER' },
  { key: 'rate',         label: 'Rate',    visible: true,  align: 'RIGHT' },
  { key: 'discount',     label: 'Discount',visible: false, align: 'RIGHT' },
  { key: 'taxableValue', label: 'Taxable', visible: true,  align: 'RIGHT' },
  { key: 'gstRate',      label: 'GST %',   visible: false, align: 'CENTER' },
  { key: 'cgst',         label: 'CGST',    visible: false, align: 'RIGHT' },
  { key: 'sgst',         label: 'SGST',    visible: false, align: 'RIGHT' },
  { key: 'igst',         label: 'IGST',    visible: false, align: 'RIGHT' },
  { key: 'cess',         label: 'Cess',    visible: false, align: 'RIGHT' },
  { key: 'total',        label: 'Amount',  visible: true,  align: 'RIGHT' },
];

const DEFAULT_TEMPLATE_SEED = {
  name: 'Default Classic GST Invoice',
  code: 'DEFAULT_GST',
  documentType: 'TAX_INVOICE' as const,
  isDefault: true,
  isActive: true,
  version: 1,
  templateMode: 'STANDARD' as const,
  paperSize: 'A4' as const,
  orientation: 'PORTRAIT' as const,
  pageMargins: { topMm: 10, bottomMm: 10, leftMm: 10, rightMm: 10 },
  letterheadConfig: {
    reservedHeaderHeightMm: 40,
    reservedFooterHeightMm: 25,
    calibrationTopOffsetMm: 0,
    calibrationLeftOffsetMm: 0,
  },
  logoConfig: {
    enabled: true,
    alignment: 'LEFT' as const,
    widthMm: 40,
    maxHeightMm: 20,
  },
  companyHeaderConfig: {
    showName: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showGstin: true,
    showWebsite: false,
    showPan: false,
    alignment: 'LEFT' as const,
  },
  signatoryConfig: {
    showAuthorizedSignature: true,
    showCustomerSignature: false,
    signatoryLabel: 'Authorized Signatory',
  },
  headerConfig: {
    layout: 'LOGO_LEFT' as const,
    showLogo: true,
    showTagline: false,
    showPhone: true,
    showEmail: true,
  },
  itemColumns: DEFAULT_ITEM_COLUMNS,
  fieldVisibility: {
    businessPan:         'HIDDEN',
    businessCin:         'HIDDEN',
    businessWebsite:     'HIDDEN',
    customerPhone:       'VISIBLE',
    customerEmail:       'VISIBLE',
    shippingAddress:     'VISIBLE',
    customerGstin:       'AUTO',
    reverseCharge:       'AUTO',
    placeOfSupply:       'VISIBLE',
    dueDate:             'VISIBLE',
    referenceNumber:     'HIDDEN',
    vehicleNumber:       'HIDDEN',
    transportMode:       'HIDDEN',
    eWayBillNumber:      'HIDDEN',
    bankDetails:         'VISIBLE',
    paymentQrCode:       'VISIBLE',
    termsAndConditions:  'VISIBLE',
    declaration:         'VISIBLE',
    authorizedSignature: 'VISIBLE',
    customerSignature:   'HIDDEN',
    subtotalRow:         'VISIBLE',
    discountRow:         'AUTO',
    taxableValueRow:     'VISIBLE',
    cgstRow:             'AUTO',
    sgstRow:             'AUTO',
    utgstRow:            'AUTO',
    igstRow:             'AUTO',
    cessRow:             'AUTO',
    roundOffRow:         'VISIBLE',
    amountInWords:       'VISIBLE',
    eInvoiceQr:          'HIDDEN',
    irnNumber:           'HIDDEN',
  },
  sectionOrder: ['HEADER', 'CUSTOMER_DETAILS', 'INVOICE_META', 'ITEM_TABLE', 'TAX_SUMMARY', 'BANK_DETAILS', 'TERMS', 'SIGNATURE'],
  styling: {
    baseFontSizePt: 9,
    tableDensity: 'COMFORTABLE' as const,
    accentColor: '#1e40af',
    primaryColor: '#0f172a',
  },
  termsText: '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
  declarationText: 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
};

export class InvoiceTemplateService {
  /**
   * Retrieves or initializes the business's default tax invoice template.
   */
  async getOrCreateDefaultTemplate(businessId: string): Promise<IInvoiceTemplate> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    let template = await InvoiceTemplateModel.findOne({ businessId: bId, isDefault: true, documentType: 'TAX_INVOICE' }).exec();

    if (!template) {
      template = await InvoiceTemplateModel.create({
        businessId: bId,
        ...DEFAULT_TEMPLATE_SEED,
      });
    }

    return template;
  }

  /**
   * Lists all active document templates for a business.
   */
  async getTemplates(businessId: string): Promise<IInvoiceTemplate[]> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    // Ensure default template is initialized
    await this.getOrCreateDefaultTemplate(businessId);

    return InvoiceTemplateModel.find({ businessId: bId }).sort({ isDefault: -1, createdAt: -1 }).exec();
  }

  /**
   * Retrieves a single template by ID for a business.
   */
  async getTemplateById(businessId: string, templateId: string): Promise<IInvoiceTemplate> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(templateId)) {
      throw new ValidationError(`Invalid template ID format: ${templateId}`);
    }
    const bId = new Types.ObjectId(businessId);
    const template = await InvoiceTemplateModel.findOne({ _id: templateId, businessId: bId }).exec();
    if (!template) {
      throw new NotFoundError(`Invoice template with ID '${templateId}' not found.`);
    }
    return template;
  }

  /**
   * Creates a new document template.
   */
  async createTemplate(businessId: string, payload: Partial<IInvoiceTemplate>): Promise<IInvoiceTemplate> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    if (!payload.name || payload.name.trim().length === 0) {
      throw new ValidationError('Template name is required.');
    }

    const code = `TPL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newTemplate = await InvoiceTemplateModel.create({
      businessId: bId,
      ...DEFAULT_TEMPLATE_SEED,
      ...payload,
      name: payload.name.trim(),
      code,
      isDefault: false,
      version: 1,
    });

    return newTemplate;
  }

  /**
   * Updates an existing document template.
   * Validates that margin+letterhead reserved areas don't exceed physical page dimensions.
   */
  async updateTemplate(
    businessId: string,
    templateId: string,
    payload: Partial<IInvoiceTemplate>
  ): Promise<IInvoiceTemplate> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(templateId)) {
      throw new ValidationError(`Invalid template ID format: ${templateId}`);
    }
    const bId = new Types.ObjectId(businessId);

    const existing = await InvoiceTemplateModel.findOne({ _id: templateId, businessId: bId }).exec();
    if (!existing) {
      throw new NotFoundError(`Invoice template with ID '${templateId}' not found.`);
    }

    // Physical page validation for A4 (297mm tall × 210mm wide)
    const A4_HEIGHT_MM = 297;
    const A4_WIDTH_MM = 210;

    const margins = { ...existing.pageMargins, ...(payload.pageMargins || {}) };
    const letterhead = { ...existing.letterheadConfig, ...(payload.letterheadConfig || {}) };

    const verticalUsed = (margins.topMm || 0) + (margins.bottomMm || 0) +
      (letterhead.reservedHeaderHeightMm || 0) + (letterhead.reservedFooterHeightMm || 0);
    if (verticalUsed >= A4_HEIGHT_MM - 30) {
      throw new ValidationError(
        `Combined margins (${margins.topMm + margins.bottomMm}mm) and letterhead reservations (${letterhead.reservedHeaderHeightMm + letterhead.reservedFooterHeightMm}mm) exceed printable A4 height. Reduce them.`
      );
    }

    const horizontalUsed = (margins.leftMm || 0) + (margins.rightMm || 0);
    if (horizontalUsed >= A4_WIDTH_MM - 30) {
      throw new ValidationError(`Combined left+right margins (${horizontalUsed}mm) exceed printable A4 width. Reduce them.`);
    }

    // Sanitize payload: avoid overwriting internal Mongoose Document fields
    const { _id, businessId: _bid, createdAt, updatedAt, __v, schema, collection, db, isNew, errors, ...cleanPayload } = payload as any;

    // Deep-merge fieldVisibility and itemColumns (don't fully replace)
    if (cleanPayload.fieldVisibility) {
      cleanPayload.fieldVisibility = { ...existing.fieldVisibility, ...cleanPayload.fieldVisibility };
    }

    const updated = await InvoiceTemplateModel.findOneAndUpdate(
      { _id: templateId, businessId: bId },
      { $set: cleanPayload, $inc: { version: 1 } },
      { new: true }
    ).exec();

    return updated!;
  }

  /**
   * Clones an existing template, creating a copy with a new name.
   */
  async cloneTemplate(businessId: string, templateId: string): Promise<IInvoiceTemplate> {
    const existing = await this.getTemplateById(businessId, templateId);
    const existingObj = existing.toObject() as any;

    return this.createTemplate(businessId, {
      name: `Copy of ${existing.name}`,
      documentType: existing.documentType,
      templateMode: existing.templateMode,
      paperSize: existing.paperSize,
      orientation: existing.orientation,
      pageMargins: existingObj.pageMargins,
      letterheadConfig: existingObj.letterheadConfig,
      logoConfig: existingObj.logoConfig,
      companyHeaderConfig: existingObj.companyHeaderConfig,
      signatoryConfig: existingObj.signatoryConfig,
      headerConfig: existing.headerConfig,
      itemColumns: existingObj.itemColumns,
      fieldVisibility: existingObj.fieldVisibility,
      sectionOrder: existing.sectionOrder,
      styling: existingObj.styling,
      termsText: existing.termsText,
      declarationText: existing.declarationText,
      notesText: existing.notesText,
    } as any);
  }

  /**
   * Sets a template as the default active template for its documentType.
   */
  async setDefaultTemplate(businessId: string, templateId: string): Promise<IInvoiceTemplate> {
    const template = await this.getTemplateById(businessId, templateId);
    const bId = new Types.ObjectId(businessId);

    // Remove isDefault from all other templates of same documentType
    await InvoiceTemplateModel.updateMany(
      { businessId: bId, documentType: template.documentType },
      { $set: { isDefault: false } }
    ).exec();

    template.isDefault = true;
    await template.save();

    return template;
  }

  /**
   * Deletes a template. Guards against deleting the only default template.
   */
  async deleteTemplate(businessId: string, templateId: string): Promise<{ success: boolean }> {
    const template = await this.getTemplateById(businessId, templateId);
    if (template.isDefault) {
      throw new BusinessRuleError('Cannot delete default active template. Please set another template as default first.');
    }

    const bId = new Types.ObjectId(businessId);
    await InvoiceTemplateModel.deleteOne({ _id: templateId, businessId: bId }).exec();
    return { success: true };
  }

  /**
   * Returns the template configuration as a serializable plain object for snapshotting.
   * This snapshot is stored immutably inside the invoice when it is issued.
   */
  buildTemplateSnapshot(template: IInvoiceTemplate, logoUrl?: string, signatureUrl?: string): Record<string, unknown> {
    const t = template.toObject() as any;
    return {
      templateId:          t._id?.toString(),
      templateVersion:     t.version,
      templateMode:        t.templateMode,
      paperSize:           t.paperSize,
      orientation:         t.orientation,
      pageMargins:         t.pageMargins,
      letterheadConfig:    t.letterheadConfig,
      logoConfig:          t.logoConfig,
      companyHeaderConfig: t.companyHeaderConfig,
      signatoryConfig:     t.signatoryConfig,
      headerConfig:        t.headerConfig,
      itemColumns:         t.itemColumns,
      fieldVisibility:     t.fieldVisibility,
      sectionOrder:        t.sectionOrder,
      styling:             t.styling,
      termsText:           t.termsText,
      declarationText:     t.declarationText,
      notesText:           t.notesText,
      logoUrl:             logoUrl,
      signatureUrl:        signatureUrl,
      snapshotAt:          new Date().toISOString(),
    };
  }
}

export const invoiceTemplateService = new InvoiceTemplateService();

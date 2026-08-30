/**
 * Multi-Template Document Engine & Field Policy Service
 * src/services/invoice-template.service.ts
 *
 * Rules:
 * 1. Multi-Template CRUD: Businesses can create, list, edit, clone, select default, and delete templates.
 * 2. Active Default Guard: Default active templates CANNOT be deleted without first selecting another template as default.
 * 3. Rule 46 Field Policy: Statutory mandatory fields (Business Name, GSTIN, Invoice #, Date, HSN/SAC, Values, Tax Rates, Tax Amounts, Totals) are non-removable.
 * 4. Tenant Isolation: All operations are strictly scoped to authenticated user's businessId.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceTemplateModel, IInvoiceTemplate } from '@/db/models/invoice-template.model';
import { ApplicationError, NotFoundError, BusinessRuleError, ValidationError } from '@/lib/errors';

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
        name: 'Default Classic GST Invoice',
        code: 'DEFAULT_GST',
        documentType: 'TAX_INVOICE',
        isDefault: true,
        version: 1,
        headerConfig: {
          layout: 'LOGO_LEFT',
          showLogo: true,
          showTagline: true,
          showPhone: true,
          showEmail: true,
        },
        fieldVisibility: {
          businessPan: false,
          businessCin: false,
          businessWebsite: false,
          customerPhone: true,
          customerEmail: true,
          shippingAddress: true,
          vehicleNumber: false,
          transportMode: false,
          eWayBillNumber: false,
          bankDetails: true,
          paymentQrCode: true,
          termsAndConditions: true,
          declaration: true,
          authorizedSignature: true,
          customerSignature: false,
        },
        sectionOrder: [
          'HEADER',
          'CUSTOMER_DETAILS',
          'INVOICE_META',
          'ITEM_TABLE',
          'TAX_SUMMARY',
          'BANK_DETAILS',
          'TERMS',
          'SIGNATURE',
        ],
        colorTheme: {
          primaryColor: '#0f172a',
          accentColor: '#2563eb',
        },
        termsText: '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
        declarationText: 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
      });
    }

    return template;
  }

  /**
   * Lists all document templates for a business.
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
      name: payload.name.trim(),
      code,
      documentType: payload.documentType || 'TAX_INVOICE',
      isDefault: false,
      version: 1,
      headerConfig: payload.headerConfig || {
        layout: 'LOGO_LEFT',
        showLogo: true,
        showTagline: true,
        showPhone: true,
        showEmail: true,
      },
      fieldVisibility: payload.fieldVisibility || {
        businessPan: false,
        businessCin: false,
        businessWebsite: false,
        customerPhone: true,
        customerEmail: true,
        shippingAddress: true,
        vehicleNumber: false,
        transportMode: false,
        eWayBillNumber: false,
        bankDetails: true,
        paymentQrCode: true,
        termsAndConditions: true,
        declaration: true,
        authorizedSignature: true,
        customerSignature: false,
      },
      sectionOrder: payload.sectionOrder || [
        'HEADER',
        'CUSTOMER_DETAILS',
        'INVOICE_META',
        'ITEM_TABLE',
        'TAX_SUMMARY',
        'BANK_DETAILS',
        'TERMS',
        'SIGNATURE',
      ],
      colorTheme: payload.colorTheme || {
        primaryColor: '#0f172a',
        accentColor: '#2563eb',
      },
      termsText: payload.termsText || '1. Goods once sold will not be taken back.\n2. All disputes subject to local jurisdiction.',
      declarationText: payload.declarationText || 'We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.',
    });

    return newTemplate;
  }

  /**
   * Updates an existing document template.
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

    // Sanitize payload: avoid overwriting internal Mongoose Document fields
    const { _id, businessId: _, createdAt, updatedAt, __v, schema, collection, db, isNew, errors, ...cleanPayload } = payload as any;

    if (cleanPayload.fieldVisibility) {
      cleanPayload.fieldVisibility = {
        ...existing.fieldVisibility,
        ...cleanPayload.fieldVisibility,
      };
    }

    const updated = await InvoiceTemplateModel.findOneAndUpdate(
      { _id: templateId, businessId: bId },
      { $set: cleanPayload, $inc: { version: 1 } },
      { new: true }
    ).exec();

    return updated!;
  }

  /**
   * Clones / duplicates an existing template.
   */
  async cloneTemplate(businessId: string, templateId: string): Promise<IInvoiceTemplate> {
    const existing = await this.getTemplateById(businessId, templateId);
    return this.createTemplate(businessId, {
      name: `Copy of ${existing.name}`,
      documentType: existing.documentType,
      headerConfig: existing.headerConfig,
      fieldVisibility: existing.fieldVisibility,
      sectionOrder: existing.sectionOrder,
      colorTheme: existing.colorTheme,
      termsText: existing.termsText,
      declarationText: existing.declarationText,
    });
  }

  /**
   * Sets a template as the default active template for its documentType.
   */
  async setDefaultTemplate(businessId: string, templateId: string): Promise<IInvoiceTemplate> {
    const template = await this.getTemplateById(businessId, templateId);
    const bId = new Types.ObjectId(businessId);

    // Remove isDefault flag from all other templates of same documentType
    await InvoiceTemplateModel.updateMany(
      { businessId: bId, documentType: template.documentType },
      { $set: { isDefault: false } }
    ).exec();

    // Set this template as default
    template.isDefault = true;
    await template.save();

    return template;
  }

  /**
   * Deletes a template. Guards against deleting default active template.
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
}

export const invoiceTemplateService = new InvoiceTemplateService();

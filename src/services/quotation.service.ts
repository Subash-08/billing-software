/**
 * Quotation Service
 * src/services/quotation.service.ts
 *
 * Manages Quotation creation, status transitions, and conversion to Sales Orders / Invoices.
 * Quotations are non-receivable, non-tax commercial documents.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { QuotationModel, IQuotation } from '@/db/models/quotation.model';
import { documentNumberService } from './document-number.service';
import { toFinancialYear } from '@/lib/business-date';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface CreateQuotationInput {
  customerId: string;
  quotationDate: string; // YYYY-MM-DD
  validUntil?: string;
  notes?: string;
  termsAndConditions?: string;
  items: Array<{
    itemId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    description?: string;
    hsnCode?: string;
    sacCode?: string;
    quantity: number;
    unit: string;
    rate: number;
    isPriceInclusiveOfGst?: boolean;
    discountType?: 'FIXED' | 'PERCENTAGE';
    discountValue?: number;
    gstRate?: number;
    taxTreatment?: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  }>;
}

export class QuotationService {
  async createQuotation(businessId: string, input: CreateQuotationInput): Promise<IQuotation> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);

    const quotationDate = new Date(input.quotationDate);
    const financialYear = toFinancialYear(input.quotationDate);

    // Reserve Quotation Document Number (QUO series)
    const quotationNumber = await documentNumberService.generateDocumentNumber(
      businessId,
      'QUOTATION',
      quotationDate
    );

    let subTotalPaise = 0;
    let totalDiscountPaise = 0;
    let totalTaxablePaise = 0;
    let totalTaxPaise = 0;

    const items = input.items.map((it) => {
      const ratePaise = rupeesToPaise(it.rate);
      const grossPaise = Math.round(it.quantity * ratePaise);
      const discountValue = it.discountValue || 0;
      let discountPaise = 0;

      if (it.discountType === 'PERCENTAGE') {
        discountPaise = Math.round((grossPaise * discountValue) / 100);
      } else if (it.discountType === 'FIXED') {
        discountPaise = rupeesToPaise(discountValue);
      }

      const taxablePaise = Math.max(0, grossPaise - discountPaise);
      const gstRate = it.gstRate ?? 18;
      const taxPaise = Math.round((taxablePaise * gstRate) / 100);
      const totalLinePaise = taxablePaise + taxPaise;

      subTotalPaise += grossPaise;
      totalDiscountPaise += discountPaise;
      totalTaxablePaise += taxablePaise;
      totalTaxPaise += taxPaise;

      return {
        itemId: it.itemId ? new Types.ObjectId(it.itemId) : undefined,
        itemType: it.itemType || 'GOODS',
        name: it.name,
        description: it.description,
        hsnCode: it.hsnCode,
        sacCode: it.sacCode,
        quantity: it.quantity,
        unit: it.unit,
        enteredRatePaise: ratePaise,
        isPriceInclusiveOfGst: Boolean(it.isPriceInclusiveOfGst),
        discountType: it.discountType,
        discountValueRaw: discountValue,
        discountAmountPaise: discountPaise,
        taxTreatment: it.taxTreatment || 'TAXABLE',
        gstRate,
        taxRateId: 'default',
        taxableAmountPaise: taxablePaise,
        cgstRate: gstRate / 2,
        sgstRate: gstRate / 2,
        igstRate: gstRate,
        cgstAmountPaise: Math.round(taxPaise / 2),
        sgstAmountPaise: Math.round(taxPaise / 2),
        igstAmountPaise: taxPaise,
        cessRate: 0,
        cessAmountPaise: 0,
        totalAmountPaise: totalLinePaise,
      };
    });

    const grandTotalPaise = totalTaxablePaise + totalTaxPaise;

    const quotation = new QuotationModel({
      businessId: bId,
      customerId: cId,
      quotationNumber,
      financialYear,
      status: 'DRAFT',
      quotationDate,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      items,
      subTotalPaise,
      totalDiscountPaise,
      totalTaxablePaise,
      totalTaxPaise,
      grandTotalPaise,
    });

    return quotation.save();
  }

  async listQuotations(businessId: string, filters: { page?: number; limit?: number; search?: string; status?: string }) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: bId };
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { quotationNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      QuotationModel.find(query).sort({ quotationDate: -1, _id: -1 }).skip(skip).limit(limit).lean().exec(),
      QuotationModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateStatus(businessId: string, quotationId: string, status: string): Promise<IQuotation> {
    await connectToDatabase();
    const q = await QuotationModel.findOne({ _id: quotationId, businessId });
    if (!q) throw new NotFoundError('Quotation not found');
    q.status = status as any;
    return q.save();
  }
}

export const quotationService = new QuotationService();

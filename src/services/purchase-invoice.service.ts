import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { PurchaseInvoiceModel, IPurchaseInvoice } from '@/db/models/purchase-invoice.model';
import { SupplierModel } from '@/db/models/supplier.model';
import { BusinessModel } from '@/db/models/business.model';
import { ProductModel } from '@/db/models/product.model';
import { calculateInvoice } from '@/engine/invoice/invoice.calculator';
import { resolveTaxRate } from '@/engine/gst/gst.rate-resolver';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';
import { inventoryService } from '@/services/inventory.service';
import { rupeesToPaise } from '@/lib/money';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';

export interface CreatePurchaseItemInput {
  productId?: string;
  itemType?: 'GOODS' | 'SERVICES';
  name: string;
  hsnSacCode?: string;
  quantity: number;
  unit?: string;
  rate: number; // in rupees
  isPriceInclusiveOfGst?: boolean;
  gstRate: number;
}

export interface CreatePurchaseInvoiceInput {
  supplierId: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  purchaseDate?: string;
  notes?: string;
  items: CreatePurchaseItemInput[];
}

export class PurchaseInvoiceService {
  async recordPurchaseInvoice(
    businessId: string,
    userId: string,
    input: CreatePurchaseInvoiceInput
  ): Promise<IPurchaseInvoice> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const sId = new Types.ObjectId(input.supplierId);

    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Purchase invoice must contain at least one item');
    }

    const business = await BusinessModel.findById(bId).lean().exec();
    if (!business) throw new NotFoundError(`Business '${businessId}' not found`);

    const supplier = await SupplierModel.findOne({ _id: sId, businessId: bId }).exec();
    if (!supplier) throw new NotFoundError(`Supplier '${input.supplierId}' not found`);

    const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
    const pos = supplier.stateCode || supplier.address?.stateCode || business.stateCode || '33';
    const bizState = business.stateCode || '33';

    const preparedItems: any[] = [];
    for (const item of input.items) {
      const itemType = item.itemType || 'GOODS';
      const ratePaise = rupeesToPaise(item.rate);
      const resolvedTax = await resolveTaxRate(item.gstRate, purchaseDate);

      preparedItems.push({
        productId: item.productId ? new Types.ObjectId(item.productId) : undefined,
        itemType,
        name: item.name,
        classificationCode: {
          type: itemType === 'SERVICES' ? 'SAC' : 'HSN',
          code: item.hsnSacCode || (itemType === 'SERVICES' ? '998314' : '8471'),
        },
        quantity: item.quantity,
        freeQuantity: 0,
        unit: item.unit || (itemType === 'SERVICES' ? 'JOB' : 'PCS'),
        uqc: item.unit || (itemType === 'SERVICES' ? 'JOB' : 'PCS'),
        ratePaise,
        resolvedTaxRate: resolvedTax,
        isPriceInclusiveOfGst: Boolean(item.isPriceInclusiveOfGst),
        hsnCode: itemType === 'GOODS' ? item.hsnSacCode : undefined,
        sacCode: itemType === 'SERVICES' ? item.hsnSacCode : undefined,
        gstRate: item.gstRate,
      });
    }

    // Authoritative calculation via Central GST Engine
    const calcResult = calculateInvoice({
      supplierStateCode: pos, // In purchases, supplier is seller
      placeOfSupplyStateCode: bizState, // Business is buyer
      items: preparedItems,
      roundOffPolicy: 'NEAREST_RUPEE',
    });

    const fy = '2026-27';
    const seq = await documentSequenceRepository.getNextSequenceNumber(businessId, 'PURCHASE' as any, 'PUR', fy);
    const purchaseNumber = `PUR-${fy.replace('-', '')}-${seq.toString().padStart(4, '0')}`;

    const snapshotItems = calcResult.items.map((resItem, idx) => {
      const prep = preparedItems[idx];
      return {
        productId: prep.productId,
        itemType: prep.itemType,
        name: resItem.name,
        hsnCode: prep.hsnCode,
        sacCode: prep.sacCode,
        quantity: resItem.quantity,
        unit: prep.unit,
        ratePaise: resItem.enteredRatePaise,
        isPriceInclusiveOfGst: prep.isPriceInclusiveOfGst,
        taxableAmountPaise: resItem.taxablePaise,
        gstRate: prep.gstRate,
        cgstRate: resItem.gstResult.cgstRate,
        sgstRate: resItem.gstResult.sgstRate,
        igstRate: resItem.gstResult.igstRate,
        utgstRate: resItem.gstResult.utgstRate || 0,
        cessRate: resItem.gstResult.cessRate || 0,
        cgstAmountPaise: resItem.resolvedCgstPaise,
        sgstAmountPaise: resItem.resolvedSgstPaise,
        igstAmountPaise: resItem.resolvedIgstPaise,
        utgstAmountPaise: resItem.resolvedUtgstPaise || 0,
        cessAmountPaise: resItem.gstResult.cessPaise || 0,
        totalAmountPaise: resItem.totalAmountPaise,
      };
    });

    const purchaseInvoice = await PurchaseInvoiceModel.create({
      businessId: bId,
      supplierId: sId,
      purchaseNumber,
      supplierInvoiceNumber: input.supplierInvoiceNumber,
      supplierInvoiceDate: input.supplierInvoiceDate ? new Date(input.supplierInvoiceDate) : undefined,
      financialYear: fy,
      purchaseDate,
      status: 'RECORDED',
      paymentStatus: 'UNPAID',
      supplierSnapshot: {
        name: supplier.name,
        legalName: supplier.legalName,
        gstin: supplier.gstin,
        stateCode: supplier.stateCode,
        addressLine: supplier.address?.addressLine1,
      },
      items: snapshotItems,
      subTotalPaise: calcResult.subTotalPaise,
      totalTaxablePaise: calcResult.totalTaxablePaise,
      totalCgstPaise: calcResult.totalCgstPaise,
      totalSgstPaise: calcResult.totalSgstPaise,
      totalUtgstPaise: calcResult.totalUtgstPaise || 0,
      totalIgstPaise: calcResult.totalIgstPaise,
      totalCessPaise: calcResult.totalCessPaise || 0,
      roundOffPaise: calcResult.roundOffPaise,
      grandTotalPaise: calcResult.grandTotalPaise,
      paidAmountPaise: 0,
      outstandingBalancePaise: calcResult.grandTotalPaise,
      notes: input.notes,
      recordedBy: new Types.ObjectId(userId),
    });

    // Update Supplier outstanding balance
    supplier.outstandingBalancePaise = (supplier.outstandingBalancePaise || 0) + calcResult.grandTotalPaise;
    await supplier.save();

    // Auto-increase product stock for GOODS items
    for (const item of snapshotItems) {
      if (item.itemType === 'GOODS' && item.productId) {
        await inventoryService.recordMovement(businessId, {
          productId: item.productId.toString(),
          type: 'PURCHASE',
          quantity: item.quantity,
          unit: item.unit,
          referenceType: 'PURCHASE_ORDER',
          referenceId: purchaseInvoice._id.toString(),
          referenceNumber: purchaseNumber,
          notes: `Stock inward for recorded purchase ${purchaseNumber}`,
          createdBy: userId,
        });
      }
    }

    await auditLogRepository.log(bId, {
      userId: new Types.ObjectId(userId),
      action: 'PURCHASE_INVOICE_RECORDED',
      resource: 'PURCHASE_INVOICE',
      resourceId: purchaseInvoice._id.toString(),
      metadata: { purchaseNumber, grandTotalPaise: calcResult.grandTotalPaise },
    });

    return purchaseInvoice;
  }

  async listPurchaseInvoices(
    businessId: string,
    query: { supplierId?: string; status?: string; page?: number; limit?: number } = {}
  ): Promise<{ purchases: IPurchaseInvoice[]; total: number; page: number; limit: number }> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { businessId: bId };
    if (query.supplierId) filter.supplierId = new Types.ObjectId(query.supplierId);
    if (query.status) filter.status = query.status;

    const [purchases, total] = await Promise.all([
      PurchaseInvoiceModel.find(filter).sort({ purchaseDate: -1 }).skip(skip).limit(limit).lean().exec(),
      PurchaseInvoiceModel.countDocuments(filter).exec(),
    ]);

    return { purchases: purchases as any, total, page, limit };
  }
}

export const purchaseInvoiceService = new PurchaseInvoiceService();

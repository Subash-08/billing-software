import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { PurchaseReturnModel, IPurchaseReturn } from '@/db/models/purchase-return.model';
import { PurchaseInvoiceModel } from '@/db/models/purchase-invoice.model';
import { SupplierModel } from '@/db/models/supplier.model';
import { inventoryService } from '@/services/inventory.service';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';
import { rupeesToPaise } from '@/lib/money';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';

export interface CreatePurchaseReturnInput {
  supplierId: string;
  purchaseInvoiceId?: string;
  reason: string;
  items: Array<{
    productId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    hsnSacCode?: string;
    quantity: number;
    unit?: string;
    rate: number; // in rupees
    gstRate: number;
  }>;
}

export class PurchaseReturnService {
  async createPurchaseReturn(
    businessId: string,
    userId: string,
    input: CreatePurchaseReturnInput
  ): Promise<IPurchaseReturn> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const sId = new Types.ObjectId(input.supplierId);

    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Purchase return must contain at least one line item');
    }

    const supplier = await SupplierModel.findOne({ _id: sId, businessId: bId }).exec();
    if (!supplier) throw new NotFoundError(`Supplier '${input.supplierId}' not found`);

    let origPurchase = null;
    if (input.purchaseInvoiceId) {
      origPurchase = await PurchaseInvoiceModel.findOne({
        _id: new Types.ObjectId(input.purchaseInvoiceId),
        businessId: bId,
      }).lean().exec();
      if (!origPurchase) throw new NotFoundError(`Purchase invoice '${input.purchaseInvoiceId}' not found`);
    }

    let totalTaxablePaise = 0;
    let totalTaxPaise = 0;
    let grandTotalPaise = 0;

    const returnItemsSnapshot = input.items.map(it => {
      const itemType = it.itemType || 'GOODS';
      const ratePaise = rupeesToPaise(it.rate);
      const grossPaise = Math.round(it.quantity * ratePaise);
      const gstRate = it.gstRate || 0;
      const taxPaise = Math.round(grossPaise * (gstRate / 100));
      const lineTotalPaise = grossPaise + taxPaise;

      totalTaxablePaise += grossPaise;
      totalTaxPaise += taxPaise;
      grandTotalPaise += lineTotalPaise;

      return {
        productId: it.productId ? new Types.ObjectId(it.productId) : undefined,
        itemType,
        name: it.name,
        hsnCode: itemType === 'GOODS' ? it.hsnSacCode : undefined,
        sacCode: itemType === 'SERVICES' ? it.hsnSacCode : undefined,
        quantity: it.quantity,
        unit: it.unit || (itemType === 'SERVICES' ? 'JOB' : 'PCS'),
        ratePaise,
        taxableAmountPaise: grossPaise,
        gstRate,
        cgstAmountPaise: Math.floor(taxPaise / 2),
        sgstAmountPaise: Math.floor(taxPaise / 2),
        igstAmountPaise: 0,
        totalAmountPaise: lineTotalPaise,
      };
    });

    const fy = '2026-27';
    const seq = await documentSequenceRepository.getNextSequenceNumber(businessId, 'PURCHASE_RETURN' as any, 'PR', fy);
    const purchaseReturnNumber = `PR-${fy.replace('-', '')}-${seq.toString().padStart(4, '0')}`;

    const purchaseReturn = await PurchaseReturnModel.create({
      businessId: bId,
      supplierId: sId,
      purchaseInvoiceId: origPurchase ? origPurchase._id : undefined,
      purchaseReturnNumber,
      returnDate: new Date(),
      reason: input.reason,
      items: returnItemsSnapshot,
      totalTaxablePaise,
      totalTaxPaise,
      grandTotalPaise,
      status: 'ISSUED',
      createdBy: new Types.ObjectId(userId),
    });

    // Reduce Supplier outstanding balance
    supplier.outstandingBalancePaise = Math.max(0, (supplier.outstandingBalancePaise || 0) - grandTotalPaise);
    await supplier.save();

    // Decrement product stock for returned GOODS items
    for (const item of returnItemsSnapshot) {
      if (item.itemType === 'GOODS' && item.productId) {
        await inventoryService.recordMovement(businessId, {
          productId: item.productId.toString(),
          type: 'ADJUSTMENT_OUT',
          quantity: item.quantity,
          unit: item.unit,
          referenceType: 'PURCHASE_ORDER',
          referenceId: purchaseReturn._id.toString(),
          referenceNumber: purchaseReturnNumber,
          notes: `Stock reduction for purchase return ${purchaseReturnNumber}`,
          createdBy: userId,
        });
      }
    }

    await auditLogRepository.log(bId, {
      userId: new Types.ObjectId(userId),
      action: 'PURCHASE_RETURN_CREATED',
      resource: 'PURCHASE_RETURN',
      resourceId: purchaseReturn._id.toString(),
      metadata: { purchaseReturnNumber, grandTotalPaise },
    });

    return purchaseReturn;
  }
}

export const purchaseReturnService = new PurchaseReturnService();

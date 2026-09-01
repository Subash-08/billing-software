/**
 * Sales Order Service
 * src/services/sales-order.service.ts
 *
 * Manages Sales Orders with line-level quantity tracking:
 *   orderedQty   — committed quantity
 *   deliveredQty — quantity dispatched on delivery challans
 *   invoicedQty  — quantity billed on invoices
 *   cancelledQty — quantity cancelled
 *   pendingQty   — orderedQty - deliveredQty - cancelledQty
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { SalesOrderModel, ISalesOrder } from '@/db/models/sales-order.model';
import { documentNumberService } from './document-number.service';
import { toFinancialYear } from '@/lib/business-date';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface CreateSalesOrderInput {
  customerId: string;
  quotationId?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  supplyType?: 'B2B' | 'B2C' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'EXPORT_WITH_PAYMENT' | 'EXPORT_WITHOUT_PAYMENT';
  placeOfSupplyStateCode: string;
  notes?: string;
  termsAndConditions?: string;
  items: Array<{
    itemId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    description?: string;
    hsnCode?: string;
    sacCode?: string;
    orderedQty: number;
    unit: string;
    rate: number;
    isPriceInclusiveOfGst?: boolean;
    discountType?: 'FIXED' | 'PERCENTAGE';
    discountValue?: number;
    gstRate?: number;
    taxTreatment?: 'TAXABLE' | 'NIL_RATED' | 'EXEMPT' | 'NON_GST' | 'ZERO_RATED';
  }>;
}

export class SalesOrderService {
  async createSalesOrder(businessId: string, input: CreateSalesOrderInput): Promise<ISalesOrder> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);

    const orderDate = new Date(input.orderDate);
    const financialYear = toFinancialYear(input.orderDate);

    // Reserve Sales Order Document Number (SO series)
    const orderNumber = await documentNumberService.generateDocumentNumber(
      businessId,
      'SALES_ORDER',
      orderDate
    );

    let totalOrderedValuePaise = 0;

    const items = input.items.map((it) => {
      const ratePaise = rupeesToPaise(it.rate);
      const grossPaise = Math.round(it.orderedQty * ratePaise);
      totalOrderedValuePaise += grossPaise;

      return {
        itemId: it.itemId ? new Types.ObjectId(it.itemId) : undefined,
        itemType: it.itemType || 'GOODS',
        name: it.name,
        description: it.description,
        hsnCode: it.hsnCode,
        sacCode: it.sacCode,
        unit: it.unit,
        orderedQty: it.orderedQty,
        deliveredQty: 0,
        invoicedQty: 0,
        cancelledQty: 0,
        pendingQty: it.orderedQty, // Invariant: pendingQty = orderedQty - deliveredQty - cancelledQty
        enteredRatePaise: ratePaise,
        isPriceInclusiveOfGst: Boolean(it.isPriceInclusiveOfGst),
        discountType: it.discountType,
        discountValueRaw: it.discountValue || 0,
        taxTreatment: it.taxTreatment || 'TAXABLE',
        gstRate: it.gstRate ?? 18,
        taxRateId: 'default',
      };
    });

    const salesOrder = new SalesOrderModel({
      businessId: bId,
      customerId: cId,
      orderNumber,
      financialYear,
      status: 'OPEN',
      quotationId: input.quotationId ? new Types.ObjectId(input.quotationId) : undefined,
      orderDate,
      expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : undefined,
      supplyType: input.supplyType || 'B2B',
      placeOfSupplyStateCode: input.placeOfSupplyStateCode,
      notes: input.notes,
      termsAndConditions: input.termsAndConditions,
      items,
      totalOrderedValuePaise,
    });

    return salesOrder.save();
  }

  async listSalesOrders(businessId: string, filters: { page?: number; limit?: number; search?: string; status?: string }) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: bId };
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [{ orderNumber: { $regex: filters.search, $options: 'i' } }];
    }

    const [items, total] = await Promise.all([
      SalesOrderModel.find(query).sort({ orderDate: -1, _id: -1 }).skip(skip).limit(limit).lean().exec(),
      SalesOrderModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getSalesOrder(businessId: string, salesOrderId: string): Promise<ISalesOrder> {
    await connectToDatabase();
    const so = await SalesOrderModel.findOne({ _id: salesOrderId, businessId });
    if (!so) throw new NotFoundError('Sales Order not found');
    return so;
  }
}

export const salesOrderService = new SalesOrderService();

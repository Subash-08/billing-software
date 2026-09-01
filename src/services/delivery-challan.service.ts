/**
 * Delivery Challan Service
 * src/services/delivery-challan.service.ts
 *
 * Manages Delivery Challans for goods movement per Rule 55.
 * Tracks deliveryReason (SUPPLY, JOB_WORK, APPROVAL, REPAIR, RETURN, OTHER)
 * and whether an invoice is required.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { DeliveryChallanModel, IDeliveryChallan, DeliveryReason } from '@/db/models/delivery-challan.model';
import { SalesOrderModel } from '@/db/models/sales-order.model';
import { documentNumberService } from './document-number.service';
import { toFinancialYear } from '@/lib/business-date';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface CreateDeliveryChallanInput {
  customerId: string;
  salesOrderId?: string;
  deliveryReason: DeliveryReason;
  invoiceRequired: boolean;
  challanDate: string;
  dispatchDate?: string;
  transportMode?: string;
  vehicleNumber?: string;
  ewayBillNumber?: string;
  shippingAddress?: {
    addressLine1: string;
    city: string;
    state: string;
    stateCode: string;
    pincode?: string;
  };
  notes?: string;
  items: Array<{
    itemId?: string;
    itemType?: 'GOODS' | 'SERVICES';
    name: string;
    description?: string;
    hsnCode?: string;
    sacCode?: string;
    unit: string;
    quantity: number;
    rate?: number;
    notes?: string;
  }>;
}

export class DeliveryChallanService {
  async createDeliveryChallan(businessId: string, input: CreateDeliveryChallanInput): Promise<IDeliveryChallan> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);

    const challanDate = new Date(input.challanDate);
    const financialYear = toFinancialYear(input.challanDate);

    // Reserve Delivery Challan Document Number (DC series)
    const challanNumber = await documentNumberService.generateDocumentNumber(
      businessId,
      'DELIVERY_CHALLAN',
      challanDate
    );

    const items = input.items.map((it) => ({
      itemId: it.itemId ? new Types.ObjectId(it.itemId) : undefined,
      itemType: it.itemType || 'GOODS',
      name: it.name,
      description: it.description,
      hsnCode: it.hsnCode,
      sacCode: it.sacCode,
      unit: it.unit,
      quantity: it.quantity,
      enteredRatePaise: rupeesToPaise(it.rate || 0),
      notes: it.notes,
    }));

    const challan = new DeliveryChallanModel({
      businessId: bId,
      customerId: cId,
      challanNumber,
      financialYear,
      status: 'DISPATCHED',
      deliveryReason: input.deliveryReason,
      invoiceRequired: input.invoiceRequired,
      salesOrderId: input.salesOrderId ? new Types.ObjectId(input.salesOrderId) : undefined,
      challanDate,
      dispatchDate: input.dispatchDate ? new Date(input.dispatchDate) : undefined,
      transportMode: input.transportMode,
      vehicleNumber: input.vehicleNumber,
      ewayBillNumber: input.ewayBillNumber,
      shippingAddress: input.shippingAddress,
      notes: input.notes,
      items,
    });

    const savedChallan = await challan.save();

    // If linked to a Sales Order, update line-level deliveredQty & status
    if (input.salesOrderId) {
      const so: any = await SalesOrderModel.findOne({ _id: input.salesOrderId, businessId: bId });
      if (so && Array.isArray(so.items)) {
        for (const dcItem of input.items) {
          const soLine = so.items.find((l: any) => l.name === dcItem.name || (l.itemId && dcItem.itemId && l.itemId.toString() === dcItem.itemId.toString()));
          if (soLine) {
            soLine.deliveredQty = Math.min(soLine.orderedQty, (soLine.deliveredQty || 0) + dcItem.quantity);
            soLine.pendingQty = Math.max(0, soLine.orderedQty - soLine.deliveredQty - (soLine.cancelledQty || 0));
          }
        }
        // Update SO status
        const allFulfilled = so.items.every((l: any) => (l.pendingQty || 0) <= 0);
        const anyDelivered = so.items.some((l: any) => (l.deliveredQty || 0) > 0);
        so.status = allFulfilled ? 'FULFILLED' : anyDelivered ? 'PARTIAL' : 'OPEN';
        await so.save();
      }
    }

    return savedChallan;
  }

  async listDeliveryChallans(businessId: string, filters: { page?: number; limit?: number; search?: string; status?: string }) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { businessId: bId };
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [{ challanNumber: { $regex: filters.search, $options: 'i' } }];
    }

    const [items, total] = await Promise.all([
      DeliveryChallanModel.find(query).sort({ challanDate: -1, _id: -1 }).skip(skip).limit(limit).lean().exec(),
      DeliveryChallanModel.countDocuments(query).exec(),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

export const deliveryChallanService = new DeliveryChallanService();

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { SupplierModel, ISupplier } from '@/db/models/supplier.model';
import { PurchaseInvoiceModel } from '@/db/models/purchase-invoice.model';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';

export interface CreateSupplierInput {
  name: string;
  legalName?: string;
  gstin?: string;
  gstTreatment?: 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'OVERSEAS';
  stateCode: string;
  phone?: string;
  email?: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district?: string;
    state: string;
    stateCode: string;
    pincode: string;
    country?: string;
  };
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branch?: string;
  };
}

export class SupplierService {
  async createSupplier(businessId: string, userId: string, data: CreateSupplierInput): Promise<ISupplier> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const supplier = await SupplierModel.create({
      businessId: bId,
      name: data.name,
      legalName: data.legalName,
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : undefined,
      gstTreatment: data.gstTreatment || (data.gstin ? 'REGISTERED' : 'UNREGISTERED'),
      stateCode: data.stateCode,
      phone: data.phone,
      email: data.email,
      address: data.address,
      bankDetails: data.bankDetails,
      outstandingBalancePaise: 0,
      status: 'ACTIVE',
    });

    await auditLogRepository.log(bId, {
      userId: new Types.ObjectId(userId),
      action: 'SUPPLIER_CREATED',
      resource: 'SUPPLIER',
      resourceId: supplier._id.toString(),
      metadata: { name: supplier.name, gstin: supplier.gstin },
    });

    return supplier;
  }

  async listSuppliers(
    businessId: string,
    query: { search?: string; status?: string; page?: number; limit?: number } = {}
  ): Promise<{ suppliers: ISupplier[]; total: number; page: number; limit: number }> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { businessId: bId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { legalName: regex }, { gstin: regex }, { phone: regex }];
    }

    const [suppliers, total] = await Promise.all([
      SupplierModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      SupplierModel.countDocuments(filter).exec(),
    ]);

    return { suppliers: suppliers as any, total, page, limit };
  }

  async getSupplierById(businessId: string, supplierId: string): Promise<ISupplier> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const sId = new Types.ObjectId(supplierId);

    const supplier = await SupplierModel.findOne({ _id: sId, businessId: bId }).exec();
    if (!supplier) throw new NotFoundError(`Supplier '${supplierId}' not found`);

    return supplier;
  }

  async getSupplierStatement(
    businessId: string,
    supplierId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<{
    supplier: ISupplier;
    openingBalancePaise: number;
    purchases: any[];
    totalPurchasesPaise: number;
    totalPaidPaise: number;
    closingBalancePaise: number;
  }> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const sId = new Types.ObjectId(supplierId);

    const supplier = await SupplierModel.findOne({ _id: sId, businessId: bId }).lean().exec();
    if (!supplier) throw new NotFoundError(`Supplier '${supplierId}' not found`);

    const dateFilter: any = { businessId: bId, supplierId: sId, status: 'RECORDED' };
    if (options.startDate || options.endDate) {
      dateFilter.purchaseDate = {};
      if (options.startDate) dateFilter.purchaseDate.$gte = options.startDate;
      if (options.endDate) dateFilter.purchaseDate.$lte = options.endDate;
    }

    const purchases = await PurchaseInvoiceModel.find(dateFilter)
      .sort({ purchaseDate: 1 })
      .lean()
      .exec();

    const totalPurchasesPaise = purchases.reduce((acc, p) => acc + p.grandTotalPaise, 0);
    const totalPaidPaise = purchases.reduce((acc, p) => acc + p.paidAmountPaise, 0);
    const closingBalancePaise = purchases.reduce((acc, p) => acc + p.outstandingBalancePaise, 0);

    return {
      supplier: supplier as any,
      openingBalancePaise: 0,
      purchases,
      totalPurchasesPaise,
      totalPaidPaise,
      closingBalancePaise,
    };
  }
}

export const supplierService = new SupplierService();

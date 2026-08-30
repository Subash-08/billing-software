import { Types } from 'mongoose';
import { CustomerModel, ICustomer, ICustomerAddress } from '../models/customer.model';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export interface CustomerListFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  gstTreatment?: string;
  customerType?: 'BUSINESS' | 'INDIVIDUAL';
  search?: string;
}

export interface ListOptions {
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CustomerRepository {
  async create(businessId: string | Types.ObjectId, data: Partial<ICustomer>): Promise<ICustomer> {
    const bId = new Types.ObjectId(businessId.toString());

    // Explicit sanitize system fields
    const sanitizedData = { ...data };
    delete (sanitizedData as any)._id;
    delete (sanitizedData as any).businessId;
    delete (sanitizedData as any).creditBalance; // Controlled exclusively by Payment/Allocation domain

    const customer = new CustomerModel({ ...sanitizedData, businessId: bId, creditBalance: 0 });
    return customer.save();
  }

  async findById(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    return CustomerModel.findOne({ _id: cId, businessId: bId }).exec();
  }

  async findByPhone(
    businessId: string | Types.ObjectId,
    phone: string
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    return CustomerModel.findOne({ businessId: bId, phone: phone.trim() }).exec();
  }

  async findByGstin(
    businessId: string | Types.ObjectId,
    gstin: string
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    return CustomerModel.findOne({ businessId: bId, gstin: gstin.trim().toUpperCase() }).exec();
  }

  async list(
    businessId: string | Types.ObjectId,
    filters: CustomerListFilters = {},
    options: ListOptions = {}
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const bId = new Types.ObjectId(businessId.toString());
    const query: Record<string, any> = { businessId: bId };

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.gstTreatment) {
      query.gstTreatment = filters.gstTreatment;
    }
    if (filters.customerType) {
      query.customerType = filters.customerType;
    }
    if (filters.search && filters.search.trim().length > 0) {
      const escaped = escapeRegex(filters.search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { displayName: searchRegex },
        { legalName: searchRegex },
        { phone: searchRegex },
        { gstin: searchRegex },
        { email: searchRegex },
      ];
    }

    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const skip = Math.max(options.skip || 0, 0);
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const [customers, total] = await Promise.all([
      CustomerModel.find(query)
        .sort({ [sortBy]: sortOrder, _id: 1 }) // Tie-breaker for deterministic sorting
        .skip(skip)
        .limit(limit)
        .exec(),
      CustomerModel.countDocuments(query).exec(),
    ]);

    return { customers, total };
  }

  async update(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    data: Partial<ICustomer>
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    // Explicitly delete immutable and system-controlled fields to prevent client injection
    const updatePayload = { ...data };
    delete (updatePayload as any)._id;
    delete (updatePayload as any).businessId;
    delete (updatePayload as any).creditBalance;
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).updatedAt;

    return CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $set: updatePayload },
      { new: true }
    ).exec();
  }

  async deactivate(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    return CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $set: { status: 'INACTIVE' } },
      { new: true }
    ).exec();
  }

  async addShippingAddress(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    address: ICustomerAddress
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    const addressWithId = { ...address, id: address.id || new Types.ObjectId().toString() };

    return CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $push: { shippingAddresses: addressWithId } },
      { new: true }
    ).exec();
  }

  async updateShippingAddress(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    addressId: string,
    address: Partial<ICustomerAddress>
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    const customer = await CustomerModel.findOne({ _id: cId, businessId: bId }).exec();
    if (!customer) return null;

    const idx = customer.shippingAddresses.findIndex((a) => a.id === addressId);
    if (idx === -1) return null;

    customer.shippingAddresses[idx] = { ...customer.shippingAddresses[idx], ...address };
    return customer.save();
  }

  async removeShippingAddress(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    addressId: string
  ): Promise<ICustomer | null> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return null;
    const cId = new Types.ObjectId(customerId.toString());

    return CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $pull: { shippingAddresses: { id: addressId } } },
      { new: true }
    ).exec();
  }

  async delete(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<boolean> {
    const bId = new Types.ObjectId(businessId.toString());
    if (!Types.ObjectId.isValid(customerId)) return false;
    const cId = new Types.ObjectId(customerId.toString());

    const result = await CustomerModel.deleteOne({ _id: cId, businessId: bId }).exec();
    return result.deletedCount > 0;
  }
}

export const customerRepository = new CustomerRepository();

import { Types } from 'mongoose';
import { businessRepository } from '@/db/repositories/business.repository';
import { customerRepository, CustomerListFilters } from '@/db/repositories/customer.repository';
import { auditLogRepository } from '@/db/repositories/audit-log.repository';
import { ICustomer, ICustomerAddress } from '@/db/models/customer.model';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerAddressSchema,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerAddressInput,
} from '@/validations/customer.schema';

import { CustomerModel } from '@/db/models/customer.model';
import { deletionPolicyService } from '@/services/deletion-policy.service';

export class CustomerService {
  /**
   * Resolves Business context strictly from authenticated user ID
   */
  private async getBusinessByUserId(authenticatedUserId: string | Types.ObjectId) {
    const business = await businessRepository.findByUserId(authenticatedUserId);
    if (!business) {
      throw new ForbiddenError('No business profile associated with authenticated user');
    }
    return business;
  }

  /**
   * Enforces normalized GSTIN uniqueness per Business context
   */
  private async validateGstinUniqueness(
    businessId: Types.ObjectId,
    gstin?: string,
    excludeCustomerId?: string
  ) {
    if (!gstin || !gstin.trim()) return;
    const normalized = gstin.trim().toUpperCase();

    const existing = await CustomerModel.findOne({
      businessId,
      gstin: normalized,
      status: { $ne: 'ARCHIVED' },
    }).exec();

    if (existing && existing._id.toString() !== excludeCustomerId) {
      throw new ValidationError('A customer with this GSTIN already exists.');
    }
  }

  async createCustomer(
    authenticatedUserId: string | Types.ObjectId,
    input: CreateCustomerInput
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const validatedData = createCustomerSchema.parse(input);

    await this.validateGstinUniqueness(business._id, validatedData.gstin);

    const customer = await customerRepository.create(business._id, validatedData);

    // Audit Event
    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_CREATED',
      resource: 'CUSTOMER',
      resourceId: customer._id.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { displayName: customer.displayName, gstTreatment: customer.gstTreatment },
    });

    return customer;
  }

  async getCustomerById(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const customer = await customerRepository.findById(business._id, customerId);

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return customer;
  }

  async listCustomers(
    authenticatedUserId: string | Types.ObjectId,
    filters: CustomerListFilters = {},
    options: { limit?: number; skip?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    return customerRepository.list(business._id, filters, options);
  }

  async updateCustomer(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    input: UpdateCustomerInput
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const validatedData = updateCustomerSchema.parse(input);
    await this.validateGstinUniqueness(business._id, validatedData.gstin, customerId.toString());

    const updated = await customerRepository.update(business._id, customerId, validatedData);
    if (!updated) throw new NotFoundError('Failed to update customer');

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_UPDATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { displayName: updated.displayName },
    });

    return updated;
  }

  async archiveCustomer(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const archived = await customerRepository.update(business._id, customerId, { status: 'ARCHIVED' });
    if (!archived) throw new NotFoundError('Failed to archive customer');

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_DEACTIVATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { displayName: archived.displayName, actionType: 'ARCHIVE' },
    });

    return archived;
  }

  async deleteCustomer(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<{ success: boolean; action: 'DELETE' | 'ARCHIVE' }> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const policy = await deletionPolicyService.canDeleteCustomer(business._id, customerId);
    if (!policy.allowed) {
      throw new ValidationError(
        'Customer is referenced by issued financial records and cannot be permanently deleted. Use Archive Customer instead.'
      );
    }

    await customerRepository.delete(business._id, customerId);

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_DEACTIVATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { displayName: existing.displayName, actionType: 'HARD_DELETE' },
    });

    return { success: true, action: 'DELETE' };
  }

  async deactivateCustomer(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const deactivated = await customerRepository.deactivate(business._id, customerId);
    if (!deactivated) throw new NotFoundError('Failed to deactivate customer');

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_DEACTIVATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { displayName: deactivated.displayName },
    });

    return deactivated;
  }

  async addShippingAddress(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    addressInput: CustomerAddressInput
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const validatedAddress = customerAddressSchema.parse(addressInput);
    const updated = await customerRepository.addShippingAddress(business._id, customerId, validatedAddress);
    if (!updated) throw new NotFoundError('Failed to add shipping address');

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_ADDRESS_UPDATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { actionType: 'ADD_SHIPPING_ADDRESS' },
    });

    return updated;
  }

  async removeShippingAddress(
    authenticatedUserId: string | Types.ObjectId,
    customerId: string | Types.ObjectId,
    addressId: string
  ): Promise<ICustomer> {
    const business = await this.getBusinessByUserId(authenticatedUserId);
    const existing = await customerRepository.findById(business._id, customerId);
    if (!existing) {
      throw new NotFoundError('Customer not found');
    }

    const updated = await customerRepository.removeShippingAddress(business._id, customerId, addressId);
    if (!updated) throw new NotFoundError('Failed to remove shipping address');

    await auditLogRepository.log(business._id, {
      action: 'CUSTOMER_ADDRESS_UPDATED',
      resource: 'CUSTOMER',
      resourceId: customerId.toString(),
      userId: new Types.ObjectId(authenticatedUserId.toString()),
      metadata: { actionType: 'REMOVE_SHIPPING_ADDRESS', addressId },
    });

    return updated;
  }
}

export const customerService = new CustomerService();

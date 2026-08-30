/**
 * Customer Lifecycle Service
 * src/services/customer-lifecycle.service.ts
 *
 * Rule 31: Customer hard-delete is prohibited after any financial transaction.
 * All protection is centralized here — no scattered if-checks in other services.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PaymentModel } from '@/db/models/payment.model';
import { PaymentAllocationModel } from '@/db/models/payment-allocation.model';
import { CustomerCreditLedgerModel } from '@/db/models/customer-credit-ledger.model';
import { CustomerModel } from '@/db/models/customer.model';
import { CustomerHasTransactionsError } from '@/engine/settlement/settlement.errors';
import { NotFoundError } from '@/lib/errors';

export interface CustomerTransactionSummary {
  invoiceCount: number;
  paymentCount: number;
  allocationCount: number;
  creditLedgerCount: number;
  hasTransactions: boolean;
}

export class CustomerLifecycleService {
  /**
   * Central guard: throws CustomerHasTransactionsError if ANY financial record
   * references this customer. Checks all four collections.
   *
   * If this passes, it is safe to hard-delete. If it throws, archive instead.
   */
  async assertCanDeleteCustomer(
    businessId: string,
    customerId: string
  ): Promise<void> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(customerId);

    const [invoiceCount, paymentCount, allocationCount, creditCount] = await Promise.all([
      InvoiceModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      PaymentModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      PaymentAllocationModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      CustomerCreditLedgerModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
    ]);

    if (invoiceCount > 0 || paymentCount > 0 || allocationCount > 0 || creditCount > 0) {
      throw new CustomerHasTransactionsError(customerId);
    }
  }

  /**
   * Returns a summary of transaction counts without throwing.
   * Use for UI display ("Cannot delete — X invoices, Y payments").
   */
  async getTransactionSummary(
    businessId: string,
    customerId: string
  ): Promise<CustomerTransactionSummary> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(customerId);

    const [invoiceCount, paymentCount, allocationCount, creditLedgerCount] = await Promise.all([
      InvoiceModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      PaymentModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      PaymentAllocationModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      CustomerCreditLedgerModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
    ]);

    return {
      invoiceCount,
      paymentCount,
      allocationCount,
      creditLedgerCount,
      hasTransactions: invoiceCount > 0 || paymentCount > 0 || allocationCount > 0 || creditLedgerCount > 0,
    };
  }

  /**
   * Archives a customer (soft-delete). Marks status = INACTIVE.
   * Use this instead of hard-delete when the customer has transactions.
   */
  async archiveCustomer(
    businessId: string,
    customerId: string
  ): Promise<void> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(customerId);

    const updated = await CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $set: { status: 'INACTIVE' } },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundError(`Customer '${customerId}' not found.`);
    }
  }
}

export const customerLifecycleService = new CustomerLifecycleService();

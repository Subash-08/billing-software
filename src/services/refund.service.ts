/**
 * Customer Refund Domain Service
 * src/services/refund.service.ts
 *
 * Implements Customer Refund processing, balance validation, customer credit ledger updates,
 * and audit logging with strict tenant isolation.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { RefundModel, IRefund } from '@/db/models/refund.model';
import { CustomerModel } from '@/db/models/customer.model';
import { PaymentModel } from '@/db/models/payment.model';
import { AuditLogModel } from '@/db/models/audit-log.model';
import { customerCreditRepository } from '@/db/repositories/customer-credit.repository';
import { documentSequenceRepository } from '@/db/repositories/document-sequence.repository';
import { ApplicationError, NotFoundError, BusinessRuleError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/money';

export interface ProcessRefundInput {
  customerId: string;
  paymentId?: string;
  invoiceId?: string;
  amountRupees: number;
  refundMode?: string;
  referenceNumber?: string;
  reason: string;
}

export class RefundService {
  async processRefund(businessId: string, userId: string, input: ProcessRefundInput): Promise<IRefund> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const cId = new Types.ObjectId(input.customerId);
    const amountPaise = rupeesToPaise(input.amountRupees);

    if (amountPaise <= 0) {
      throw new BusinessRuleError('Refund amount must be a positive monetary value.');
    }

    const customer = await CustomerModel.findOne({ _id: cId, businessId: bId }).exec();
    if (!customer) throw new NotFoundError(`Customer with ID '${input.customerId}' not found.`);

    // Verify customer has sufficient credit balance if refunding from credit ledger
    const availableCredit = customer.creditBalance || 0;
    if (availableCredit < amountPaise && !input.paymentId) {
      throw new BusinessRuleError(
        `Refund amount ₹${input.amountRupees.toFixed(2)} exceeds available customer credit balance ₹${(availableCredit / 100).toFixed(2)}.`
      );
    }

    if (input.paymentId) {
      const payment = await PaymentModel.findOne({ _id: new Types.ObjectId(input.paymentId), businessId: bId }).exec();
      if (!payment) throw new NotFoundError(`Payment with ID '${input.paymentId}' not found.`);
    }

    const seq = await documentSequenceRepository.getNextSequenceNumber(businessId, 'TAX_INVOICE', 'REF', '2026-27');
    const refNumber = `REF-202627-${seq.toString().padStart(4, '0')}`;

    const refund = await RefundModel.create({
      businessId: bId,
      customerId: cId,
      paymentId: input.paymentId ? new Types.ObjectId(input.paymentId) : undefined,
      invoiceId: input.invoiceId ? new Types.ObjectId(input.invoiceId) : undefined,
      refundNumber: refNumber,
      refundDate: new Date(),
      amountPaise,
      refundMode: input.refundMode || 'BANK_TRANSFER',
      referenceNumber: input.referenceNumber,
      reason: input.reason,
      status: 'PROCESSED',
      createdByUserId: new Types.ObjectId(userId),
      processedAt: new Date(),
    });

    // Update Customer Credit Ledger (Debit event reducing credit balance)
    await customerCreditRepository.appendEvent({
      businessId: bId,
      customerId: cId,
      type: 'DEBIT_ALLOCATION',
      amountPaise,
      notes: `Refund ${refNumber} processed. Reason: ${input.reason}`,
    });

    // Update Customer.creditBalance projection
    await CustomerModel.findOneAndUpdate(
      { _id: cId, businessId: bId },
      { $inc: { creditBalance: -amountPaise } }
    ).exec();

    await AuditLogModel.create({
      businessId: bId,
      userId: new Types.ObjectId(userId),
      action: 'REFUND_PROCESSED',
      resource: 'REFUND',
      resourceId: refund._id.toString(),
      metadata: { summary: `Processed Refund ${refNumber} of ₹${input.amountRupees.toFixed(2)} for customer ${customer.displayName || customer.legalName || 'Customer'}` },
    });

    return refund;
  }

  async getRefunds(businessId: string, customerId?: string): Promise<IRefund[]> {
    await connectToDatabase();
    const query: Record<string, unknown> = { businessId: new Types.ObjectId(businessId) };
    if (customerId) query.customerId = new Types.ObjectId(customerId);

    return RefundModel.find(query).sort({ createdAt: -1 }).lean().exec() as unknown as IRefund[];
  }
}

export const refundService = new RefundService();

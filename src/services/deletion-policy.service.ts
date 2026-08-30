/**
 * NIRAMAALAI SaaS Billing — Centralized Deletion & Archiving Policy Service
 * src/services/deletion-policy.service.ts
 *
 * Enforces financial integrity deletion rules:
 * - Unused entities: Permanent HARD DELETE allowed.
 * - Entities referenced in issued invoices, payments, credit/debit notes, or refunds:
 *   Hard delete BLOCKED; ARCHIVE action offered.
 * - Financial Records (Issued Invoices, Payments, Refunds): Hard delete BLOCKED;
 *   Cancellation / Reversal workflow required.
 */

import { Types } from 'mongoose';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PaymentModel } from '@/db/models/payment.model';
import { CreditNoteModel } from '@/db/models/credit-note.model';
import { DebitNoteModel } from '@/db/models/debit-note.model';
import { RefundModel } from '@/db/models/refund.model';
import { CustomerCreditLedgerModel } from '@/db/models/customer-credit-ledger.model';

export interface DeletionPolicyResult {
  allowed: boolean;
  action: 'DELETE' | 'ARCHIVE' | 'BLOCK';
  entity: 'CUSTOMER' | 'PRODUCT' | 'SERVICE' | 'INVOICE' | 'PAYMENT' | 'REFUND';
  reason: string;
  reasons: string[];
  counts: {
    invoices: number;
    payments: number;
    creditNotes: number;
    debitNotes: number;
    refunds: number;
    ledgerEntries: number;
  };
}

export class DeletionPolicyService {
  async canDeleteCustomer(
    businessId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<DeletionPolicyResult> {
    const bId = new Types.ObjectId(businessId.toString());
    const cId = new Types.ObjectId(customerId.toString());

    const [invoices, payments, creditNotes, debitNotes, refunds, ledgerEntries] = await Promise.all([
      InvoiceModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      PaymentModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      CreditNoteModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      DebitNoteModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      RefundModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
      CustomerCreditLedgerModel.countDocuments({ businessId: bId, customerId: cId }).exec(),
    ]);

    const reasons: string[] = [];
    if (invoices > 0) reasons.push(`Customer is referenced by ${invoices} invoice(s)`);
    if (payments > 0) reasons.push(`Customer is referenced by ${payments} payment record(s)`);
    if (creditNotes > 0) reasons.push(`Customer is referenced by ${creditNotes} credit note(s)`);
    if (debitNotes > 0) reasons.push(`Customer is referenced by ${debitNotes} debit note(s)`);
    if (refunds > 0) reasons.push(`Customer is referenced by ${refunds} refund record(s)`);
    if (ledgerEntries > 0) reasons.push(`Customer is referenced by ${ledgerEntries} ledger entry/entries`);

    const totalReferences = invoices + payments + creditNotes + debitNotes + refunds + ledgerEntries;

    if (totalReferences > 0) {
      return {
        allowed: false,
        action: 'ARCHIVE',
        entity: 'CUSTOMER',
        reason: 'Customer is referenced by financial records and cannot be permanently deleted. Archive customer instead.',
        reasons,
        counts: { invoices, payments, creditNotes, debitNotes, refunds, ledgerEntries },
      };
    }

    return {
      allowed: true,
      action: 'DELETE',
      entity: 'CUSTOMER',
      reason: 'Customer has no financial history and can be permanently deleted.',
      reasons: [],
      counts: { invoices: 0, payments: 0, creditNotes: 0, debitNotes: 0, refunds: 0, ledgerEntries: 0 },
    };
  }

  async canDeleteProduct(
    businessId: string | Types.ObjectId,
    productId: string | Types.ObjectId
  ): Promise<DeletionPolicyResult> {
    const bId = new Types.ObjectId(businessId.toString());
    const pId = new Types.ObjectId(productId.toString());

    const [invoices, creditNotes, debitNotes] = await Promise.all([
      InvoiceModel.countDocuments({ businessId: bId, 'items.itemId': pId }).exec(),
      CreditNoteModel.countDocuments({ businessId: bId, 'items.itemId': pId }).exec(),
      DebitNoteModel.countDocuments({ businessId: bId, 'items.itemId': pId }).exec(),
    ]);

    const reasons: string[] = [];
    if (invoices > 0) reasons.push(`Product is referenced by ${invoices} invoice(s)`);
    if (creditNotes > 0) reasons.push(`Product is referenced by ${creditNotes} credit note(s)`);
    if (debitNotes > 0) reasons.push(`Product is referenced by ${debitNotes} debit note(s)`);

    const totalReferences = invoices + creditNotes + debitNotes;

    if (totalReferences > 0) {
      return {
        allowed: false,
        action: 'ARCHIVE',
        entity: 'PRODUCT',
        reason: 'Product is referenced by issued invoices/notes and cannot be permanently deleted. Deactivate product instead.',
        reasons,
        counts: { invoices, payments: 0, creditNotes, debitNotes, refunds: 0, ledgerEntries: 0 },
      };
    }

    return {
      allowed: true,
      action: 'DELETE',
      entity: 'PRODUCT',
      reason: 'Product is not used in any document and can be permanently deleted.',
      reasons: [],
      counts: { invoices: 0, payments: 0, creditNotes: 0, debitNotes: 0, refunds: 0, ledgerEntries: 0 },
    };
  }

  async canDeleteService(
    businessId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId
  ): Promise<DeletionPolicyResult> {
    const bId = new Types.ObjectId(businessId.toString());
    const sId = new Types.ObjectId(serviceId.toString());

    const [invoices, creditNotes, debitNotes] = await Promise.all([
      InvoiceModel.countDocuments({ businessId: bId, 'items.itemId': sId }).exec(),
      CreditNoteModel.countDocuments({ businessId: bId, 'items.itemId': sId }).exec(),
      DebitNoteModel.countDocuments({ businessId: bId, 'items.itemId': sId }).exec(),
    ]);

    const reasons: string[] = [];
    if (invoices > 0) reasons.push(`Service is referenced by ${invoices} invoice(s)`);
    if (creditNotes > 0) reasons.push(`Service is referenced by ${creditNotes} credit note(s)`);
    if (debitNotes > 0) reasons.push(`Service is referenced by ${debitNotes} debit note(s)`);

    const totalReferences = invoices + creditNotes + debitNotes;

    if (totalReferences > 0) {
      return {
        allowed: false,
        action: 'ARCHIVE',
        entity: 'SERVICE',
        reason: 'Service is referenced by issued invoices/notes and cannot be permanently deleted. Deactivate service instead.',
        reasons,
        counts: { invoices, payments: 0, creditNotes, debitNotes, refunds: 0, ledgerEntries: 0 },
      };
    }

    return {
      allowed: true,
      action: 'DELETE',
      entity: 'SERVICE',
      reason: 'Service is not used in any document and can be permanently deleted.',
      reasons: [],
      counts: { invoices: 0, payments: 0, creditNotes: 0, debitNotes: 0, refunds: 0, ledgerEntries: 0 },
    };
  }
}

export const deletionPolicyService = new DeletionPolicyService();

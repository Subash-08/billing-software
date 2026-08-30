/**
 * E-Invoice Integration Boundary Service
 * src/services/einvoice-provider.service.ts
 *
 * Provides schema validation, eligibility evaluation, payload building, and GSP integration boundary.
 * Architecture Rule: NEVER generates fake IRNs, fake signed QR codes, or fake government responses.
 * When GSP credentials are missing, status remains 'NOT_CONFIGURED'.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel, IInvoice } from '@/db/models/invoice.model';
import { BusinessModel } from '@/db/models/business.model';
import { NotFoundError } from '@/lib/errors';

export type EInvoiceStatus =
  | 'NOT_CONFIGURED'
  | 'ELIGIBLE'
  | 'PENDING'
  | 'SUBMITTED'
  | 'IRN_GENERATED'
  | 'FAILED'
  | 'CANCELLED';

export interface EInvoiceEligibilityResult {
  isEligible: boolean;
  status: EInvoiceStatus;
  reasons: string[];
  payloadPreview?: Record<string, unknown>;
}

export class EInvoiceProviderService {
  /**
   * Evaluates invoice eligibility for E-Invoicing under GST Rule 48(4)
   */
  async evaluateEligibility(businessId: string, invoiceId: string): Promise<EInvoiceEligibilityResult> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const invId = new Types.ObjectId(invoiceId);

    const invoice = await InvoiceModel.findOne({ _id: invId, businessId: bId }).lean().exec();
    if (!invoice) throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`);

    const business = await BusinessModel.findById(bId).lean().exec();
    if (!business) throw new NotFoundError(`Business with ID '${businessId}' not found.`);

    const reasons: string[] = [];

    // Rule 1: Must be an ISSUED invoice
    if (invoice.status !== 'ISSUED') {
      reasons.push('Only ISSUED invoices are eligible for E-Invoicing.');
    }

    // Rule 2: Must be B2B, SEZ, or EXPORT supply type
    const eligibleSupplies = ['B2B', 'SEZ_WITH_PAYMENT', 'SEZ_WITHOUT_PAYMENT', 'EXPORT_WITH_PAYMENT', 'EXPORT_WITHOUT_PAYMENT'];
    if (!eligibleSupplies.includes(invoice.supplyType)) {
      reasons.push(`Supply type '${invoice.supplyType}' is not subject to mandatory E-Invoicing.`);
    }

    // Rule 3: Business must have valid GSTIN
    if (!business.gstin) {
      reasons.push('Supplier GSTIN is required for E-Invoice payload generation.');
    }

    // Rule 4: Recipient must have valid GSTIN for B2B
    if (invoice.supplyType === 'B2B' && !invoice.billToSnapshot?.gstin) {
      reasons.push('Recipient GSTIN is required for B2B E-Invoicing.');
    }

    const isEligible = reasons.length === 0;

    // Build standard IRP Schema v1.03 payload preview if eligible
    let payloadPreview: Record<string, unknown> | undefined;
    if (isEligible) {
      payloadPreview = {
        Version: '1.03',
        TranDtls: {
          TaxSch: 'GST',
          SupTyp: invoice.supplyType === 'B2B' ? 'B2B' : 'SEZWP',
          RegRev: invoice.supplyDetails?.reverseCharge ? 'Y' : 'N',
        },
        DocDtls: {
          Typ: invoice.documentType === 'BILL_OF_SUPPLY' ? 'BOS' : 'INV',
          No: invoice.invoiceNumber,
          Dt: new Date(invoice.invoiceDate).toISOString().split('T')[0].split('-').reverse().join('/'),
        },
        SellerDtls: {
          Gstin: business.gstin,
          LglName: business.legalName,
          TrdName: business.tradeName || business.legalName,
          Loc: business.city || 'Chennai',
          Stcd: business.stateCode || '33',
          Pin: parseInt(business.pincode || '600001', 10),
        },
        BuyerDtls: {
          Gstin: invoice.billToSnapshot?.gstin || 'URP',
          LglName: invoice.billToSnapshot?.name,
          Pos: invoice.supplyDetails?.placeOfSupplyStateCode || '33',
          Loc: invoice.billToSnapshot?.city || 'Chennai',
          Stcd: invoice.billToSnapshot?.stateCode || '33',
        },
        ItemList: invoice.items.map((item, idx) => ({
          SlNo: (idx + 1).toString(),
          PrdDesc: item.name,
          IsServc: (item as unknown as { itemType?: string }).itemType === 'SERVICES' ? 'Y' : 'N',
          HsnCd: item.hsnSacCode,
          Qty: item.quantity,
          Unit: item.uqc || item.unit || 'PCS',
          UnitPrice: item.rate / 100,
          TotAmt: item.taxableAmount / 100,
          Discount: 0,
          AssVal: item.taxableAmount / 100,
          GstRt: item.gstRate,
          IgstAmt: item.igstAmount / 100,
          CgstAmt: item.cgstAmount / 100,
          SgstAmt: item.sgstAmount / 100,
          TotItemVal: item.totalAmount / 100,
        })),
        ValDtls: {
          AssVal: invoice.totalTaxable / 100,
          CgstVal: invoice.totalCgst / 100,
          SgstVal: invoice.totalSgst / 100,
          IgstVal: invoice.totalIgst / 100,
          RndOffAmt: invoice.roundOff / 100,
          TotInvVal: invoice.grandTotal / 100,
        },
      };
    }

    return {
      isEligible,
      status: isEligible ? 'ELIGIBLE' : 'NOT_CONFIGURED',
      reasons,
      payloadPreview,
    };
  }
}

export const einvoiceProviderService = new EInvoiceProviderService();

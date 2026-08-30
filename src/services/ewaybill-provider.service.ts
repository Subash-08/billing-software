/**
 * E-Way Bill Integration Boundary Service
 * src/services/ewaybill-provider.service.ts
 *
 * Provides E-Way Bill eligibility evaluation, threshold checking (> ₹50,000),
 * payload schema validation, and NIC integration boundary.
 * Architecture Rule: NEVER generates fake E-Way Bill numbers or fake government responses.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { BusinessModel } from '@/db/models/business.model';
import { NotFoundError } from '@/lib/errors';

export interface EWayBillEligibilityResult {
  isEligible: boolean;
  requiresEWayBill: boolean;
  status: 'NOT_CONFIGURED' | 'ELIGIBLE' | 'GENERATED' | 'CANCELLED';
  reasons: string[];
  payloadPreview?: Record<string, unknown>;
}

export class EWayBillProviderService {
  /**
   * Evaluates invoice eligibility for E-Way Bill under Rule 138 of CGST Rules (> ₹50,000 threshold)
   */
  async evaluateEligibility(businessId: string, invoiceId: string): Promise<EWayBillEligibilityResult> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);
    const invId = new Types.ObjectId(invoiceId);

    const invoice = await InvoiceModel.findOne({ _id: invId, businessId: bId }).lean().exec();
    if (!invoice) throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`);

    const business = await BusinessModel.findById(bId).lean().exec();
    if (!business) throw new NotFoundError(`Business with ID '${businessId}' not found.`);

    const reasons: string[] = [];
    const thresholdPaise = 5000000; // ₹50,000 in paise
    const requiresEWayBill = invoice.grandTotal >= thresholdPaise;

    if (!requiresEWayBill) {
      reasons.push(`Invoice total ₹${(invoice.grandTotal / 100).toFixed(2)} is below the statutory ₹50,000 threshold for mandatory E-Way Bill.`);
    }

    if (invoice.status !== 'ISSUED') {
      reasons.push('Only ISSUED invoices are eligible for E-Way Bill generation.');
    }

    if (!business.gstin) {
      reasons.push('Supplier GSTIN is required for E-Way Bill payload generation.');
    }

    const isEligible = requiresEWayBill && invoice.status === 'ISSUED' && Boolean(business.gstin);

    let payloadPreview: Record<string, unknown> | undefined;
    if (isEligible) {
      payloadPreview = {
        supplyType: 'O',
        subSupplyType: '1',
        docType: 'INV',
        docNo: invoice.invoiceNumber,
        docDate: new Date(invoice.invoiceDate).toISOString().split('T')[0].split('-').reverse().join('/'),
        fromGstin: business.gstin,
        fromStateCode: parseInt(business.stateCode || '33', 10),
        toGstin: invoice.billToSnapshot?.gstin || 'URP',
        toStateCode: parseInt(invoice.supplyDetails?.placeOfSupplyStateCode || '33', 10),
        totalValue: invoice.totalTaxable / 100,
        cgstValue: invoice.totalCgst / 100,
        sgstValue: invoice.totalSgst / 100,
        igstValue: invoice.totalIgst / 100,
        totInvValue: invoice.grandTotal / 100,
        transporterId: invoice.supplyDetails?.transporterId || '',
        transporterName: invoice.supplyDetails?.transporterName || '',
        vehicleNo: invoice.supplyDetails?.vehicleNumber || '',
      };
    }

    return {
      isEligible,
      requiresEWayBill,
      status: isEligible ? 'ELIGIBLE' : 'NOT_CONFIGURED',
      reasons,
      payloadPreview,
    };
  }
}

export const ewaybillProviderService = new EWayBillProviderService();

/**
 * GST Statutory Reporting Data Engine
 * src/services/gst-report.service.ts
 *
 * Architecture Rule: GST Reports MUST derive data from issued invoices and their authoritative tax snapshots.
 * Excludes DRAFT invoices; tags CANCELLED invoices appropriately.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel, IInvoice } from '@/db/models/invoice.model';
import { CustomerModel } from '@/db/models/customer.model';
import { paiseToRupees } from '@/lib/money';

export interface Gstr1B2BEntry {
  gstin: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValueRupees: number;
  placeOfSupplyStateCode: string;
  reverseCharge: boolean;
  taxableValueRupees: number;
  igstRupees: number;
  cgstRupees: number;
  sgstRupees: number;
  cessRupees: number;
}

export interface Gstr1B2CSEntry {
  placeOfSupplyStateCode: string;
  gstRate: number;
  taxableValueRupees: number;
  igstRupees: number;
  cgstRupees: number;
  sgstRupees: number;
}

export interface Gstr1HsnSummaryEntry {
  hsnSacCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValueRupees: number;
  taxableValueRupees: number;
  igstRupees: number;
  cgstRupees: number;
  sgstRupees: number;
}

export interface Gstr1ReportData {
  summary: {
    totalInvoices: number;
    b2bCount: number;
    b2cCount: number;
    cancelledCount: number;
    totalInvoiceValueRupees: number;
    totalTaxableValueRupees: number;
    totalIgstRupees: number;
    totalCgstRupees: number;
    totalSgstRupees: number;
    totalTaxRupees: number;
  };
  b2b: Gstr1B2BEntry[];
  b2cs: Gstr1B2CSEntry[];
  hsnSummary: Gstr1HsnSummaryEntry[];
  cancelledInvoiceNumbers: string[];
}

export interface Gstr3bTable31Data {
  outwardTaxableSupplies: {
    taxableValueRupees: number;
    igstRupees: number;
    cgstRupees: number;
    sgstRupees: number;
    cessRupees: number;
  };
  outwardExemptNilSupplies: {
    taxableValueRupees: number;
  };
  nonGstOutwardSupplies: {
    taxableValueRupees: number;
  };
}

export interface ReportFilterOptions {
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export class GstReportService {
  /**
   * Generates GSTR-1 Reporting Data Model from issued invoice snapshots.
   */
  async generateGstr1Report(businessId: string, filters: ReportFilterOptions = {}): Promise<Gstr1ReportData> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const query: any = { businessId: bId };

    // Filter Date Range if supplied
    if (filters.fromDate || filters.toDate) {
      query.invoiceDate = {};
      if (filters.fromDate) query.invoiceDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.invoiceDate.$lte = new Date(`${filters.toDate}T23:59:59.999Z`);
    }

    const invoices = await InvoiceModel.find(query).sort({ invoiceDate: 1 }).exec();

    const issuedInvoices = invoices.filter((inv) => inv.status === 'ISSUED');
    const cancelledInvoices = invoices.filter((inv) => inv.status === 'CANCELLED');

    const b2b: Gstr1B2BEntry[] = [];
    const b2csMap: Record<string, Gstr1B2CSEntry> = {};
    const hsnMap: Record<string, Gstr1HsnSummaryEntry> = {};

    let totalInvoiceValuePaise = 0;
    let totalTaxableValuePaise = 0;
    let totalIgstPaise = 0;
    let totalCgstPaise = 0;
    let totalSgstPaise = 0;

    for (const inv of issuedInvoices) {
      const isB2B = inv.billToSnapshot?.gstin && inv.billToSnapshot.gstin.trim().length === 15;
      const invValueRupees = paiseToRupees(inv.grandTotal);
      const taxableRupees = paiseToRupees(inv.totalTaxable);
      const igstRupees = paiseToRupees(inv.totalIgst);
      const cgstRupees = paiseToRupees(inv.totalCgst);
      const sgstRupees = paiseToRupees(inv.totalSgst);
      const cessRupees = paiseToRupees(inv.totalCess);

      totalInvoiceValuePaise += inv.grandTotal;
      totalTaxableValuePaise += inv.totalTaxable;
      totalIgstPaise += inv.totalIgst;
      totalCgstPaise += inv.totalCgst;
      totalSgstPaise += inv.totalSgst;

      if (isB2B) {
        b2b.push({
          gstin: inv.billToSnapshot.gstin!,
          customerName: inv.billToSnapshot.name,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: new Date(inv.invoiceDate).toISOString().split('T')[0],
          invoiceValueRupees: invValueRupees,
          placeOfSupplyStateCode: inv.supplyDetails?.placeOfSupplyStateCode || '33',
          reverseCharge: inv.supplyDetails?.reverseCharge || false,
          taxableValueRupees: taxableRupees,
          igstRupees,
          cgstRupees,
          sgstRupees,
          cessRupees,
        });
      } else {
        // Aggregated B2CS by Place of Supply + GST Rate
        for (const item of inv.items) {
          const key = `${inv.supplyDetails?.placeOfSupplyStateCode || '33'}-${item.gstRate}`;
          if (!b2csMap[key]) {
            b2csMap[key] = {
              placeOfSupplyStateCode: inv.supplyDetails?.placeOfSupplyStateCode || '33',
              gstRate: item.gstRate,
              taxableValueRupees: 0,
              igstRupees: 0,
              cgstRupees: 0,
              sgstRupees: 0,
            };
          }
          b2csMap[key].taxableValueRupees += paiseToRupees(item.taxableAmount);
          b2csMap[key].igstRupees += paiseToRupees(item.igstAmount);
          b2csMap[key].cgstRupees += paiseToRupees(item.cgstAmount);
          b2csMap[key].sgstRupees += paiseToRupees(item.sgstAmount);
        }
      }

      // HSN Summary aggregation
      for (const item of inv.items) {
        const code = item.hsnSacCode || 'OTHERS';
        if (!hsnMap[code]) {
          hsnMap[code] = {
            hsnSacCode: code,
            description: item.name,
            uqc: item.uqc || item.unit || 'OTH',
            totalQuantity: 0,
            totalValueRupees: 0,
            taxableValueRupees: 0,
            igstRupees: 0,
            cgstRupees: 0,
            sgstRupees: 0,
          };
        }
        hsnMap[code].totalQuantity += item.quantity;
        hsnMap[code].totalValueRupees += paiseToRupees(item.totalAmount);
        hsnMap[code].taxableValueRupees += paiseToRupees(item.taxableAmount);
        hsnMap[code].igstRupees += paiseToRupees(item.igstAmount);
        hsnMap[code].cgstRupees += paiseToRupees(item.cgstAmount);
        hsnMap[code].sgstRupees += paiseToRupees(item.sgstAmount);
      }
    }

    const totalTaxPaise = totalIgstPaise + totalCgstPaise + totalSgstPaise;

    return {
      summary: {
        totalInvoices: issuedInvoices.length,
        b2bCount: b2b.length,
        b2cCount: Object.keys(b2csMap).length,
        cancelledCount: cancelledInvoices.length,
        totalInvoiceValueRupees: paiseToRupees(totalInvoiceValuePaise),
        totalTaxableValueRupees: paiseToRupees(totalTaxableValuePaise),
        totalIgstRupees: paiseToRupees(totalIgstPaise),
        totalCgstRupees: paiseToRupees(totalCgstPaise),
        totalSgstRupees: paiseToRupees(totalSgstPaise),
        totalTaxRupees: paiseToRupees(totalTaxPaise),
      },
      b2b,
      b2cs: Object.values(b2csMap),
      hsnSummary: Object.values(hsnMap),
      cancelledInvoiceNumbers: cancelledInvoices.map((inv) => inv.invoiceNumber),
    };
  }

  /**
   * Generates GSTR-3B Table 3.1 Aggregations from issued invoices.
   */
  async generateGstr3bSummary(businessId: string, filters: ReportFilterOptions = {}): Promise<Gstr3bTable31Data> {
    await connectToDatabase();

    const bId = new Types.ObjectId(businessId);
    const query: any = { businessId: bId, status: 'ISSUED' };

    if (filters.fromDate || filters.toDate) {
      query.invoiceDate = {};
      if (filters.fromDate) query.invoiceDate.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.invoiceDate.$lte = new Date(`${filters.toDate}T23:59:59.999Z`);
    }

    const invoices = await InvoiceModel.find(query).exec();

    let taxableValuePaise = 0;
    let igstPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let cessPaise = 0;

    let exemptTaxableValuePaise = 0;

    for (const inv of invoices) {
      if (inv.taxTreatment === 'EXEMPT' || inv.taxTreatment === 'NIL_RATED') {
        exemptTaxableValuePaise += inv.totalTaxable;
      } else {
        taxableValuePaise += inv.totalTaxable;
        igstPaise += inv.totalIgst;
        cgstPaise += inv.totalCgst;
        sgstPaise += inv.totalSgst;
        cessPaise += inv.totalCess;
      }
    }

    return {
      outwardTaxableSupplies: {
        taxableValueRupees: paiseToRupees(taxableValuePaise),
        igstRupees: paiseToRupees(igstPaise),
        cgstRupees: paiseToRupees(cgstPaise),
        sgstRupees: paiseToRupees(sgstPaise),
        cessRupees: paiseToRupees(cessPaise),
      },
      outwardExemptNilSupplies: {
        taxableValueRupees: paiseToRupees(exemptTaxableValuePaise),
      },
      nonGstOutwardSupplies: {
        taxableValueRupees: 0,
      },
    };
  }
}

export const gstReportService = new GstReportService();

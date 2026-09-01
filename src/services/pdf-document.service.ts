/**
 * PDF Document & Print View Model Service
 * src/services/pdf-document.service.ts
 *
 * Architecture Rule: PDFs, print views, and receipts MUST consume the authoritative locked
 * invoice/tax snapshot stored in MongoDB. They MUST NEVER independently recalculate tax math.
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel, IInvoice } from '@/db/models/invoice.model';
import { PaymentModel, IPayment } from '@/db/models/payment.model';
import { PaymentAllocationModel } from '@/db/models/payment-allocation.model';
import { BusinessModel } from '@/db/models/business.model';
import { CustomerModel } from '@/db/models/customer.model';
import { ApplicationError, NotFoundError } from '@/lib/errors';
import { paiseToRupees } from '@/lib/money';
import { invoiceTemplateService } from '@/services/invoice-template.service';

// ---------------------------------------------------------------------------
// Helper: Convert Amount in Rupees to Indian Currency Words
// ---------------------------------------------------------------------------
export function numberToIndianWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const num = Math.floor(amount);
  const paise = Math.round((amount - num) * 100);

  function convertChunk(n: number): string {
    if (n < 20) return single[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]} ${single[n % 10]}`.trim();
    if (n < 1000) return `${single[Math.floor(n / 100)]} Hundred ${convertChunk(n % 100)}`.trim();
    if (n < 100000) return `${convertChunk(Math.floor(n / 1000))} Thousand ${convertChunk(n % 1000)}`.trim();
    if (n < 10000000) return `${convertChunk(Math.floor(n / 100000))} Lakh ${convertChunk(n % 100000)}`.trim();
    return `${convertChunk(Math.floor(n / 10000000))} Crore ${convertChunk(n % 10000000)}`.trim();
  }

  let result = `${convertChunk(num)} Rupees`;
  if (paise > 0) {
    result += ` and ${convertChunk(paise)} Paise`;
  }
  return `${result} Only`;
}

export interface InvoicePdfViewModel {
  invoiceNumber: string;
  financialYear: string;
  documentType: string;
  documentTitle: string;
  status: string;
  paymentStatus: string;
  invoiceDate: string;
  dueDate: string;
  supplyType: string;
  placeOfSupplyStateCode: string;
  billFrom: {
    name: string;
    gstin?: string;
    addressLine: string;
    city: string;
    state: string;
    stateCode: string;
    pincode?: string;
    phone?: string;
    email?: string;
  };
  billTo: {
    name: string;
    gstin?: string;
    addressLine: string;
    city: string;
    state: string;
    stateCode: string;
    pincode?: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    name: string;
    hsnSacCode: string;
    quantity: number;
    unit: string;
    uqc: string;
    rateRupees: number;
    taxableAmountRupees: number;
    gstRate: number;
    cgstRupees: number;
    sgstRupees: number;
    igstRupees: number;
    totalRupees: number;
  }>;
  subTotalRupees: number;
  totalDiscountRupees: number;
  totalTaxableRupees: number;
  totalCgstRupees: number;
  totalSgstRupees: number;
  totalUtgstRupees: number;
  totalIgstRupees: number;
  totalCessRupees: number;
  roundOffRupees: number;
  grandTotalRupees: number;
  paidAmountRupees: number;
  outstandingBalanceRupees: number;
  amountInWords: string;
  template?: Record<string, unknown>;
}

export interface PaymentReceiptPdfViewModel {
  receiptNumber: string;
  paymentDate: string;
  paymentModeName: string;
  referenceNumber?: string;
  notes?: string;
  status: string;
  amountRupees: number;
  amountInWords: string;
  customer: {
    displayName: string;
    gstin?: string;
    phone: string;
    city: string;
    state: string;
  };
  allocations: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    allocatedAmountRupees: number;
    remainingOutstandingRupees: number;
  }>;
}

export class PdfDocumentService {
  /**
   * Generates the authoritative view model for an Invoice document.
   * Consumes locked MongoDB snapshot — NEVER recalculates tax math.
   */
  async getInvoiceViewModel(businessId: string, invoiceId: string): Promise<InvoicePdfViewModel> {
    await connectToDatabase();

    const invoice = await InvoiceModel.findOne({
      _id: new Types.ObjectId(invoiceId),
      businessId: new Types.ObjectId(businessId),
    }).exec();

    if (!invoice) throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`);

    const grandTotalRupees = paiseToRupees(invoice.grandTotal);

    // Resolve template: prefer locked invoice.templateSnapshot, fallback to active default template
    let templateData: Record<string, unknown> | undefined = (invoice as any).templateSnapshot;
    if (!templateData) {
      try {
        const activeTpl = await invoiceTemplateService.getOrCreateDefaultTemplate(businessId);
        const biz = await BusinessModel.findById(businessId).lean().exec();
        const logoUrl = (biz as any)?.branding?.invoiceLogo?.secureUrl || (biz as any)?.branding?.logo?.secureUrl;
        const sigUrl = (biz as any)?.branding?.signature?.secureUrl;
        templateData = invoiceTemplateService.buildTemplateSnapshot(activeTpl, logoUrl, sigUrl);
      } catch {
        templateData = undefined;
      }
    }

    const docType = invoice.documentType || 'TAX_INVOICE';
    let docTitle = 'TAX INVOICE';
    if (docType === 'BILL_OF_SUPPLY') docTitle = 'BILL OF SUPPLY';
    else if (docType === 'CREDIT_NOTE') docTitle = 'CREDIT NOTE';
    else if (docType === 'DEBIT_NOTE') docTitle = 'DEBIT NOTE';
    else if (docType === 'QUOTATION') docTitle = 'QUOTATION';
    else if (docType === 'DELIVERY_CHALLAN') docTitle = 'DELIVERY CHALLAN';

    return {
      invoiceNumber: invoice.invoiceNumber,
      financialYear: invoice.financialYear,
      documentType: docType,
      documentTitle: docTitle,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      supplyType: invoice.supplyType,
      placeOfSupplyStateCode: invoice.supplyDetails?.placeOfSupplyStateCode || '33',
      billFrom: {
        name: invoice.billFromSnapshot?.name || 'Business',
        gstin: invoice.billFromSnapshot?.gstin,
        addressLine: invoice.billFromSnapshot?.addressLine || '',
        city: invoice.billFromSnapshot?.city || '',
        state: invoice.billFromSnapshot?.state || '',
        stateCode: invoice.billFromSnapshot?.stateCode || '33',
        pincode: invoice.billFromSnapshot?.pincode,
      },
      billTo: {
        name: invoice.billToSnapshot?.name || 'Customer',
        gstin: invoice.billToSnapshot?.gstin,
        addressLine: invoice.billToSnapshot?.addressLine || '',
        city: invoice.billToSnapshot?.city || '',
        state: invoice.billToSnapshot?.state || '',
        stateCode: invoice.billToSnapshot?.stateCode || '33',
        pincode: invoice.billToSnapshot?.pincode,
      },
      items: invoice.items.map((it: any) => {
        const isGoods = (it.itemType || 'GOODS') === 'GOODS';
        const hsnSac = (isGoods ? it.hsnCode : it.sacCode) || it.hsnSacCode || '998314';
        const ratePaise = it.enteredRatePaise ?? it.rate ?? 0;
        const taxablePaise = it.taxableAmountPaise ?? it.taxableAmount ?? 0;
        const cgstPaise = it.cgstAmountPaise ?? it.cgstAmount ?? 0;
        const sgstPaise = it.sgstAmountPaise ?? it.sgstAmount ?? 0;
        const igstPaise = it.igstAmountPaise ?? it.igstAmount ?? 0;
        const totalPaise = it.totalAmountPaise ?? it.totalAmount ?? 0;

        return {
          name: it.name,
          hsnSacCode: hsnSac,
          quantity: it.quantity,
          unit: it.unit,
          uqc: it.uqc,
          rateRupees: paiseToRupees(ratePaise),
          taxableAmountRupees: paiseToRupees(taxablePaise),
          gstRate: it.gstRate,
          cgstRupees: paiseToRupees(cgstPaise),
          sgstRupees: paiseToRupees(sgstPaise),
          igstRupees: paiseToRupees(igstPaise),
          totalRupees: paiseToRupees(totalPaise),
        };
      }),
      subTotalRupees: paiseToRupees(invoice.subTotal),
      totalDiscountRupees: paiseToRupees(invoice.totalDiscount),
      totalTaxableRupees: paiseToRupees(invoice.totalTaxable),
      totalCgstRupees: paiseToRupees(invoice.totalCgst),
      totalSgstRupees: paiseToRupees(invoice.totalSgst),
      totalUtgstRupees: paiseToRupees(invoice.totalUtgst),
      totalIgstRupees: paiseToRupees(invoice.totalIgst),
      totalCessRupees: paiseToRupees(invoice.totalCess),
      roundOffRupees: paiseToRupees(invoice.roundOff),
      grandTotalRupees,
      paidAmountRupees: paiseToRupees(invoice.paidAmount),
      outstandingBalanceRupees: paiseToRupees(invoice.outstandingBalance),
      amountInWords: numberToIndianWords(grandTotalRupees),
      template: templateData,
    };
  }

  /**
   * Generates the authoritative view model for a Payment Receipt document.
   */
  async getPaymentReceiptViewModel(businessId: string, paymentId: string): Promise<PaymentReceiptPdfViewModel> {
    await connectToDatabase();

    const payment = await PaymentModel.findOne({
      _id: new Types.ObjectId(paymentId),
      businessId: new Types.ObjectId(businessId),
    }).exec();

    if (!payment) throw new NotFoundError(`Payment with ID '${paymentId}' not found.`);

    const allocations = await PaymentAllocationModel.find({
      businessId: new Types.ObjectId(businessId),
      paymentId: payment._id,
    }).exec();

    const allocDetails: Array<{
      invoiceNumber: string;
      invoiceDate: string;
      allocatedAmountRupees: number;
      remainingOutstandingRupees: number;
    }> = [];

    for (const alloc of allocations) {
      const inv = await InvoiceModel.findById(alloc.invoiceId).exec();
      if (inv) {
        allocDetails.push({
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: new Date(inv.invoiceDate).toISOString().split('T')[0],
          allocatedAmountRupees: paiseToRupees(alloc.allocatedAmountPaise),
          remainingOutstandingRupees: paiseToRupees(inv.outstandingBalance),
        });
      }
    }

    const amountRupees = paiseToRupees(payment.amountPaise);

    return {
      receiptNumber: payment.receiptNumber,
      paymentDate: payment.paymentDate,
      paymentModeName: payment.paymentModeSnapshot?.name || 'UPI / Cash',
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      status: payment.status,
      amountRupees,
      amountInWords: numberToIndianWords(amountRupees),
      customer: {
        displayName: payment.customerSnapshot?.displayName || 'Customer',
        gstin: payment.customerSnapshot?.gstin,
        phone: payment.customerSnapshot?.phone || '',
        city: payment.customerSnapshot?.billingCity || '',
        state: payment.customerSnapshot?.billingState || '',
      },
      allocations: allocDetails,
    };
  }
}

export const pdfDocumentService = new PdfDocumentService();

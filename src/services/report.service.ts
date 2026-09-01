import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PurchaseInvoiceModel } from '@/db/models/purchase-invoice.model';
import { ProductModel } from '@/db/models/product.model';
import { CustomerModel } from '@/db/models/customer.model';
import { SupplierModel } from '@/db/models/supplier.model';
import { paiseToRupees } from '@/lib/money';

export interface SalesReportFilter {
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  status?: string;
}

export class ReportService {
  /**
   * Generates authoritative Sales Summary Report directly from MongoDB Issued Invoices.
   */
  async getSalesReport(businessId: string, filter: SalesReportFilter = {}) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const query: any = { businessId: bId, status: { $in: ['ISSUED', 'RECORDED'] } };
    if (filter.customerId) query.customerId = new Types.ObjectId(filter.customerId);
    if (filter.startDate || filter.endDate) {
      query.invoiceDate = {};
      if (filter.startDate) query.invoiceDate.$gte = filter.startDate;
      if (filter.endDate) query.invoiceDate.$lte = filter.endDate;
    }

    const invoices = await InvoiceModel.find(query).sort({ invoiceDate: -1 }).lean().exec();

    let totalSalesPaise = 0;
    let totalTaxablePaise = 0;
    let totalCgstPaise = 0;
    let totalSgstPaise = 0;
    let totalIgstPaise = 0;
    let totalUtgstPaise = 0;
    let totalCessPaise = 0;
    let totalPaidPaise = 0;
    let totalOutstandingPaise = 0;

    for (const inv of invoices) {
      totalSalesPaise += inv.grandTotal || 0;
      totalTaxablePaise += inv.totalTaxable || 0;
      totalCgstPaise += inv.totalCgst || 0;
      totalSgstPaise += inv.totalSgst || 0;
      totalIgstPaise += inv.totalIgst || 0;
      totalUtgstPaise += inv.totalUtgst || 0;
      totalCessPaise += inv.totalCess || 0;
      totalPaidPaise += inv.paidAmount || 0;
      totalOutstandingPaise += inv.outstandingBalance || 0;
    }

    return {
      invoiceCount: invoices.length,
      totalSalesRupees: paiseToRupees(totalSalesPaise),
      totalTaxableRupees: paiseToRupees(totalTaxablePaise),
      totalCgstRupees: paiseToRupees(totalCgstPaise),
      totalSgstRupees: paiseToRupees(totalSgstPaise),
      totalIgstRupees: paiseToRupees(totalIgstPaise),
      totalUtgstRupees: paiseToRupees(totalUtgstPaise),
      totalCessRupees: paiseToRupees(totalCessPaise),
      totalTaxRupees: paiseToRupees(totalCgstPaise + totalSgstPaise + totalIgstPaise + totalUtgstPaise + totalCessPaise),
      totalPaidRupees: paiseToRupees(totalPaidPaise),
      totalOutstandingRupees: paiseToRupees(totalOutstandingPaise),
      invoices: invoices.map(i => ({
        id: i._id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate,
        customerName: i.billToSnapshot?.name || 'Customer',
        grandTotalRupees: paiseToRupees(i.grandTotal),
        paidAmountRupees: paiseToRupees(i.paidAmount),
        outstandingBalanceRupees: paiseToRupees(i.outstandingBalance),
        paymentStatus: i.paymentStatus,
      })),
    };
  }

  /**
   * Generates authoritative Purchase Summary Report from MongoDB Purchase Invoices.
   */
  async getPurchaseReport(businessId: string, filter: SalesReportFilter = {}) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const query: any = { businessId: bId, status: 'RECORDED' };
    if (filter.startDate || filter.endDate) {
      query.purchaseDate = {};
      if (filter.startDate) query.purchaseDate.$gte = filter.startDate;
      if (filter.endDate) query.purchaseDate.$lte = filter.endDate;
    }

    const purchases = await PurchaseInvoiceModel.find(query).sort({ purchaseDate: -1 }).lean().exec();

    let totalPurchasePaise = 0;
    let totalTaxablePaise = 0;
    let totalCgstPaise = 0;
    let totalSgstPaise = 0;
    let totalIgstPaise = 0;
    let totalPaidPaise = 0;
    let totalOutstandingPaise = 0;

    for (const p of purchases) {
      totalPurchasePaise += p.grandTotalPaise || 0;
      totalTaxablePaise += p.totalTaxablePaise || 0;
      totalCgstPaise += p.totalCgstPaise || 0;
      totalSgstPaise += p.totalSgstPaise || 0;
      totalIgstPaise += p.totalIgstPaise || 0;
      totalPaidPaise += p.paidAmountPaise || 0;
      totalOutstandingPaise += p.outstandingBalancePaise || 0;
    }

    return {
      purchaseCount: purchases.length,
      totalPurchaseRupees: paiseToRupees(totalPurchasePaise),
      totalTaxableRupees: paiseToRupees(totalTaxablePaise),
      totalCgstRupees: paiseToRupees(totalCgstPaise),
      totalSgstRupees: paiseToRupees(totalSgstPaise),
      totalIgstRupees: paiseToRupees(totalIgstPaise),
      totalPaidRupees: paiseToRupees(totalPaidPaise),
      totalOutstandingRupees: paiseToRupees(totalOutstandingPaise),
      purchases: purchases.map(p => ({
        id: p._id,
        purchaseNumber: p.purchaseNumber,
        purchaseDate: p.purchaseDate,
        supplierName: p.supplierSnapshot?.name || 'Supplier',
        grandTotalRupees: paiseToRupees(p.grandTotalPaise),
        paidAmountRupees: paiseToRupees(p.paidAmountPaise),
        outstandingBalanceRupees: paiseToRupees(p.outstandingBalancePaise),
        paymentStatus: p.paymentStatus,
      })),
    };
  }

  /**
   * Generates authoritative Stock Valuation & Inventory Summary Report.
   */
  async getStockValuationReport(businessId: string) {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const products = await ProductModel.find({ businessId: bId, status: 'ACTIVE' })
      .select('name code hsnCode unit sellingPrice purchasePrice stockQuantity reorderLevel trackInventory')
      .sort({ name: 1 })
      .lean()
      .exec();

    let totalValuationSellingRupees = 0;
    let totalValuationPurchaseRupees = 0;
    let lowStockCount = 0;

    const items = products.map(p => {
      const stock = p.stockQuantity || 0;
      const sellingPrice = p.sellingPrice || 0;
      const purchasePrice = p.purchasePrice || 0;

      const sellingValuation = stock * sellingPrice;
      const purchaseValuation = stock * purchasePrice;

      totalValuationSellingRupees += sellingValuation;
      totalValuationPurchaseRupees += purchaseValuation;

      const isLowStock = p.trackInventory && stock <= (p.reorderLevel || 0);
      if (isLowStock) lowStockCount++;

      return {
        id: p._id,
        name: p.name,
        code: p.code,
        hsnCode: p.hsnCode,
        unit: p.unit,
        sellingPrice,
        purchasePrice,
        stockQuantity: stock,
        reorderLevel: p.reorderLevel || 0,
        sellingValuationRupees: sellingValuation,
        purchaseValuationRupees: purchaseValuation,
        isLowStock,
      };
    });

    return {
      productCount: products.length,
      lowStockCount,
      totalValuationSellingRupees,
      totalValuationPurchaseRupees,
      items,
    };
  }
}

export const reportService = new ReportService();

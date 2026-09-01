/**
 * Dashboard & Analytics Data Engine Service
 * src/services/dashboard.service.ts
 *
 * Architecture Rules:
 * 1. Authoritative financial ledgers are truth — metrics derived directly via MongoDB aggregations.
 * 2. Strict tenant-isolation (`businessId` required on every aggregation stage).
 * 3. All monetary math performed using deterministic integer arithmetic (paise $\to$ rupees conversion).
 */

import { Types } from 'mongoose';
import { connectToDatabase } from '@/db/connection';
import { InvoiceModel } from '@/db/models/invoice.model';
import { PaymentModel } from '@/db/models/payment.model';
import { CustomerModel } from '@/db/models/customer.model';
import { paiseToRupees } from '@/lib/money';

export interface DashboardMetricsFilter {
  period?: 'today' | 'this_week' | 'this_month' | 'prev_month' | 'current_fy' | 'custom';
  fromDate?: string;
  toDate?: string;
}

export interface DashboardKpiSummary {
  grossSalesRupees: number;
  taxableSalesRupees: number;
  gstCollectedRupees: number;
  totalCgstRupees: number;
  totalSgstRupees: number;
  totalIgstRupees: number;
  paymentsReceivedRupees: number;
  outstandingReceivablesRupees: number;
  totalCreditBalanceRupees: number;
  issuedInvoiceCount: number;
}

export interface InvoiceStatusBreakdown {
  draft: number;
  issued: number;
  paid: number;
  partiallyPaid: number;
  unpaid: number;
  cancelled: number;
}

export interface OutstandingAgeingBreakdown {
  currentRupees: number;
  days1to30Rupees: number;
  days31to60Rupees: number;
  days61to90Rupees: number;
  days90plusRupees: number;
}

export interface TopCustomerMetric {
  customerId: string;
  name: string;
  totalBilledRupees: number;
  invoiceCount: number;
}

export interface TopProductMetric {
  name: string;
  hsnSacCode: string;
  totalQuantity: number;
  totalRevenueRupees: number;
}

export interface RecentInvoiceItem {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  grandTotalRupees: number;
  status: string;
  paymentStatus: string;
}

export interface RecentPaymentItem {
  _id: string;
  receiptNumber: string;
  customerName: string;
  paymentDate: string;
  amountRupees: number;
  paymentModeName: string;
  status: string;
}

export interface DashboardResponseData {
  summary: DashboardKpiSummary;
  statusBreakdown: InvoiceStatusBreakdown;
  ageingBreakdown: OutstandingAgeingBreakdown;
  topCustomers: TopCustomerMetric[];
  topProducts: TopProductMetric[];
  recentInvoices: RecentInvoiceItem[];
  recentPayments: RecentPaymentItem[];
}

export class DashboardService {
  /**
   * Derives date boundary filter match object for MongoDB queries.
   */
  private resolveDateFilter(filters: DashboardMetricsFilter): Record<string, any> {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (filters.period) {
      case 'today': {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'this_week': {
        const dayOfWeek = now.getDay();
        const distanceToMonday = (dayOfWeek + 6) % 7;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
        endDate = new Date();
        break;
      }
      case 'this_month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      }
      case 'prev_month': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'current_fy': {
        // Indian Financial Year starts April 1st
        const currentYear = now.getFullYear();
        const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
        startDate = new Date(fyStartYear, 3, 1);
        endDate = new Date();
        break;
      }
      case 'custom': {
        if (filters.fromDate) startDate = new Date(filters.fromDate);
        if (filters.toDate) endDate = new Date(`${filters.toDate}T23:59:59.999Z`);
        break;
      }
      default:
        break;
    }

    const query: Record<string, any> = {};
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = startDate;
      if (endDate) query.invoiceDate.$lte = endDate;
    }
    return query;
  }

  /**
   * Computes authoritative analytics and metrics for Dashboard.
   */
  async getDashboardData(businessId: string, filters: DashboardMetricsFilter = {}): Promise<DashboardResponseData> {
    await connectToDatabase();
    const bId = new Types.ObjectId(businessId);

    const dateFilter = this.resolveDateFilter(filters);
    const invoiceMatchQuery = { businessId: bId, ...dateFilter };

    // 1. KPI Aggregation over ISSUED Invoices (Sales & Tax in selected period)
    const [kpiResult] = await InvoiceModel.aggregate([
      { $match: { ...invoiceMatchQuery, status: 'ISSUED' } },
      {
        $group: {
          _id: null,
          grossSalesPaise: { $sum: '$grandTotal' },
          taxableSalesPaise: { $sum: '$totalTaxable' },
          cgstPaise: { $sum: '$totalCgst' },
          sgstPaise: { $sum: '$totalSgst' },
          igstPaise: { $sum: '$totalIgst' },
          invoiceCount: { $sum: 1 },
        },
      },
    ]).exec() || [{}];

    // 1b. Cumulative Total Outstanding Receivables (Point-in-time across all issued invoices)
    const [totalOutstandingResult] = await InvoiceModel.aggregate([
      { $match: { businessId: bId, status: 'ISSUED' } },
      { $group: { _id: null, totalOutstandingPaise: { $sum: '$outstandingBalance' } } },
    ]).exec() || [{}];

    // 2. Payments Received Aggregation
    const paymentMatchQuery: Record<string, any> = { businessId: bId, status: 'COMPLETED' };
    if (dateFilter.invoiceDate) {
      paymentMatchQuery.createdAt = dateFilter.invoiceDate;
    }

    const [paymentResult] = await PaymentModel.aggregate([
      { $match: paymentMatchQuery },
      { $group: { _id: null, totalPaymentsPaise: { $sum: '$amountPaise' } } },
    ]).exec() || [{}];

    // 3. Customer Total Credit Balance Aggregation
    const [creditResult] = await CustomerModel.aggregate([
      { $match: { businessId: bId } },
      { $group: { _id: null, totalCreditPaise: { $sum: '$creditBalance' } } },
    ]).exec() || [{}];

    // 4. Invoice Status Count Breakdown
    const statusCounts = await InvoiceModel.aggregate([
      { $match: { businessId: bId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const paymentStatusCounts = await InvoiceModel.aggregate([
      { $match: { businessId: bId, status: 'ISSUED' } },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    ]).exec();

    const statusMap: Record<string, number> = {};
    for (const item of statusCounts) statusMap[item._id] = item.count;
    const payStatusMap: Record<string, number> = {};
    for (const item of paymentStatusCounts) payStatusMap[item._id] = item.count;

    // 5. Outstanding Ageing Breakdown (Days Past Due)
    const today = new Date();
    const issuedUnpaidInvoices = await InvoiceModel.find({
      businessId: bId,
      status: 'ISSUED',
      outstandingBalance: { $gt: 0 },
    }).exec();

    let currentPaise = 0;
    let days1to30Paise = 0;
    let days31to60Paise = 0;
    let days61to90Paise = 0;
    let days90plusPaise = 0;

    for (const inv of issuedUnpaidInvoices) {
      const dueDate = new Date(inv.dueDate);
      const diffMs = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        currentPaise += inv.outstandingBalance;
      } else if (diffDays <= 30) {
        days1to30Paise += inv.outstandingBalance;
      } else if (diffDays <= 60) {
        days31to60Paise += inv.outstandingBalance;
      } else if (diffDays <= 90) {
        days61to90Paise += inv.outstandingBalance;
      } else {
        days90plusPaise += inv.outstandingBalance;
      }
    }

    // 6. Top Customers
    const topCustomersAgg = await InvoiceModel.aggregate([
      { $match: { businessId: bId, status: 'ISSUED' } },
      {
        $group: {
          _id: '$customerId',
          customerName: { $first: '$billToSnapshot.name' },
          totalBilledPaise: { $sum: '$grandTotal' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalBilledPaise: -1 } },
      { $limit: 5 },
    ]).exec();

    // 7. Top Products
    const topProductsAgg = await InvoiceModel.aggregate([
      { $match: { businessId: bId, status: 'ISSUED' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          hsnSacCode: { $first: '$items.hsnSacCode' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenuePaise: { $sum: '$items.totalAmount' },
        },
      },
      { $sort: { totalRevenuePaise: -1 } },
      { $limit: 5 },
    ]).exec();

    // 8. Recent Invoices & Payments
    const recentInvoicesDocs = await InvoiceModel.find({ businessId: bId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    const recentPaymentsDocs = await PaymentModel.find({ businessId: bId })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    const grossSalesPaise = kpiResult?.grossSalesPaise || 0;
    const taxableSalesPaise = kpiResult?.taxableSalesPaise || 0;
    const cgstPaise = kpiResult?.cgstPaise || 0;
    const sgstPaise = kpiResult?.sgstPaise || 0;
    const igstPaise = kpiResult?.igstPaise || 0;
    const gstCollectedPaise = cgstPaise + sgstPaise + igstPaise;

    return {
      summary: {
        grossSalesRupees: paiseToRupees(grossSalesPaise),
        taxableSalesRupees: paiseToRupees(taxableSalesPaise),
        gstCollectedRupees: paiseToRupees(gstCollectedPaise),
        totalCgstRupees: paiseToRupees(cgstPaise),
        totalSgstRupees: paiseToRupees(sgstPaise),
        totalIgstRupees: paiseToRupees(igstPaise),
        paymentsReceivedRupees: paiseToRupees(paymentResult?.totalPaymentsPaise || 0),
        outstandingReceivablesRupees: paiseToRupees(totalOutstandingResult?.totalOutstandingPaise || 0),
        totalCreditBalanceRupees: paiseToRupees(creditResult?.totalCreditPaise || 0),
        issuedInvoiceCount: kpiResult?.invoiceCount || 0,
      },
      statusBreakdown: {
        draft: statusMap['DRAFT'] || 0,
        issued: statusMap['ISSUED'] || 0,
        paid: payStatusMap['PAID'] || 0,
        partiallyPaid: payStatusMap['PARTIALLY_PAID'] || 0,
        unpaid: payStatusMap['UNPAID'] || 0,
        cancelled: statusMap['CANCELLED'] || 0,
      },
      ageingBreakdown: {
        currentRupees: paiseToRupees(currentPaise),
        days1to30Rupees: paiseToRupees(days1to30Paise),
        days31to60Rupees: paiseToRupees(days31to60Paise),
        days61to90Rupees: paiseToRupees(days61to90Paise),
        days90plusRupees: paiseToRupees(days90plusPaise),
      },
      topCustomers: topCustomersAgg.map((c) => ({
        customerId: c._id.toString(),
        name: c.customerName || 'Customer',
        totalBilledRupees: paiseToRupees(c.totalBilledPaise),
        invoiceCount: c.invoiceCount,
      })),
      topProducts: topProductsAgg.map((p) => ({
        name: p._id,
        hsnSacCode: p.hsnSacCode || 'N/A',
        totalQuantity: p.totalQuantity,
        totalRevenueRupees: paiseToRupees(p.totalRevenuePaise),
      })),
      recentInvoices: recentInvoicesDocs.map((inv) => ({
        _id: inv._id.toString(),
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.billToSnapshot?.name || 'Customer',
        invoiceDate: new Date(inv.invoiceDate).toISOString().split('T')[0],
        grandTotalRupees: paiseToRupees(inv.grandTotal),
        status: inv.status,
        paymentStatus: inv.paymentStatus,
      })),
      recentPayments: recentPaymentsDocs.map((pay) => ({
        _id: pay._id.toString(),
        receiptNumber: pay.receiptNumber,
        customerName: pay.customerSnapshot?.displayName || 'Customer',
        paymentDate: pay.paymentDate,
        amountRupees: paiseToRupees(pay.amountPaise),
        paymentModeName: pay.paymentModeSnapshot?.name || 'UPI',
        status: pay.status,
      })),
    };
  }
}

export const dashboardService = new DashboardService();

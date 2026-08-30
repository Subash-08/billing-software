'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Calendar,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardResponseData } from '@/services/dashboard.service';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardResponseData | null>(null);
  const [period, setPeriod] = useState<string>('this_month');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [onboardingProgress, setOnboardingProgress] = useState<{
    percentage: number;
    items: Record<string, boolean>;
  }>({
    percentage: 100,
    items: {},
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (period === 'custom' && fromDate) params.set('fromDate', fromDate);
      if (period === 'custom' && toDate) params.set('toDate', toDate);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period, fromDate, toDate]);

  useEffect(() => {
    async function loadOnboarding() {
      try {
        const res = await fetch('/api/business/onboarding-progress');
        if (res.ok) {
          const json = await res.json();
          if (json.progress) setOnboardingProgress(json.progress);
        }
      } catch {}
    }
    loadOnboarding();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Business Dashboard</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Real-time overview of sales billing, collections, outstanding receivables, and tax obligations.</p>
        </div>

        {/* Financial Period Selector */}
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 text-xs px-3 rounded border border-[#D1D5DB] bg-white text-[#374151] font-medium"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="prev_month">Previous Month</option>
            <option value="current_fy">Current FY (2026-27)</option>
            <option value="custom">Custom Period</option>
          </select>

          {period === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-32 text-xs" />
              <span className="text-xs text-[#6B7280]">to</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-32 text-xs" />
            </div>
          )}

          <Link href="/invoices/new">
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs gap-1.5 font-medium">
              <FileText className="h-3.5 w-3.5" />
              <span>New Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Banner if applicable */}
      {onboardingProgress.percentage < 100 && (
        <div className="bg-white rounded-lg p-4 border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] font-bold border border-[#BFDBFE]">
              Setup {onboardingProgress.percentage}%
            </span>
            <span className="text-[#374151] font-medium">Complete your business profile to enable branding & bank accounts</span>
          </div>
          <Link href="/settings/business" className="text-[#2563EB] hover:underline font-semibold text-xs">
            Complete Setup &rarr;
          </Link>
        </div>
      )}

      {loading || !data ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
          <span className="text-xs font-medium">Loading authoritative metrics...</span>
        </div>
      ) : (
        <>
          {/* Main KPI Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-[#6B7280] font-semibold">Gross Billed Sales</span>
                <TrendingUp className="h-4 w-4 text-[#2563EB]" />
              </div>
              <p className="text-xl font-extrabold text-[#1F2937] mt-2">
                ₹{data.summary.grossSalesRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1 font-medium">{data.summary.issuedInvoiceCount} Issued Invoices</p>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-[#6B7280] font-semibold">Payments Collected</span>
                <CreditCard className="h-4 w-4 text-[#16A34A]" />
              </div>
              <p className="text-xl font-extrabold text-[#16A34A] mt-2">
                ₹{data.summary.paymentsReceivedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1 font-medium">Settled via Receipts</p>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-[#6B7280] font-semibold">Outstanding Balance</span>
                <AlertCircle className="h-4 w-4 text-[#DC2626]" />
              </div>
              <p className="text-xl font-extrabold text-[#DC2626] mt-2">
                ₹{data.summary.outstandingReceivablesRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1 font-medium">Uncollected Receivables</p>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-[#6B7280] font-semibold">GST Tax Obligation</span>
                <IndianRupee className="h-4 w-4 text-[#7C3AED]" />
              </div>
              <p className="text-xl font-extrabold text-[#7C3AED] mt-2">
                ₹{data.summary.gstCollectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#6B7280] mt-1 font-medium">
                CGST ₹{data.summary.totalCgstRupees} | IGST ₹{data.summary.totalIgstRupees}
              </p>
            </Card>
          </div>

          {/* Status Breakdown & Outstanding Ageing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice Status Distribution */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm p-4">
              <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-3">Invoice Register Status</h2>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Paid Invoices</span>
                  <span className="text-base font-bold text-[#16A34A]">{data.statusBreakdown.paid}</span>
                </div>
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Partially Paid</span>
                  <span className="text-base font-bold text-[#D97706]">{data.statusBreakdown.partiallyPaid}</span>
                </div>
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Unpaid Invoices</span>
                  <span className="text-base font-bold text-[#DC2626]">{data.statusBreakdown.unpaid}</span>
                </div>
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Issued Total</span>
                  <span className="text-base font-bold text-[#1F2937]">{data.statusBreakdown.issued}</span>
                </div>
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Draft Invoices</span>
                  <span className="text-base font-bold text-[#4B5563]">{data.statusBreakdown.draft}</span>
                </div>
                <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                  <span className="text-[#6B7280] text-[11px] block font-medium">Cancelled</span>
                  <span className="text-base font-bold text-rose-600">{data.statusBreakdown.cancelled}</span>
                </div>
              </div>
            </Card>

            {/* Outstanding Ageing Breakdown */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm p-4">
              <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-3">Outstanding Ageing Analysis</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-[#F9FAFB] rounded">
                  <span className="font-semibold text-[#374151]">Current (Not Due)</span>
                  <span className="font-bold text-[#16A34A]">₹{data.ageingBreakdown.currentRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#F9FAFB] rounded">
                  <span className="font-semibold text-[#374151]">1 – 30 Days Overdue</span>
                  <span className="font-bold text-[#D97706]">₹{data.ageingBreakdown.days1to30Rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#F9FAFB] rounded">
                  <span className="font-semibold text-[#374151]">31 – 60 Days Overdue</span>
                  <span className="font-bold text-[#EA580C]">₹{data.ageingBreakdown.days31to60Rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#F9FAFB] rounded">
                  <span className="font-semibold text-[#374151]">61 – 90 Days Overdue</span>
                  <span className="font-bold text-[#DC2626]">₹{data.ageingBreakdown.days61to90Rupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 text-red-900 rounded font-bold">
                  <span>90+ Days Overdue (Critical)</span>
                  <span>₹{data.ageingBreakdown.days90plusRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Customers & Top Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Customers Table */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#2563EB]" />
                  <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Top Customers</h2>
                </div>
                <Link href="/customers" className="text-[11px] text-[#2563EB] hover:underline font-semibold">View All &rarr;</Link>
              </div>
              <div className="p-0 overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] font-semibold border-b">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-center">Invoices</th>
                      <th className="p-3 text-right">Billed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {data.topCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-[#6B7280]">No customer billing data in period.</td>
                      </tr>
                    ) : (
                      data.topCustomers.map((c, idx) => (
                        <tr key={idx} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-semibold text-[#1F2937]">{c.name}</td>
                          <td className="p-3 text-center font-mono">{c.invoiceCount}</td>
                          <td className="p-3 text-right font-bold">₹{c.totalBilledRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Top Products Table */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#16A34A]" />
                  <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Top Selling Items</h2>
                </div>
                <Link href="/products" className="text-[11px] text-[#2563EB] hover:underline font-semibold">View Catalog &rarr;</Link>
              </div>
              <div className="p-0 overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] font-semibold border-b">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-center">HSN</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {data.topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-[#6B7280]">No product sales data in period.</td>
                      </tr>
                    ) : (
                      data.topProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-semibold text-[#1F2937]">{p.name}</td>
                          <td className="p-3 text-center font-mono">{p.hsnSacCode}</td>
                          <td className="p-3 text-center font-mono">{p.totalQuantity}</td>
                          <td className="p-3 text-right font-bold text-[#16A34A]">₹{p.totalRevenueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Recent Invoices & Recent Payments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
                <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Recent Invoices</h2>
                <Link href="/invoices" className="text-[11px] text-[#2563EB] hover:underline font-semibold">All Invoices &rarr;</Link>
              </div>
              <div className="p-0 overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] font-semibold border-b">
                    <tr>
                      <th className="p-3">Invoice No</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {data.recentInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-[#6B7280]">No recent invoices created.</td>
                      </tr>
                    ) : (
                      data.recentInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-bold text-[#2563EB]">
                            <Link href={`/invoices/${inv._id}`}>{inv.invoiceNumber}</Link>
                          </td>
                          <td className="p-3 text-[#1F2937]">{inv.customerName}</td>
                          <td className="p-3 text-right font-bold">₹{inv.grandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent Payments */}
            <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
                <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">Recent Payments</h2>
                <Link href="/payments" className="text-[11px] text-[#2563EB] hover:underline font-semibold">All Payments &rarr;</Link>
              </div>
              <div className="p-0 overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] font-semibold border-b">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {data.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-[#6B7280]">No recent payments recorded.</td>
                      </tr>
                    ) : (
                      data.recentPayments.map((pay) => (
                        <tr key={pay._id} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-bold text-[#16A34A]">{pay.receiptNumber}</td>
                          <td className="p-3 text-[#1F2937]">{pay.customerName}</td>
                          <td className="p-3 text-right font-bold text-[#16A34A]">₹{pay.amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#2563EB]">
                              {pay.paymentModeName}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

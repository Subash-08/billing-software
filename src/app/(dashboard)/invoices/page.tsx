'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Eye,
  Printer,
  RefreshCw,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/record-payment-modal';
import { Toast } from '@/components/ui/toast';

interface InvoiceListItem {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  billToSnapshot: { name: string };
  supplyType: string;
  grandTotal: number; // in paise or rupees
  paidAmount: number; // in paise or rupees
  outstandingBalance: number; // in paise or rupees
  status: 'DRAFT' | 'VALIDATING' | 'READY_TO_ISSUE' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  // If stored in paise (Rule 4: integer paise), convert to rupees
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<{
    _id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    grandTotalPaise: number;
    outstandingBalancePaise: number;
  } | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('paymentStatus', paymentStatusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.items || []);
      }
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, paymentStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleOpenPaymentModal = (inv: InvoiceListItem) => {
    setSelectedInvoiceForPayment({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.billToSnapshot?.name || 'Customer',
      grandTotalPaise: inv.grandTotal,
      outstandingBalancePaise: inv.outstandingBalance,
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setToastMessage('Payment recorded successfully! Invoice status and balance updated.');
    fetchInvoices();
  };

  // Analytics Aggregation
  const totalInvoicedRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.grandTotal), 0);
  const totalCollectedRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.paidAmount), 0);
  const totalOutstandingRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.outstandingBalance), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSuccess={handlePaymentSuccess}
          invoice={selectedInvoiceForPayment}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tax Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, issue, track payments, and manage GST tax invoices.
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-[#0f172a] hover:bg-slate-800 text-white gap-2 shadow-sm font-semibold text-xs">
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ₹{totalInvoicedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{invoices.length} total invoices</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Collected</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-2">
            ₹{totalCollectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Received in bank / cash</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Due</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-amber-700 mt-2">
            ₹{totalOutstandingRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">Pending payment collection</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Collection Rate</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-purple-700 mt-2">
            {totalInvoicedRupees > 0
              ? `${Math.round((totalCollectedRupees / totalInvoicedRupees) * 100)}%`
              : '100%'}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Of total billed revenue</span>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 p-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full sm:w-80">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice no, customer..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:border-slate-800 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Doc Status: All</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="">Payment Status: All</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>

            <Button variant="outline" size="sm" onClick={fetchInvoices} className="gap-1 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Loading invoices from database...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No invoices found matching your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Invoice No</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Supply Type</th>
                  <th className="px-5 py-3.5 text-right">Grand Total</th>
                  <th className="px-5 py-3.5 text-right">Returned / Credit</th>
                  <th className="px-5 py-3.5 text-right">Outstanding</th>
                  <th className="px-4 py-3.5 text-center">Doc Status</th>
                  <th className="px-4 py-3.5 text-center">Payment Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv: any) => {
                  const grandTotalRupees = toRupees(inv.grandTotal);
                  const returnedRupees = toRupees(inv.returnedAmount);
                  const outstandingBalanceRupees = toRupees(inv.outstandingBalance);

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {inv.billToSnapshot?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-300">
                          {inv.supplyType}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900 text-xs">
                        ₹{grandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-red-700 text-xs">
                        {returnedRupees > 0
                          ? `₹${returnedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '-'}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-amber-700 text-xs">
                        ₹{outstandingBalanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {inv.status === 'ISSUED' && <Badge variant="success">Issued</Badge>}
                        {inv.status === 'DRAFT' && <Badge variant="secondary">Draft</Badge>}
                        {inv.status === 'CANCELLED' && <Badge variant="destructive">Cancelled</Badge>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {inv.paymentStatus === 'PAID' && <Badge variant="success">Paid</Badge>}
                        {inv.paymentStatus === 'PARTIALLY_PAID' && (
                          <Badge variant="warning">Partially Paid</Badge>
                        )}
                        {inv.paymentStatus === 'UNPAID' && <Badge variant="outline">Unpaid</Badge>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'ISSUED' && inv.paymentStatus !== 'PAID' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-[11px] gap-1 font-semibold shadow-xs"
                              title="Record Payment"
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>Record Payment</span>
                            </Button>
                          )}
                          <Link href={`/invoices/${inv._id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {inv.status === 'ISSUED' && (
                            <Link href={`/invoices/${inv._id}/print`} target="_blank">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                title="Print Invoice"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

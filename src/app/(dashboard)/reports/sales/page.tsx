'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Landmark,
  Eye,
  Plus,
  CreditCard,
  RotateCcw,
  Info,
  Calculator,
} from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/record-payment-modal';
import { Toast } from '@/components/ui/toast';

interface SalesInvoiceItem {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  billToSnapshot: { name: string; gstin?: string };
  supplyType: string;
  subTotal: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalUtgst: number;
  totalCess: number;
  grandTotal: number;
  returnedAmount?: number;
  paidAmount: number;
  outstandingBalance: number;
  status: 'DRAFT' | 'VALIDATING' | 'READY_TO_ISSUE' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

interface PaymentReceiptItem {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaise: number;
  customerSnapshot: { displayName: string };
  paymentModeSnapshot?: { name: string; code: string };
  referenceNumber?: string;
  notes?: string;
  status: 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REVERSED';
}

interface ICreditNoteReportItem {
  _id: string;
  grandTotal?: number;
  subTotal?: number;
  totalTaxable?: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  subtotalPaise?: number;
  totalTaxablePaise?: number;
  totals?: { grandTotalPaise: number; totalTaxablePaise: number; totalTaxPaise: number };
  items?: Array<{ rate: number; quantity: number; gstRate: number }>;
}

interface RefundReportItem {
  _id: string;
  amountPaise: number;
  status: string;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function SalesRegisterReportPage() {
  const [reportView, setReportView] = useState<'INVOICES' | 'PAYMENTS'>('INVOICES');

  const [invoices, setInvoices] = useState<SalesInvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentReceiptItem[]>([]);
  const [creditNotes, setCreditNotes] = useState<ICreditNoteReportItem[]>([]);
  const [refunds, setRefunds] = useState<RefundReportItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
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

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (paymentStatusFilter) params.set('paymentStatus', paymentStatusFilter);

      const [invRes, payRes, cnRes, refRes] = await Promise.all([
        fetch(`/api/invoices?${params.toString()}`),
        fetch('/api/payments'),
        fetch('/api/credit-notes'),
        fetch('/api/refunds'),
      ]);

      const invJson = await invRes.json();
      const payJson = await payRes.json();
      const cnJson = await cnRes.json();
      const refJson = await refRes.json();

      if (invJson.success) setInvoices(invJson.items || []);
      if (payJson.success) setPayments(payJson.items || []);
      if (cnJson.success) setCreditNotes(cnJson.creditNotes || []);
      if (refJson.success) setRefunds(refJson.refunds || []);
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportView, statusFilter, paymentStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenPaymentModal = (inv: SalesInvoiceItem) => {
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
    setToastMessage('Payment recorded successfully! Report updated.');
    loadData();
  };

  // Aggregation Metrics across all invoices
  const totalTaxableRupees = invoices.reduce(
    (sum, inv) => sum + toRupees(inv.totalTaxable || inv.subTotal),
    0
  );

  const grossTaxRupees = invoices.reduce(
    (sum, inv) =>
      sum +
      toRupees(
        (inv.totalCgst || 0) +
        (inv.totalSgst || 0) +
        (inv.totalIgst || 0) +
        (inv.totalUtgst || 0) +
        (inv.totalCess || 0)
      ),
    0
  );

  const totalCreditNotesTaxRupees = creditNotes.reduce((sum, cn) => {
    let taxPaise = cn.totals?.totalTaxPaise || 0;
    if (taxPaise === 0) {
      taxPaise = (cn.totalCgst || 0) + (cn.totalSgst || 0) + (cn.totalIgst || 0);
    }
    if (taxPaise === 0 && cn.items && cn.items.length > 0) {
      taxPaise = cn.items.reduce((s, it) => {
        const itemTaxable = (it.rate || 0) * (it.quantity || 1);
        return s + Math.round(itemTaxable * ((it.gstRate || 0) / 100));
      }, 0);
    }
    return sum + toRupees(taxPaise);
  }, 0);

  const totalCreditNotesTaxableRupees = creditNotes.reduce((sum, cn) => {
    let taxablePaise = cn.totals?.totalTaxablePaise || cn.subtotalPaise || 0;
    if (taxablePaise === 0 && (cn.totalTaxable || cn.subTotal)) {
      return sum + toRupees(cn.totalTaxable || cn.subTotal);
    }
    if (taxablePaise === 0 && cn.items) {
      taxablePaise = cn.items.reduce((s, it) => s + (it.rate || 0) * (it.quantity || 1), 0);
    }
    return sum + toRupees(taxablePaise);
  }, 0);

  const netTaxRupees = Math.max(0, grossTaxRupees - totalCreditNotesTaxRupees);
  const totalGrandRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.grandTotal), 0);
  const totalReturnedRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.returnedAmount), 0);
  const totalNetBilledRupees = totalGrandRupees - totalReturnedRupees;
  const totalCollectedRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.paidAmount), 0);
  const totalRefundsPaidRupees = refunds.reduce((sum, r) => sum + toRupees(r.amountPaise), 0);
  const netCashRetainedRupees = Math.max(0, totalCollectedRupees - totalRefundsPaidRupees);
  const totalDirectReceiptsRupees = payments.reduce((sum, p) => sum + toRupees(p.amountPaise), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales & Collections Register Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Itemized tax invoice sales, sales returns deduction, GST output tax reduction, and collection logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Link href="/invoices/new">
            <Button className="bg-[#0f172a] hover:bg-slate-800 text-white gap-2 shadow-sm font-semibold text-xs">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Report Register View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setReportView('INVOICES')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${reportView === 'INVOICES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Sales Invoices Register ({invoices.length})</span>
        </button>

        <button
          onClick={() => setReportView('PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${reportView === 'PAYMENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
            }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment Receipts ({payments.length})</span>
        </button>
      </div>

      {/* Sales Return Accounting Explanation Info Banner */}
      <div className="p-3.5 border border-blue-200 bg-blue-50/70 rounded-xl flex items-start gap-3 text-slate-800 text-[11px] leading-relaxed">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-slate-900">Sales Register & Credit Notes Accounting:</span>
          When a sales return / Credit Note is issued against an invoice, it automatically offsets any unpaid invoice balance first, and processes any excess cash collected as a direct customer refund. Net Sales and GST Output Tax (Section 34) are automatically reduced to reflect actual net tax liability.
        </div>
      </div>

      {/* Top Metric Cards */}
      {reportView === 'INVOICES' ? (
        <div className="space-y-3.5">
          {/* Row 1: Gross Invoicing & Tax Output (Before Credit Notes) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Total Invoice Value (Gross)</span>
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-base font-bold text-slate-900 mt-1.5">
                ₹{totalGrandRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                Taxable ₹{totalTaxableRupees.toLocaleString('en-IN')} + GST ₹{grossTaxRupees.toLocaleString('en-IN')}
              </span>
            </Card>

            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">GST Charged</span>
                <Landmark className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-base font-bold text-indigo-700 mt-1.5">
                ₹{grossTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-indigo-600 font-medium mt-0.5 block">
                CGST + SGST + IGST charged on original invoices
              </span>
            </Card>

            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Returns & Credit Notes</span>
                <RotateCcw className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-base font-bold text-red-700 mt-1.5">
                ₹{totalReturnedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-red-600 font-medium mt-0.5 block">
                Taxable ₹{totalCreditNotesTaxableRupees.toLocaleString('en-IN')} + GST ₹{totalCreditNotesTaxRupees.toLocaleString('en-IN')}
              </span>
            </Card>
          </div>

          {/* Row 2: Net Position & GST Output (After Credit Notes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Sales After Returns</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-emerald-700 mt-1.5">
                ₹{totalNetBilledRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
                Taxable ₹{(totalTaxableRupees - totalCreditNotesTaxableRupees).toLocaleString('en-IN')} + GST ₹{netTaxRupees.toLocaleString('en-IN')}
              </span>
            </Card>

            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">GST Output After Returns</span>
                <Landmark className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-base font-bold text-blue-700 mt-1.5">
                ₹{netTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">
                Gross GST ₹{grossTaxRupees.toLocaleString('en-IN')} − Credit GST ₹{totalCreditNotesTaxRupees.toLocaleString('en-IN')}
              </span>
            </Card>

            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Cash Collected</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-emerald-700 mt-1.5">
                ₹{totalCollectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
                {totalRefundsPaidRupees > 0
                  ? `Refunded ₹${totalRefundsPaidRupees.toLocaleString('en-IN')} · Cash After Refunds ₹${netCashRetainedRupees.toLocaleString('en-IN')}`
                  : 'Total payments received'}
              </span>
            </Card>

            <Card className="border border-slate-200 bg-white p-3.5 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-semibold">Amount Still Due</span>
                <Clock className="h-4 w-4 text-slate-500" />
              </div>
              <p className="text-base font-bold text-slate-900 mt-1.5">
                ₹{(invoices.reduce((s, i) => s + toRupees(i.outstandingBalance), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                Customers still owe you
              </span>
            </Card>
          </div>

          {/* Sales & Tax Audit Reconciliation Breakdown Table */}
          <Card className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-400" />
                Sales & Tax Mathematical Reconciliation Audit
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Stage-by-Stage Tax & Invoice Totals</span>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-2.5">Accounting Stage</th>
                    <th className="px-5 py-2.5 text-right">Taxable Amount (Pre-Tax)</th>
                    <th className="px-5 py-2.5 text-right">GST Amount</th>
                    <th className="px-5 py-2.5 text-right">Total (Incl. GST)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">Original Invoices Billed</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-900">
                      ₹{totalTaxableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-indigo-700">
                      ₹{grossTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                      ₹{totalGrandRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 text-red-700">
                    <td className="px-5 py-3 font-semibold">Less: Sales Returns & Credit Notes</td>
                    <td className="px-5 py-3 text-right font-mono">
                      -₹{totalCreditNotesTaxableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      -₹{totalCreditNotesTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold">
                      -₹{totalReturnedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/60 font-extrabold text-emerald-950 border-t-2 border-emerald-200">
                    <td className="px-5 py-3 font-bold text-emerald-900">Sales After Returns (Net Billed Position)</td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-900">
                      ₹{(totalTaxableRupees - totalCreditNotesTaxableRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-900">
                      ₹{netTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-950 text-sm">
                      ₹{totalNetBilledRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Collection & Cash Flow Reconciliation Table */}
          <Card className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Collection & Cash Flow Reconciliation Audit
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Money Movements & Customer Balances</span>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-2">Cash Flow Metric</th>
                    <th className="px-5 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-semibold text-slate-800">Payments Received from Customers</td>
                    <td className="px-5 py-2.5 text-right font-mono text-emerald-700 font-bold">
                      ₹{totalCollectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 text-red-700">
                    <td className="px-5 py-2.5 font-semibold">Less: Cash Refunds Paid Out to Customers</td>
                    <td className="px-5 py-2.5 text-right font-mono font-bold">
                      -₹{totalRefundsPaidRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-blue-50/70 font-extrabold text-blue-950 border-t border-blue-200">
                    <td className="px-5 py-2.5 font-bold text-blue-900">Net Cash Received by Business</td>
                    <td className="px-5 py-2.5 text-right font-mono text-blue-900 text-sm font-bold">
                      ₹{netCashRetainedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 text-slate-600">
                    <td className="px-5 py-2.5 font-medium">Credit Notes Applied to Unpaid Invoices</td>
                    <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-700">
                      ₹{(totalReturnedRupees - totalRefundsPaidRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Total Payment Receipts</span>
            <p className="text-xl font-extrabold text-emerald-700 mt-1">
              ₹{totalDirectReceiptsRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{payments.length} total receipts recorded</span>
          </Card>

          <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Settled Invoices Revenue</span>
            <p className="text-xl font-extrabold text-blue-700 mt-1">
              ₹{totalCollectedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Allocated to sales invoices</span>
          </Card>
        </div>
      )}

      {/* Main Table Card */}
      {reportView === 'INVOICES' ? (
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
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <span className="text-xs font-medium">Loading sales register report...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No sales invoices found matching your criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Invoice No</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">GSTIN</th>
                    <th className="px-5 py-3.5 text-right">Gross Total</th>
                    <th className="px-5 py-3.5 text-right">Returned / Refund</th>
                    <th className="px-5 py-3.5 text-right">Net Value</th>
                    <th className="px-5 py-3.5 text-right">Paid Amount</th>
                    <th className="px-4 py-3.5 text-center">Payment Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {invoices.map((inv) => {
                    const grossTotalRupees = toRupees(inv.grandTotal);
                    const returnedRupees = toRupees(inv.returnedAmount);
                    const netInvoiceRupees = grossTotalRupees - returnedRupees;
                    const paidAmountRupees = toRupees(inv.paidAmount);

                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline text-blue-700">
                            {inv.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {inv.billToSnapshot?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 font-mono text-[11px] text-slate-600">
                          {inv.billToSnapshot?.gstin || 'Unregistered'}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-900 font-bold">
                          ₹{grossTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right font-extrabold text-red-700">
                          {returnedRupees > 0
                            ? `₹${returnedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-5 py-4 text-right font-extrabold text-emerald-800">
                          ₹{netInvoiceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-blue-700">
                          ₹{paidAmountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {inv.paymentStatus === 'PAID' && (
                            returnedRupees > 0 ? (
                              <Badge
                                variant="success"
                                className="bg-emerald-50 text-emerald-900 border-emerald-300 font-bold"
                                title="Invoice balance was cleared partly or fully using a credit note."
                              >
                                Settled by Credit Note
                              </Badge>
                            ) : (
                              <Badge variant="success">Paid</Badge>
                            )
                          )}
                          {inv.paymentStatus === 'PARTIALLY_PAID' && (
                            <Badge variant="warning">Partially Paid</Badge>
                          )}
                          {inv.paymentStatus === 'UNPAID' && <Badge variant="outline">Unpaid</Badge>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
      ) : (
        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardHeader className="p-4 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">Customer Payment Receipts Log</span>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
                <span className="text-xs font-medium">Loading payment receipts...</span>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                No payment receipts found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Receipt No</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Payment Mode</th>
                    <th className="px-4 py-3.5">Ref No</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Amount Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-900 font-mono">{p.receiptNumber}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{p.customerSnapshot?.displayName || 'Customer'}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{p.paymentModeSnapshot?.name || 'Cash'}</td>
                      <td className="px-4 py-4 font-mono text-[11px] text-slate-600">{p.referenceNumber || '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="success">Completed</Badge>
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-emerald-700">
                        ₹{toRupees(p.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

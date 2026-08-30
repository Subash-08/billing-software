'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  CreditCard,
  History,
  Info,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  ArrowLeftRight,
} from 'lucide-react';
import { paiseToRupees } from '@/lib/money';

interface ICustomerDetail {
  _id: string;
  displayName: string;
  legalName?: string;
  customerType: string;
  phone: string;
  email?: string;
  gstTreatment: string;
  gstin?: string;
  stateCode: string;
  billingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
    country?: string;
  };
  shippingAddresses: Array<{
    id?: string;
    label?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  }>;
  contacts: Array<{
    name: string;
    phone?: string;
    email?: string;
    designation?: string;
  }>;
  creditBalance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface CustomerInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  status: string;
  paymentStatus: string;
}

interface CustomerPayment {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaise: number;
  paymentModeSnapshot?: { name: string };
  referenceNumber?: string;
  status: string;
  notes?: string;
}

interface CustomerCreditNote {
  _id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  grandTotal?: number;
  totals?: { grandTotalPaise: number };
  reason: string;
  status: string;
}

interface CustomerRefund {
  _id: string;
  refundNumber: string;
  refundDate: string;
  amountPaise: number;
  refundMode?: string;
  referenceNumber?: string;
  reason: string;
  status: string;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<ICustomerDetail | null>(null);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [creditNotes, setCreditNotes] = useState<CustomerCreditNote[]>([]);
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'addresses' | 'contacts' | 'transactions' | 'statement' | 'activity'>('overview');
  const [error, setError] = useState<string | null>(null);

  // New shipping address modal state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Branch Warehouse',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Tamil Nadu',
    stateCode: '33',
    pincode: '',
  });

  const loadCustomerData = async () => {
    try {
      const [custRes, invRes, payRes, cnRes, refRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch(`/api/invoices?customerId=${id}&limit=100`),
        fetch(`/api/payments?customerId=${id}&limit=100`),
        fetch('/api/credit-notes'),
        fetch('/api/refunds'),
      ]);

      const custData = await custRes.json();
      const invData = await invRes.json();
      const payData = await payRes.json();
      const cnData = await cnRes.json();
      const refData = await refRes.json();

      if (!custRes.ok) throw new Error(custData.error || 'Failed to fetch customer details');
      setCustomer(custData.customer);

      if (invData.success) setInvoices(invData.items || invData.invoices || []);
      if (payData.success) setPayments(payData.items || payData.payments || []);

      if (cnData.success) {
        const custCNs = (cnData.creditNotes || []).filter(
          (cn: any) =>
            cn.customerId === id ||
            cn.customerId?._id === id ||
            cn.customerSnapshot?.displayName === custData.customer?.displayName
        );
        setCreditNotes(custCNs);
      }

      if (refData.success) {
        const custRefs = (refData.refunds || []).filter(
          (rf: any) =>
            rf.customerId === id ||
            rf.customerId?._id === id ||
            rf.customerSnapshot?.displayName === custData.customer?.displayName
        );
        setRefunds(custRefs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const handleAddShippingAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAddress(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddresses: [
            ...(customer?.shippingAddresses || []),
            { ...newAddress, id: `ship_${Date.now()}` },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add address');
      setCustomer(data.customer);
      setShowAddAddress(false);
      setNewAddress({
        label: 'Branch Warehouse',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '',
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingAddress(false);
    }
  };

  const handleRemoveShippingAddress = async (shipId: string) => {
    if (!confirm('Remove this shipping address?')) return;
    try {
      const updated = customer?.shippingAddresses.filter((s) => s.id !== shipId) || [];
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddresses: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove address');
      setCustomer(data.customer);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 max-w-6xl mx-auto text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
        <span>Loading customer account profile...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="py-12 text-center text-xs text-red-600 max-w-6xl mx-auto space-y-4">
        <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
        <p>{error || 'Customer record not found.'}</p>
        <Link href="/customers">
          <Button variant="outline" size="sm">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  const totalInvoicedRupees = invoices.reduce((sum, i) => sum + toRupees(i.grandTotal), 0);
  const totalPaidRupees = invoices.reduce((sum, i) => sum + toRupees(i.paidAmount), 0);
  const totalOutstandingRupees = invoices.reduce((sum, i) => sum + toRupees(i.outstandingBalance), 0);
  const totalCreditNotesRupees = creditNotes.reduce((sum, cn) => sum + toRupees(cn.grandTotal || cn.totals?.grandTotalPaise), 0);
  const totalRefundsRupees = refunds.reduce((sum, r) => sum + toRupees(r.amountPaise), 0);

  // Chronological Ledger Entries for Statement
  const ledgerEntries: Array<{
    date: string;
    refNo: string;
    description: string;
    debitPaise: number;
    creditPaise: number;
    link: string;
  }> = [];

  invoices.forEach((i) => {
    ledgerEntries.push({
      date: i.invoiceDate,
      refNo: i.invoiceNumber,
      description: `Sales Invoice #${i.invoiceNumber}`,
      debitPaise: i.grandTotal,
      creditPaise: 0,
      link: `/invoices/${i._id}`,
    });
  });

  payments.forEach((p) => {
    ledgerEntries.push({
      date: p.paymentDate,
      refNo: p.receiptNumber,
      description: `Payment Receipt #${p.receiptNumber} (${p.paymentModeSnapshot?.name || 'Cash'})`,
      debitPaise: 0,
      creditPaise: p.amountPaise,
      link: `/payments`,
    });
  });

  creditNotes.forEach((cn) => {
    ledgerEntries.push({
      date: cn.creditNoteDate,
      refNo: cn.creditNoteNumber,
      description: `Credit Note #${cn.creditNoteNumber} (${cn.reason.replace(/_/g, ' ')})`,
      debitPaise: 0,
      creditPaise: cn.grandTotal || cn.totals?.grandTotalPaise || 0,
      link: `/credit-notes`,
    });
  });

  refunds.forEach((r) => {
    ledgerEntries.push({
      date: r.refundDate,
      refNo: r.refundNumber,
      description: `Cash Refund Payout #${r.refundNumber} (${r.refundMode || 'Bank Transfer'})`,
      debitPaise: r.amountPaise,
      creditPaise: 0,
      link: `/refunds`,
    });
  });

  ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBalanceRupees = 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg">
              <ArrowLeft className="w-4 h-4 text-slate-700" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.displayName}</h1>
              <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {customer.status}
              </Badge>
              <Badge variant="outline" className="font-mono uppercase text-[10px]">
                {customer.gstTreatment}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              {customer.gstin && <span>GSTIN: <strong className="font-mono text-slate-700">{customer.gstin}</strong></span>}
              <span>Phone: <strong className="text-slate-700">{customer.phone}</strong></span>
              {customer.email && <span>Email: <strong className="text-slate-700">{customer.email}</strong></span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/invoices/new?customerId=${customer._id}`}>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-semibold text-xs shadow-xs">
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs rounded-xl p-4">
          <div className="text-slate-500 font-semibold text-[11px]">Total Billed</div>
          <p className="text-lg font-bold text-slate-900 mt-1">
            ₹{totalInvoicedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{invoices.length} invoices issued</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs rounded-xl p-4">
          <div className="text-slate-500 font-semibold text-[11px]">Total Collected</div>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            ₹{totalPaidRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">{payments.length} receipts recorded</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs rounded-xl p-4">
          <div className="text-slate-500 font-semibold text-[11px]">Credit Notes Issued</div>
          <p className="text-lg font-bold text-red-700 mt-1">
            ₹{totalCreditNotesRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-red-600 font-medium mt-0.5 block">{creditNotes.length} sales returns</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs rounded-xl p-4">
          <div className="text-slate-500 font-semibold text-[11px]">Cash Refunded</div>
          <p className="text-lg font-bold text-purple-700 mt-1">
            ₹{totalRefundsRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-purple-600 font-medium mt-0.5 block">{refunds.length} cash payouts</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs rounded-xl p-4">
          <div className="text-slate-500 font-semibold text-[11px]">Outstanding Due</div>
          <p className="text-lg font-bold text-amber-700 mt-1">
            ₹{totalOutstandingRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-amber-600 font-medium mt-0.5 block">Pending receivable balance</span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-all ${activeTab === 'overview' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Profile Overview
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 transition-all ${activeTab === 'transactions' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Transactions ({invoices.length + creditNotes.length + payments.length + refunds.length})
        </button>
        <button
          onClick={() => setActiveTab('statement')}
          className={`pb-3 transition-all ${activeTab === 'statement' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Account Statement ({ledgerEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 transition-all ${activeTab === 'addresses' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Shipping Destinations ({customer.shippingAddresses.length + 1})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`pb-3 transition-all ${activeTab === 'contacts' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Contacts ({customer.contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 transition-all ${activeTab === 'activity' ? 'border-b-2 border-slate-900 text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Activity Timeline
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6 text-xs">
          <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Business Identity</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Display Name</span>
                <span className="font-bold text-slate-900">{customer.displayName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Customer Category</span>
                <Badge variant="outline">{customer.customerType}</Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">GST Treatment</span>
                <span className="font-semibold text-slate-900">{customer.gstTreatment}</span>
              </div>
              {customer.gstin && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">GSTIN</span>
                  <span className="font-mono font-bold text-slate-900">{customer.gstin}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Phone</span>
                <span className="font-semibold text-slate-900">{customer.phone}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Primary Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-xs space-y-1 text-slate-700">
              <div className="font-bold text-slate-900 text-sm mb-1">{customer.displayName}</div>
              <div>{customer.billingAddress?.addressLine1}</div>
              {customer.billingAddress?.addressLine2 && <div>{customer.billingAddress.addressLine2}</div>}
              <div>
                {customer.billingAddress?.city}, {customer.billingAddress?.state} - {customer.billingAddress?.pincode}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 font-mono font-semibold">
                State Code: {customer.billingAddress?.stateCode}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Invoices List */}
          <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Issued Tax Invoices ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {invoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No invoices issued to this customer yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Invoice No</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Grand Total</th>
                      <th className="px-5 py-3 text-right">Paid</th>
                      <th className="px-5 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold font-mono text-blue-700">
                          <Link href={`/invoices/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-slate-900">₹{toRupees(inv.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-700">₹{toRupees(inv.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-amber-700">₹{toRupees(inv.outstandingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3.5 text-center">
                          {inv.paymentStatus === 'PAID' && <Badge variant="success">Paid</Badge>}
                          {inv.paymentStatus === 'PARTIALLY_PAID' && <Badge variant="warning">Partially Paid</Badge>}
                          {inv.paymentStatus === 'UNPAID' && <Badge variant="outline">Unpaid</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Credit Notes List */}
          <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Credit Notes & Sales Returns ({creditNotes.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {creditNotes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No credit notes issued for this customer.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Credit Note No</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Reason</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Credit Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {creditNotes.map((cn) => (
                      <tr key={cn._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{cn.creditNoteNumber}</td>
                        <td className="px-5 py-3.5 text-slate-600">{new Date(cn.creditNoteDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className="uppercase text-[10px]">{cn.reason.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="success">Issued</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-red-700">
                          ₹{toRupees(cn.grandTotal || cn.totals?.grandTotalPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Payment Receipts & Collections ({payments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {payments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No payment receipts recorded for this customer yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Receipt No</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Mode & Notes</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{p.receiptNumber}</td>
                        <td className="px-5 py-3.5 text-slate-600">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{p.paymentModeSnapshot?.name || 'Cash'}</div>
                          {p.notes && <div className="text-[11px] text-slate-500 font-normal">{p.notes}</div>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="success">Completed</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-emerald-700">₹{toRupees(p.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Cash Refunds List */}
          <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Cash / Bank Refund Payouts ({refunds.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {refunds.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No cash refunds issued to this customer yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="px-5 py-3">Refund No</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Mode & Reason</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Amount Refunded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {refunds.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{r.refundNumber}</td>
                        <td className="px-5 py-3.5 text-slate-600">{new Date(r.refundDate).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">{r.refundMode || 'Bank Transfer'}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{r.reason}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant="success">Completed</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-purple-700">
                          ₹{toRupees(r.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STATEMENT TAB */}
      {activeTab === 'statement' && (
        <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Customer Account Statement</CardTitle>
            <span className="text-[11px] text-slate-500 font-medium">Chronological Debit / Credit Ledger</span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No accounting ledger activity recorded for this customer.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Transaction Description</th>
                    <th className="px-5 py-3.5">Ref No</th>
                    <th className="px-5 py-3.5 text-right">Debit (Invoices & Refund Payouts ₹)</th>
                    <th className="px-5 py-3.5 text-right">Credit (Payments & Sales Returns ₹)</th>
                    <th className="px-5 py-3.5 text-right">Customer Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledgerEntries.map((entry, idx) => {
                    const debitRupees = toRupees(entry.debitPaise);
                    const creditRupees = toRupees(entry.creditPaise);
                    runningBalanceRupees += debitRupees - creditRupees;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-5 py-4 text-slate-600">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{entry.description}</td>
                        <td className="px-5 py-4 font-mono text-blue-700 font-bold">
                          <Link href={entry.link} className="hover:underline">{entry.refNo}</Link>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900">
                          {debitRupees > 0 ? `₹${debitRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-700">
                          {creditRupees > 0 ? `₹${creditRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className={`px-5 py-4 text-right font-extrabold ${runningBalanceRupees >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          ₹{Math.abs(runningBalanceRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {runningBalanceRupees >= 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ADDRESSES TAB */}
      {activeTab === 'addresses' && (
        <div className="space-y-6 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Registered Addresses</h2>
            <Button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 gap-1 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Shipping Address</span>
            </Button>
          </div>

          {showAddAddress && (
            <form onSubmit={handleAddShippingAddress} className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
              <h3 className="font-bold text-blue-950">New Shipping Destination</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input placeholder="Label (e.g. Warehouse 2)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} required className="bg-white text-xs" />
                <Input placeholder="Address Line 1" value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} required className="bg-white text-xs" />
                <Input placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} required className="bg-white text-xs" />
                <Input placeholder="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} required maxLength={6} className="bg-white font-mono text-xs" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddAddress(false)} className="text-xs bg-white">Cancel</Button>
                <Button type="submit" disabled={addingAddress} className="bg-slate-900 text-white text-xs font-semibold">{addingAddress ? 'Adding...' : 'Save address'}</Button>
              </div>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
              <CardHeader className="border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Primary Billing Address</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-xs space-y-1 text-slate-700">
                <div className="font-bold text-slate-900 mb-1">{customer.displayName}</div>
                <div>{customer.billingAddress?.addressLine1}</div>
                <div>{customer.billingAddress?.city}, {customer.billingAddress?.state} - {customer.billingAddress?.pincode}</div>
              </CardContent>
            </Card>

            {customer.shippingAddresses.map((ship, idx) => (
              <Card key={ship.id || idx} className="border-slate-200 shadow-sm bg-white rounded-xl">
                <CardHeader className="border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">{ship.label || `Shipping Address ${idx + 1}`}</CardTitle>
                  {ship.id && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveShippingAddress(ship.id!)} className="h-6 w-6 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-6 text-xs space-y-1 text-slate-700">
                  <div>{ship.addressLine1}</div>
                  <div>{ship.city}, {ship.state} - {ship.pincode}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl text-xs">
          <CardHeader className="border-b border-slate-100 py-3.5 px-6">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact Persons</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {customer.contacts.length === 0 ? (
              <p className="text-slate-500">No additional contact persons registered.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {customer.contacts.map((c, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    {c.designation && <div className="text-[11px] text-slate-500">{c.designation}</div>}
                    {c.phone && <div className="text-xs text-slate-700">Phone: {c.phone}</div>}
                    {c.email && <div className="text-xs text-slate-700">Email: {c.email}</div>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ACTIVITY TIMELINE TAB */}
      {activeTab === 'activity' && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl text-xs">
          <CardHeader className="border-b border-slate-100 py-3.5 px-6">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">Audit Log & Customer Timeline ({ledgerEntries.length} Events)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-slate-700 space-y-4">
            {ledgerEntries.map((e, idx) => (
              <div key={idx} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700 mt-0.5">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{e.description}</div>
                  <div className="text-[11px] text-slate-500">{new Date(e.date).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

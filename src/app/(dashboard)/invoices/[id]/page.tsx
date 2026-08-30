'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Send, Ban, Lock, RefreshCw, DollarSign } from 'lucide-react';
import { RecordPaymentModal } from '@/components/modals/record-payment-modal';
import { Toast } from '@/components/ui/toast';

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  financialYear: string;
  customerId: { _id?: string } | string;
  status: 'DRAFT' | 'VALIDATING' | 'READY_TO_ISSUE' | 'ISSUED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  invoiceDate: string;
  dueDate: string;
  supplyType: string;
  billFromSnapshot: { name: string; gstin?: string; addressLine: string; city: string; state: string; pincode?: string };
  billToSnapshot: { name: string; gstin?: string; addressLine: string; city: string; state: string; pincode?: string };
  items: Array<{
    name: string;
    hsnSacCode: string;
    quantity: number;
    unit: string;
    rate: number;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>;
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalUtgst: number;
  totalIgst: number;
  totalCess: number;
  roundOff: number;
  grandTotal: number;
  paidAmount?: number;
  outstandingBalance?: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${resolvedParams.id}`);
      const json = await res.json();
      if (json.success) {
        setInvoice(json.data);
      }
    } catch (err) {
      console.error('Failed to load invoice', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [resolvedParams.id]);

  const handleIssue = async () => {
    if (!confirm('Are you sure you want to ISSUE this invoice? This will lock all historical snapshots and generate an official serial number.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${resolvedParams.id}/issue`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setInvoice(json.data);
        setToastMessage(`Invoice successfully issued as ${json.data.invoiceNumber}!`);
      } else {
        alert(`Issue failed: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Issue error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason || reason.trim().length < 3) {
      alert('Cancellation reason must be at least 3 characters.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/invoices/${resolvedParams.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        setInvoice(json.data);
        setToastMessage('Invoice cancelled.');
      } else {
        alert(`Cancellation failed: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Cancellation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setToastMessage('Payment recorded successfully! Invoice balance updated.');
    fetchInvoice();
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500 max-w-4xl mx-auto">Loading invoice details...</div>;
  }

  if (!invoice) {
    return <div className="py-12 text-center text-xs text-slate-500 max-w-4xl mx-auto">Invoice not found.</div>;
  }

  const custIdStr = typeof invoice.customerId === 'object' ? invoice.customerId._id || '' : invoice.customerId || '';
  const outstandingBal = invoice.outstandingBalance !== undefined ? invoice.outstandingBalance : (invoice.grandTotal - (invoice.paidAmount || 0));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {toastMessage && (
        <Toast type="success" message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {invoice.status === 'ISSUED' && (
        <RecordPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          invoice={{
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            customerId: custIdStr,
            customerName: invoice.billToSnapshot?.name || 'Customer',
            grandTotalPaise: invoice.grandTotal,
            outstandingBalancePaise: outstandingBal,
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{invoice.invoiceNumber}</h1>
              {invoice.status === 'ISSUED' && <Badge variant="success">Issued</Badge>}
              {invoice.status === 'DRAFT' && <Badge variant="secondary">Draft</Badge>}
              {invoice.status === 'CANCELLED' && <Badge variant="destructive">Cancelled</Badge>}

              {invoice.paymentStatus === 'PAID' && <Badge variant="success">Paid</Badge>}
              {invoice.paymentStatus === 'PARTIALLY_PAID' && <Badge variant="warning">Partially Paid</Badge>}
              {invoice.paymentStatus === 'UNPAID' && <Badge variant="outline">Unpaid</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Financial Year: {invoice.financialYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === 'ISSUED' && invoice.paymentStatus !== 'PAID' && (
            <Button
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-xs"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Record Payment</span>
            </Button>
          )}

          {invoice.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={handleIssue}
              disabled={actionLoading}
              className="bg-[#0f172a] hover:bg-slate-800 text-white gap-1.5 text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Issue Invoice</span>
            </Button>
          )}

          {invoice.status !== 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5 text-xs"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Cancel Invoice</span>
            </Button>
          )}

          {invoice.status === 'ISSUED' && (
            <Link href={`/invoices/${invoice._id}/print`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Print Invoice</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 px-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">TAX INVOICE</h2>
              <p className="text-xs text-slate-500 mt-1">Rule 46 GST Document</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-700">Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
              <p className="text-xs text-slate-500 mt-0.5">Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 text-xs text-slate-700">
          {/* Bill From & Bill To Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Billed By (Seller)</h3>
              {(invoice.billFromSnapshot as any).logoUrl && (
                <img
                  src={(invoice.billFromSnapshot as any).logoUrl}
                  alt="Company Logo"
                  className="h-10 w-auto object-contain mb-2"
                />
              )}
              <p className="font-semibold text-slate-900">{invoice.billFromSnapshot.name}</p>
              {invoice.billFromSnapshot.gstin && (
                <p className="text-slate-600 font-mono mt-0.5">GSTIN: {invoice.billFromSnapshot.gstin}</p>
              )}
              <p className="text-slate-600 mt-1">{invoice.billFromSnapshot.addressLine}</p>
              <p className="text-slate-600">
                {invoice.billFromSnapshot.city}, {invoice.billFromSnapshot.state} - {invoice.billFromSnapshot.pincode}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Billed To (Customer)</h3>
              <p className="font-semibold text-slate-900">{invoice.billToSnapshot.name}</p>
              {invoice.billToSnapshot.gstin && (
                <p className="text-slate-600 font-mono mt-0.5">GSTIN: {invoice.billToSnapshot.gstin}</p>
              )}
              <p className="text-slate-600 mt-1">{invoice.billToSnapshot.addressLine}</p>
              <p className="text-slate-600">
                {invoice.billToSnapshot.city}, {invoice.billToSnapshot.state} - {invoice.billToSnapshot.pincode}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Item / Description</th>
                  <th className="px-4 py-3">HSN/SAC</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">GST %</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{item.hsnSacCode}</td>
                    <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right">₹{toRupees(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">{item.gstRate}%</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      ₹{toRupees(item.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Balance Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 w-full sm:w-72">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Taxable</span>
                <span className="font-semibold">₹{toRupees(invoice.totalTaxable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>CGST</span>
                <span className="font-semibold">₹{toRupees(invoice.totalCgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>SGST</span>
                <span className="font-semibold">₹{toRupees(invoice.totalSgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {invoice.totalIgst > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>IGST</span>
                  <span className="font-semibold">₹{toRupees(invoice.totalIgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5 w-full sm:w-80 shadow-md">
              <div className="flex justify-between items-center text-slate-300">
                <span>Subtotal</span>
                <span>₹{toRupees(invoice.subTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Grand Total</span>
                <span className="text-base font-bold text-white">
                  ₹{toRupees(invoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 border-t border-slate-800 pt-2">
                <span>Amount Paid</span>
                <span className="font-bold">₹{toRupees(invoice.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-amber-400 border-t border-slate-800 pt-2 text-sm">
                <span className="font-semibold">Balance Due</span>
                <span className="font-extrabold text-base">₹{toRupees(outstandingBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Loader2, ArrowLeftRight, CheckCircle2, Search, Eye, Printer, FileText } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface IRefundItem {
  _id: string;
  refundNumber: string;
  refundDate: string;
  customerSnapshot?: { displayName: string };
  amountPaise: number;
  refundMode?: string;
  referenceNumber?: string;
  reason: string;
  status: 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface ICustomer {
  _id: string;
  displayName: string;
  creditBalance: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function RefundsPage() {
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<IRefundItem[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // View Details Modal State
  const [selectedRefundForView, setSelectedRefundForView] = useState<IRefundItem | null>(null);

  // Process Refund Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    amountRupees: 1000,
    refundMode: 'Bank Transfer',
    referenceNumber: '',
    reason: 'Advance Credit Payout / Refund',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [refRes, custRes] = await Promise.all([
        fetch('/api/refunds'),
        fetch('/api/customers'),
      ]);
      const refData = await refRes.json();
      const custData = await custRes.json();

      if (refData.success) setRefunds(refData.refunds || []);
      if (custData.success) setCustomers(custData.customers || []);
    } catch (e) {
      console.error('Failed to load refunds', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert('Please select a customer.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund');

      setToast('Customer refund processed successfully!');
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRefunds = refunds.filter(
    (r) =>
      r.refundNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerSnapshot?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRefundedRupees = refunds.reduce((sum, r) => sum + toRupees(r.amountPaise), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      {toast && <Toast type="success" message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Refunds</h1>
          <p className="text-sm text-slate-500 mt-1">
            Processed cash & bank refunds returned to customers from advance credits or sales returns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-semibold text-xs shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Refund</span>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Refund Transactions</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{refunds.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Completed payouts</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Amount Refunded</span>
          <p className="text-xl font-extrabold text-purple-700 mt-1">
            ₹{totalRefundedRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-purple-600 font-medium mt-0.5 block">Customer payout log</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Ledger Reversal Status</span>
          <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Real-time Credit Ledger Sync
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Deducts from customer advance credit</span>
        </Card>
      </div>

      {/* Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Refund No, Customer..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              <span className="text-xs font-medium">Loading customer refunds...</span>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No refund transactions recorded yet. Click <strong>"Record Refund"</strong> to process an advance payout.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Refund No</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Mode & Reason</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Amount Refunded</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRefunds.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">{r.refundNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(r.refundDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{r.customerSnapshot?.displayName || 'Customer'}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{r.refundMode || 'Bank Transfer'}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{r.reason}</div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="success">Completed</Badge>
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-purple-700">
                      ₹{toRupees(r.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedRefundForView(r)}
                        className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        title="View Detailed Voucher"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detailed Refund Voucher Modal */}
      {selectedRefundForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-700" />
                <h3 className="font-bold text-slate-900 text-sm">Customer Refund Payout Voucher</h3>
              </div>
              <button onClick={() => setSelectedRefundForView(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Voucher Number</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{selectedRefundForView.refundNumber}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Payout Date</span>
                <span className="font-medium text-slate-900">{new Date(selectedRefundForView.refundDate).toLocaleDateString('en-IN')}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Customer</span>
                <span className="font-bold text-slate-900">{selectedRefundForView.customerSnapshot?.displayName || 'Customer'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Payout Method</span>
                <Badge variant="outline" className="font-semibold">{selectedRefundForView.refundMode || 'Bank Transfer'}</Badge>
              </div>

              {selectedRefundForView.referenceNumber && (
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500 font-semibold">Reference / UTR No</span>
                  <span className="font-mono text-slate-900 font-bold">{selectedRefundForView.referenceNumber}</span>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-semibold">Status</span>
                <Badge variant="success">Completed</Badge>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-1">Reason / Notes</span>
                <div className="p-2 bg-white border border-slate-200 rounded text-slate-800 text-[11px]">
                  {selectedRefundForView.reason}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-sm border-t border-slate-300">
                <span className="font-bold text-slate-900">Total Cash Refund Paid:</span>
                <span className="text-base font-extrabold text-purple-700">
                  ₹{toRupees(selectedRefundForView.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => window.print()} className="gap-1 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Print Voucher</span>
              </Button>
              <Button type="button" onClick={() => setSelectedRefundForView(null)} className="bg-slate-900 text-white text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Refund Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Process Customer Refund</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">Select Customer *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Refund Amount (₹) *</label>
                  <Input
                    type="number"
                    value={formData.amountRupees}
                    onChange={(e) => setFormData({ ...formData, amountRupees: Number(e.target.value) })}
                    required
                    min={1}
                    className="text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Payout Method *</label>
                  <select
                    value={formData.refundMode}
                    onChange={(e) => setFormData({ ...formData, refundMode: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cash">Cash Payout</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Transaction Ref No / Cheque No (Optional)</label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="e.g. UTR-98127391 / Cheque #00012"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Refund Reason *</label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="e.g. Sales return cash payout requested by customer"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-slate-900 text-white font-bold text-xs">
                  {submitting ? 'Processing...' : 'Confirm Refund Payout'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

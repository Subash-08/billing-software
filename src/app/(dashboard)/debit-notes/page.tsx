'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RefreshCw, Loader2, FileText, CheckCircle2, Search, TrendingUp } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface IDebitNote {
  _id: string;
  debitNoteNumber: string;
  debitNoteDate: string;
  customerSnapshot: { displayName: string; gstin?: string };
  reason: string;
  grandTotal?: number;
  totals?: { grandTotalPaise: number; totalTaxablePaise: number; totalTaxPaise: number };
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  createdAt: string;
}

interface ICustomer {
  _id: string;
  displayName: string;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function DebitNotesPage() {
  const [loading, setLoading] = useState(true);
  const [debitNotes, setDebitNotes] = useState<IDebitNote[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    reason: 'PRICE_DIFFERENCE' as const,
    reasonNotes: '',
    itemName: 'Price Escalation / Additional Charges',
    hsnSacCode: '9983',
    quantity: 1,
    unit: 'PCS',
    rateRupees: 1000,
    gstRate: 18,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dnRes, custRes] = await Promise.all([
        fetch('/api/debit-notes'),
        fetch('/api/customers'),
      ]);
      const dnData = await dnRes.json();
      const custData = await custRes.json();

      if (dnData.success) setDebitNotes(dnData.debitNotes || []);
      if (custData.success) setCustomers(custData.customers || []);
    } catch (e) {
      console.error('Failed to load debit notes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDebitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert('Please select a customer.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customerId: formData.customerId,
        reason: formData.reason,
        reasonNotes: formData.reasonNotes,
        items: [
          {
            name: formData.itemName,
            hsnSacCode: formData.hsnSacCode,
            quantity: Number(formData.quantity),
            unit: formData.unit,
            uqc: 'OTH',
            rate: Number(formData.rateRupees),
            gstRate: Number(formData.gstRate),
          },
        ],
      };

      const res = await fetch('/api/debit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create Debit Note');

      setToast('Debit Note created successfully!');
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNotes = debitNotes.filter(
    (dn) =>
      dn.debitNoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      dn.customerSnapshot?.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebitValue = debitNotes.reduce((sum, dn) => sum + toRupees(dn.grandTotal || dn.totals?.grandTotalPaise), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      {toast && <Toast type="success" message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Debit Notes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Issued debit adjustments, rate additions, and extra tax charges under GST Sec 34(3).
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
            <span>New Debit Note</span>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Debit Notes</span>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{debitNotes.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Issued document count</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Value Debited</span>
          <p className="text-xl font-extrabold text-blue-700 mt-1">
            ₹{totalDebitValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">Additional receivable</span>
        </Card>

        <Card className="border border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">GST Sec 34(3) Compliance</span>
          <p className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Active & Ledger Synced
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Increases customer balance due</span>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Debit Note No, Customer..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
              <span className="text-xs font-medium">Loading debit notes...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No debit notes found. Click <strong>"New Debit Note"</strong> to record price escalation or extra charges.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Debit Note No</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Debit Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredNotes.map((dn) => (
                  <tr key={dn._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">{dn.debitNoteNumber}</td>
                    <td className="px-4 py-4 text-slate-600">{new Date(dn.debitNoteDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{dn.customerSnapshot?.displayName || 'Customer'}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-[10px] uppercase">{dn.reason.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {dn.status === 'ISSUED' ? (
                        <Badge variant="success">Issued</Badge>
                      ) : dn.status === 'DRAFT' ? (
                        <Badge variant="warning">Draft</Badge>
                      ) : (
                        <Badge variant="destructive">Cancelled</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-blue-700">
                      ₹{toRupees(dn.grandTotal || dn.totals?.grandTotalPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Issue New Debit Note (GST Sec 34)</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateDebitNote} className="space-y-4">
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
                    <option key={c._id} value={c._id}>{c.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Reason *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                  >
                    <option value="PRICE_DIFFERENCE">Price Escalation / Difference</option>
                    <option value="ADDITIONAL_TAX">Additional Tax Adjustment</option>
                    <option value="OTHER_CHARGES">Freight / Other Charges</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">GST Tax Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">Item Description / Reason Details</label>
                <Input
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Debit Amount (₹) *</label>
                  <Input
                    type="number"
                    value={formData.rateRupees}
                    onChange={(e) => setFormData({ ...formData, rateRupees: Number(e.target.value) })}
                    required
                    min={1}
                    className="text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Remarks / Note</label>
                  <Input
                    value={formData.reasonNotes}
                    onChange={(e) => setFormData({ ...formData, reasonNotes: e.target.value })}
                    placeholder="Optional remarks"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-slate-900 text-white font-bold text-xs">
                  {submitting ? 'Creating...' : 'Issue Debit Note'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

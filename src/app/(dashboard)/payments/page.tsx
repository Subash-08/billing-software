'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, RefreshCw, AlertCircle, CheckCircle2, FileText, Info } from 'lucide-react';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';

interface PaymentItem {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaise: number;
  customerSnapshot: {
    displayName: string;
  };
  paymentModeSnapshot?: {
    code: string;
    name: string;
  };
  referenceNumber?: string;
  notes?: string;
  status: 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REVERSED';
  createdAt: string;
}

interface CustomerOption {
  _id: string;
  displayName: string;
}

interface PaymentModeOption {
  _id: string;
  code: string;
  name: string;
}

interface OutstandingInvoice {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  outstandingBalance: number;
  invoiceDate: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record Payment Modal State
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedModeId, setSelectedModeId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentReason, setPaymentReason] = useState('Advance / On-Account Payment');
  const [notes, setNotes] = useState('');
  const [onAccountOnly, setOnAccountOnly] = useState(false);

  // Outstanding Invoices for selected customer
  const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
  const [explicitAllocations, setExplicitAllocations] = useState<Record<string, string>>({});
  const [useExplicit, setUseExplicit] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      if (data.success) {
        setPayments(data.items || []);
      } else {
        setError(data.error || 'Failed to load payments');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const openModal = async () => {
    setShowModal(true);
    setFormError(null);
    try {
      const [custRes, modeRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payment-modes'),
      ]);
      const custData = await custRes.json();
      const modeData = await modeRes.json();

      if (custData.success) setCustomers(custData.customers || custData.items || custData.data || []);
      if (modeData.success) {
        const modes = modeData.data || [];
        setPaymentModes(modes);
        if (modes.length > 0) setSelectedModeId(modes[0]._id);
      }
    } catch (err) {
      console.error('Failed to load modal master data', err);
    }
  };

  // When selected customer changes, load their unpaid ISSUED invoices
  useEffect(() => {
    if (!selectedCustomerId) {
      setInvoices([]);
      return;
    }
    fetch(`/api/invoices?customerId=${selectedCustomerId}&status=ISSUED&paymentStatus=UNPAID`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const invList = data.invoices || data.items || [];
          setInvoices(invList);
          if (invList.length > 0) {
            setPaymentReason('Invoice Settlement');
          } else {
            setPaymentReason('Advance / On-Account Payment');
            setOnAccountOnly(true);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [selectedCustomerId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid positive payment amount');
      return;
    }

    if (!selectedCustomerId) {
      setFormError('Please select a customer');
      return;
    }

    if (!selectedModeId) {
      setFormError('Please select a payment mode');
      return;
    }

    setSubmitting(true);

    const amountPaise = rupeesToPaise(amt);
    const idempotencyKey = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const requestHash = `HASH-${amountPaise}-${selectedCustomerId}-${paymentDate}`;

    let allocationsPayload: Array<{ invoiceId: string; allocationAmountPaise: number }> = [];
    if (useExplicit) {
      allocationsPayload = Object.entries(explicitAllocations)
        .filter(([_, rupeesStr]) => parseFloat(rupeesStr) > 0)
        .map(([invoiceId, rupeesStr]) => ({
          invoiceId,
          allocationAmountPaise: rupeesToPaise(parseFloat(rupeesStr)),
        }));
    }

    const finalNotes = notes.trim()
      ? `${paymentReason}: ${notes.trim()}`
      : paymentReason;

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          paymentDate,
          amountPaise,
          paymentModeId: selectedModeId,
          referenceNumber: referenceNumber.trim() || undefined,
          idempotencyKey,
          requestHash,
          notes: finalNotes,
          onAccountOnly,
          allocations: allocationsPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        // Reset form
        setAmountRupees('');
        setSelectedCustomerId('');
        setReferenceNumber('');
        setNotes('');
        setPaymentReason('Advance / On-Account Payment');
        setExplicitAllocations({});
        fetchPayments();
      } else {
        setFormError(data.error || 'Failed to record payment');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments & Collections</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record financial payments, customer advances, and invoice settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-[#0f172a] hover:bg-slate-800 text-white gap-2 font-semibold text-xs" onClick={openModal}>
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Receipt No</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Payment Mode & Ref</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    No payment records found. Click &quot;Record Payment&quot; to add one.
                  </td>
                </tr>
              ) : (
                payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 font-mono">
                      {pay.receiptNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(pay.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {pay.customerSnapshot?.displayName || 'N/A'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {pay.paymentModeSnapshot?.name || 'Cash'}
                      </div>
                      {pay.referenceNumber ? (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          Ref: {pay.referenceNumber}
                        </div>
                      ) : pay.notes ? (
                        <div className="text-[11px] text-slate-500 font-normal truncate max-w-[220px] mt-0.5" title={pay.notes}>
                          {pay.notes}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Direct Payment</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {pay.status === 'COMPLETED' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : pay.status === 'PARTIALLY_REVERSED' ? (
                        <Badge variant="warning">Partially Reversed</Badge>
                      ) : (
                        <Badge variant="destructive">Reversed</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-emerald-700 text-xs">
                      ₹{paiseToRupees(pay.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/payments/${pay._id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100" title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Record Payment / Collection</h2>
                <p className="text-xs text-slate-300">Enter customer payment receipt details</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
                {/* Customer */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Customer *</label>
                  <select
                    className="w-full h-9 border border-slate-300 rounded-lg px-3 bg-white text-slate-900 font-medium focus:border-slate-800 focus:outline-none"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Amount Received (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="w-full h-9 border border-slate-300 rounded-lg px-3 text-slate-900 font-bold focus:border-slate-800 focus:outline-none"
                      placeholder="e.g. 5000.00"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      className="w-full h-9 border border-slate-300 rounded-lg px-3 text-slate-900 font-medium focus:border-slate-800 focus:outline-none"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Mode & Reference */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Payment Mode *</label>
                    <select
                      className="w-full h-9 border border-slate-300 rounded-lg px-3 bg-white text-slate-900 font-medium focus:border-slate-800 focus:outline-none"
                      value={selectedModeId}
                      onChange={(e) => setSelectedModeId(e.target.value)}
                      required
                    >
                      {paymentModes.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Ref No / Txn ID <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full h-9 border border-slate-300 rounded-lg px-3 text-slate-900 font-mono focus:border-slate-800 focus:outline-none"
                      placeholder="e.g. UTR-9812739 / Cheque #0012"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* Collection Reason / Purpose */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Collection Purpose / Payment Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-9 border border-slate-300 rounded-lg px-3 bg-white text-slate-900 font-medium focus:border-slate-800 focus:outline-none mb-1.5"
                    value={paymentReason}
                    onChange={(e) => setPaymentReason(e.target.value)}
                    required
                  >
                    <option value="Advance / On-Account Payment">Advance / On-Account Credit</option>
                    <option value="Invoice Settlement">Invoice Settlement</option>
                    <option value="Partial Payment">Partial Payment Settlement</option>
                    <option value="Security Deposit">Security Deposit</option>
                    <option value="Other Collection">Other Business Collection</option>
                  </select>
                </div>

                {/* On Account Checkbox */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="onAccountOnly"
                    checked={onAccountOnly}
                    onChange={(e) => setOnAccountOnly(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="onAccountOnly" className="font-semibold text-slate-800 cursor-pointer">
                    Keep as On-Account / Customer Credit (Do not auto-allocate to invoices)
                  </label>
                </div>

                {/* Invoice Allocation Section */}
                {!onAccountOnly && invoices.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Unpaid Invoices Allocation</span>
                      <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useExplicit}
                          onChange={(e) => setUseExplicit(e.target.checked)}
                        />
                        <span>Custom Allocation (Default: FIFO)</span>
                      </label>
                    </div>

                    {useExplicit ? (
                      <div className="space-y-2 pt-2">
                        {invoices.map((inv) => (
                          <div key={inv._id} className="flex items-center justify-between bg-white p-2.5 border rounded-lg shadow-2xs">
                            <div>
                              <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                              <p className="text-slate-500 text-[11px]">
                                Outstanding: ₹{paiseToRupees(inv.outstandingBalance).toFixed(2)}
                              </p>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="w-28 border border-slate-300 rounded-lg p-1.5 text-right font-bold text-slate-900"
                              value={explicitAllocations[inv._id] || ''}
                              onChange={(e) =>
                                setExplicitAllocations({
                                  ...explicitAllocations,
                                  [inv._id]: e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px] italic">
                        Payment will automatically settle unpaid invoices in FIFO order (oldest invoice first).
                      </p>
                    )}
                  </div>
                )}

                {/* Additional Notes / Reason details */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Notes / Remarks <span className="text-slate-400 font-normal">(Optional details)</span>
                  </label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-900 focus:border-slate-800 focus:outline-none"
                    rows={2}
                    placeholder="e.g. Received advance cash at counter for upcoming material delivery..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{submitting ? 'Recording...' : 'Confirm & Save Payment'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

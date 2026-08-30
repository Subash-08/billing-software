'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, AlertCircle, RotateCcw, CheckCircle, Printer } from 'lucide-react';
import { paiseToRupees, rupeesToPaise } from '@/lib/money';

interface AllocationDetail {
  allocationId: string;
  invoiceId: string;
  allocatedAmountPaise: number;
  reversedAmountPaise: number;
  activeAmountPaise: number;
  reversals: Array<{
    reversalId: string;
    reversedAmountPaise: number;
    reason: string;
    createdAt: string;
  }>;
}

interface PaymentDetailData {
  payment: {
    _id: string;
    receiptNumber: string;
    paymentDate: string;
    amountPaise: number;
    customerSnapshot: {
      displayName: string;
      phone: string;
      email?: string;
      gstin?: string;
      billingAddressLine: string;
      billingCity: string;
      billingState: string;
      billingStateCode: string;
      billingPincode?: string;
    };
    referenceNumber?: string;
    notes?: string;
    status: 'COMPLETED' | 'REVERSED' | 'PARTIALLY_REVERSED';
    createdAt: string;
  };
  allocations: AllocationDetail[];
}

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const paymentId = resolvedParams.id;

  const [data, setData] = useState<PaymentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reversal Modal
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationDetail | null>(null);
  const [reversalAmountRupees, setReversalAmountRupees] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  const fetchPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Payment not found');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  const openReversalModal = (alloc: AllocationDetail) => {
    setSelectedAllocation(alloc);
    setReversalAmountRupees(paiseToRupees(alloc.activeAmountPaise).toString());
    setReversalReason('');
    setReversalError(null);
    setShowReversalModal(true);
  };

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation || !data) return;

    setReversalError(null);
    const amt = parseFloat(reversalAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      setReversalError('Please enter a valid positive reversal amount');
      return;
    }

    const reversedAmountPaise = rupeesToPaise(amt);
    if (reversedAmountPaise > selectedAllocation.activeAmountPaise) {
      setReversalError(
        `Reversal amount cannot exceed active allocation of ₹${paiseToRupees(selectedAllocation.activeAmountPaise).toFixed(2)}`
      );
      return;
    }

    if (!reversalReason.trim()) {
      setReversalError('Please provide a reason for reversal');
      return;
    }

    setSubmittingReversal(true);

    const reversalIdempotencyKey = `REV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const reversalRequestHash = `HASH-REV-${reversedAmountPaise}-${selectedAllocation.allocationId}`;

    try {
      const res = await fetch(`/api/payments/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocationId: selectedAllocation.allocationId,
          reversedAmountPaise,
          reason: reversalReason,
          reversalIdempotencyKey,
          reversalRequestHash,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowReversalModal(false);
        fetchPayment();
      } else {
        setReversalError(json.error || 'Failed to reverse payment allocation');
      }
    } catch (err: unknown) {
      setReversalError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmittingReversal(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500">
        Loading receipt details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="text-red-600 font-semibold">{error || 'Payment not found'}</p>
        <Link href="/payments">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>
      </div>
    );
  }

  const { payment, allocations } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
            <ArrowLeft className="h-4 w-4" /> Back to Payments
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Printable Receipt Card */}
      <Card className="border border-slate-200 shadow-lg bg-white overflow-hidden">
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Badge className="bg-slate-800 text-teal-400 border-slate-700 mb-1">Payment Receipt</Badge>
            <h1 className="text-2xl font-bold font-mono">{payment.receiptNumber}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Date: {payment.paymentDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Amount Received</p>
            <p className="text-3xl font-extrabold text-emerald-400">
              ₹{paiseToRupees(payment.amountPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Customer & Payment Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Received From
              </h3>
              <p className="text-base font-bold text-slate-900">{payment.customerSnapshot.displayName}</p>
              <p className="text-xs text-slate-600 font-medium">
                {payment.customerSnapshot.billingAddressLine}, {payment.customerSnapshot.billingCity}
              </p>
              <p className="text-xs text-slate-600 font-medium">
                {payment.customerSnapshot.billingState} ({payment.customerSnapshot.billingStateCode}) -{' '}
                {payment.customerSnapshot.billingPincode}
              </p>
              {payment.customerSnapshot.gstin && (
                <p className="text-xs font-mono text-slate-500 mt-1">GSTIN: {payment.customerSnapshot.gstin}</p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Transaction Details
              </h3>
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Status:</span>{' '}
                <Badge
                  className={
                    payment.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : payment.status === 'PARTIALLY_REVERSED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }
                >
                  {payment.status}
                </Badge>
              </div>
              {payment.referenceNumber && (
                <p className="text-xs font-mono text-slate-600">
                  Ref No: <span className="font-bold text-slate-900">{payment.referenceNumber}</span>
                </p>
              )}
              {payment.notes && (
                <p className="text-xs text-slate-500 italic mt-2">Notes: {payment.notes}</p>
              )}
            </div>
          </div>

          {/* Invoice Allocations Ledger */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Settlement Ledger Allocations
            </h3>

            {allocations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                This payment was recorded as an on-account advance (no invoice allocations).
              </p>
            ) : (
              <table className="w-full text-left text-xs border border-slate-100 rounded">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b">
                  <tr>
                    <th className="px-4 py-2">Invoice ID</th>
                    <th className="px-4 py-2 text-right">Allocated (₹)</th>
                    <th className="px-4 py-2 text-right">Reversed (₹)</th>
                    <th className="px-4 py-2 text-right">Active (₹)</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((alloc) => (
                    <tr key={alloc.allocationId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        <Link href={`/invoices/${alloc.invoiceId}`} className="hover:underline text-teal-700">
                          {alloc.invoiceId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        ₹{paiseToRupees(alloc.allocatedAmountPaise).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600">
                        ₹{paiseToRupees(alloc.reversedAmountPaise).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        ₹{paiseToRupees(alloc.activeAmountPaise).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {alloc.activeAmountPaise > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => openReversalModal(alloc)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reverse</span>
                          </Button>
                        ) : (
                          <span className="text-slate-400 italic">Fully Reversed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reversal Modal */}
      {showReversalModal && selectedAllocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-bold text-slate-900">Reverse Allocation</h3>
              <button
                onClick={() => setShowReversalModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {reversalError && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{reversalError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteReversal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Active Allocation Max: ₹
                  {paiseToRupees(selectedAllocation.activeAmountPaise).toFixed(2)}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-300 rounded-md p-2 font-bold text-slate-900"
                  value={reversalAmountRupees}
                  onChange={(e) => setReversalAmountRupees(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Reversal *</label>
                <textarea
                  className="w-full border border-slate-300 rounded-md p-2 text-slate-900"
                  rows={3}
                  placeholder="State clear business/accounting reason for reversal..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setShowReversalModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReversal}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {submittingReversal ? 'Reversing...' : 'Execute Reversal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, DollarSign, CheckCircle2 } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface PaymentModeOption {
  _id: string;
  code: string;
  name: string;
  category: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: {
    _id: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    grandTotalPaise: number;
    outstandingBalancePaise: number;
  };
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  invoice,
}: RecordPaymentModalProps) {
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [selectedModeId, setSelectedModeId] = useState('');
  
  // Single authoritative conversion from paise to rupees
  const grandTotalRupees = invoice.grandTotalPaise / 100;
  const outstandingBalanceRupees = invoice.outstandingBalancePaise / 100;

  const [amountRupees, setAmountRupees] = useState<number>(outstandingBalanceRupees);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastError, setToastError] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setAmountRupees(invoice.outstandingBalancePaise / 100);
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber('');
      setNotes('');
      setToastError(null);

      // Fetch payment modes
      fetch('/api/payment-modes')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setPaymentModes(json.data);
            setSelectedModeId(json.data[0]._id);
          }
        })
        .catch((err) => console.error('Failed to load payment modes', err));
    }
  }, [isOpen, invoice]);

  if (!isOpen) return null;

  const remainingBalanceRupees = Math.max(0, outstandingBalanceRupees - (amountRupees || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastError(null);

    if (!selectedModeId) {
      setToastError('Please select a payment mode.');
      return;
    }

    if (!amountRupees || amountRupees <= 0) {
      setToastError('Payment amount must be greater than zero.');
      return;
    }

    if (amountRupees > outstandingBalanceRupees + 0.01) {
      setToastError(
        `Payment amount (₹${amountRupees.toLocaleString('en-IN')}) cannot exceed remaining outstanding balance (₹${outstandingBalanceRupees.toLocaleString('en-IN')}).`
      );
      return;
    }

    setSubmitting(true);

    try {
      const amountPaise = Math.round(amountRupees * 100);
      const idempotencyKey = `idemp-pay-${invoice._id}-${Date.now()}`;
      const requestHash = `hash-${idempotencyKey}`;

      const payload = {
        customerId: invoice.customerId,
        paymentDate,
        amountPaise,
        paymentModeId: selectedModeId,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey,
        requestHash,
        allocations: [
          {
            invoiceId: invoice._id,
            allocationAmountPaise: amountPaise,
          },
        ],
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setToastError(json.error || json.details || 'Failed to record payment');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setToastError(err.message || 'An error occurred while recording payment.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
      {toastError && (
        <Toast type="error" message={toastError} onClose={() => setToastError(null)} />
      )}

      <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-900 text-white px-6 py-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">
                Record Payment for {invoice.invoiceNumber}
              </CardTitle>
              <p className="text-xs text-slate-300">
                Customer: <span className="font-medium text-white">{invoice.customerName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-5 text-xs text-slate-700">
            {/* Balance Overview Card */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Invoice Total</span>
                <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                  ₹{grandTotalRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-x border-slate-200 px-2">
                <span className="text-[11px] text-slate-500 font-medium block">Outstanding</span>
                <span className="text-xs font-bold text-amber-700 mt-0.5 block">
                  ₹{outstandingBalanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">New Balance</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                  ₹{remainingBalanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedModeId}
                onChange={(e) => setSelectedModeId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:border-slate-800 focus:outline-none"
                required
              >
                {paymentModes.map((mode) => (
                  <option key={mode._id} value={mode._id}>
                    {mode.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={outstandingBalanceRupees}
                  value={amountRupees || ''}
                  onChange={(e) => setAmountRupees(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-9 text-xs font-bold text-slate-900"
                  required
                />
                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setAmountRupees(outstandingBalanceRupees)}
                    className="text-[10px] text-blue-600 hover:underline font-medium"
                  >
                    Pay Full (₹{outstandingBalanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Reference / Transaction No. <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UTR / UPR-123456 / Cheque #00012"
                className="h-9 text-xs"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid via PhonePe QR code"
                className="h-9 text-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
                disabled={submitting}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submitting ? 'Recording...' : 'Confirm & Collect Payment'}</span>
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

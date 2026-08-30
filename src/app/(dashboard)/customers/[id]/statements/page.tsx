'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer, Loader2, FileText } from 'lucide-react';
import { paiseToRupees } from '@/lib/money';

interface StatementSummary {
  totalInvoicedPaise: number;
  totalPaidPaise: number;
  totalOutstandingPaise: number;
  creditBalancePaise: number;
}

interface StatementInvoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
  status: string;
}

interface StatementPayment {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaise: number;
}

interface StatementData {
  summary: StatementSummary;
  invoices: StatementInvoice[];
  payments: StatementPayment[];
}

export default function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatementData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatement() {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${id}/statement`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load statement');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    }
    loadStatement();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading Account Statement...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm font-medium">
          {error || 'Statement data unavailable'}
        </div>
        <Link href={`/customers/${id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Customer Profile</span>
          </Button>
        </Link>
      </div>
    );
  }

  const { summary, invoices, payments } = data;

  // Build combined chronological statement entries
  const entries: Array<{
    date: string;
    description: string;
    debitPaise: number;
    creditPaise: number;
    type: 'INVOICE' | 'PAYMENT';
  }> = [];

  for (const inv of invoices) {
    entries.push({
      date: inv.invoiceDate,
      description: `Tax Invoice ${inv.invoiceNumber}`,
      debitPaise: inv.grandTotal,
      creditPaise: 0,
      type: 'INVOICE',
    });
  }

  for (const p of payments) {
    entries.push({
      date: p.paymentDate,
      description: `Payment Receipt ${p.receiptNumber}`,
      debitPaise: 0,
      creditPaise: p.amountPaise,
      type: 'PAYMENT',
    });
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let runningBalance = 0;
  const entriesWithBalance = entries.map((entry) => {
    runningBalance += entry.debitPaise - entry.creditPaise;
    return { ...entry, runningBalance };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/customers/${id}`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Customer Account Statement</h1>
            <p className="text-xs text-slate-500 mt-0.5">Authoritative statement of invoices and payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-6 space-y-6 text-xs">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">Total Invoiced</span>
              <span className="font-bold text-slate-900 text-sm">₹{paiseToRupees(summary.totalInvoicedPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Paid</span>
              <span className="font-bold text-emerald-600 text-sm">₹{paiseToRupees(summary.totalPaidPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Outstanding Due</span>
              <span className="font-bold text-amber-600 text-sm">₹{paiseToRupees(summary.totalOutstandingPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Available Credit</span>
              <span className="font-bold text-blue-600 text-sm">₹{paiseToRupees(summary.creditBalancePaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Statement Table */}
          {entriesWithBalance.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <FileText className="h-8 w-8 mx-auto text-slate-400" />
              <p className="font-medium text-xs">No transactions recorded for this customer yet.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Transaction Details</th>
                  <th className="p-3 text-right">Debit (₹)</th>
                  <th className="p-3 text-right">Credit (₹)</th>
                  <th className="p-3 text-right">Running Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {entriesWithBalance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {item.debitPaise > 0 ? `₹${paiseToRupees(item.debitPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">
                      {item.creditPaise > 0 ? `₹${paiseToRupees(item.creditPaise).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800">
                      ₹{paiseToRupees(item.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

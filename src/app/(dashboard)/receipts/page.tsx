'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Printer, Loader2 } from 'lucide-react';

interface PaymentReceiptItem {
  _id: string;
  receiptNumber: string;
  paymentDate: string;
  customerSnapshot: { displayName: string };
  paymentModeSnapshot: { name: string };
  amountPaise: number;
  status: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<PaymentReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipts() {
      try {
        const res = await fetch('/api/payments');
        const json = await res.json();
        if (json.success) {
          setReceipts(json.items || []);
        }
      } catch (err) {
        console.error('Failed to load receipts', err);
      } finally {
        setLoading(false);
      }
    }
    loadReceipts();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Payment Receipts</h1>
        <p className="text-xs text-slate-500 mt-0.5">Generated customer collection receipt vouchers and payment history.</p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading collection receipts...</span>
            </div>
          ) : receipts.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">No payment receipts recorded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Receipt Voucher No</th>
                  <th className="px-6 py-3">Receipt Date</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3 text-right">Amount Received</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {receipts.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{rec.receiptNumber}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(rec.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-slate-900">{rec.customerSnapshot?.displayName || 'N/A'}</td>
                    <td className="px-6 py-4">{rec.paymentModeSnapshot?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      ₹{((rec.amountPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/payments/${rec._id}`}>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Receipt</span>
                        </Button>
                      </Link>
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

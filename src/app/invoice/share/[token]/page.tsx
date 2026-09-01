'use client';

import React, { useEffect, useState, use } from 'react';

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function PublicSharedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invoices/public/${resolvedParams.token}`);
        const json = await res.json();
        if (json.success) {
          setInvoice(json.data);
        } else {
          setError(json.error || 'Failed to load invoice');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading invoice');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [resolvedParams.token]);

  if (loading) return <div className="p-12 text-center text-sm text-gray-500">Loading invoice...</div>;
  if (error || !invoice) return <div className="p-12 text-center text-sm text-red-500">{error || 'Invoice not found'}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">TAX INVOICE</h1>
            <p className="text-xs text-slate-300">Invoice #{invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
          >
            Print / Save PDF
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-gray-700">
          {/* Bill From / Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Billed By</span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{invoice.billFromSnapshot?.name}</p>
              {invoice.billFromSnapshot?.gstin && <p className="font-mono text-gray-600">GSTIN: {invoice.billFromSnapshot.gstin}</p>}
              <p>{invoice.billFromSnapshot?.addressLine}</p>
              <p>{invoice.billFromSnapshot?.city}, {invoice.billFromSnapshot?.state} - {invoice.billFromSnapshot?.pincode}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Billed To</span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">{invoice.billToSnapshot?.name}</p>
              {invoice.billToSnapshot?.gstin && <p className="font-mono text-gray-600">GSTIN: {invoice.billToSnapshot.gstin}</p>}
              <p>{invoice.billToSnapshot?.addressLine}</p>
              <p>{invoice.billToSnapshot?.city}, {invoice.billToSnapshot?.state} - {invoice.billToSnapshot?.pincode}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-left border border-gray-200">
            <thead className="bg-gray-50 font-bold border-b border-gray-200 text-gray-600">
              <tr>
                <th className="p-2 border-r">#</th>
                <th className="p-2 border-r">Item</th>
                <th className="p-2 border-r">HSN/SAC</th>
                <th className="p-2 border-r text-right">Qty</th>
                <th className="p-2 border-r text-right">Rate</th>
                <th className="p-2 border-r text-right">GST%</th>
                <th className="p-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items?.map((it: any, i: number) => (
                <tr key={i}>
                  <td className="p-2 border-r text-gray-400">{i + 1}</td>
                  <td className="p-2 border-r font-medium text-gray-900">{it.name}</td>
                  <td className="p-2 border-r font-mono text-center">{it.hsnSacCode || it.hsnCode || it.sacCode || '—'}</td>
                  <td className="p-2 border-r text-right">{it.quantity} {it.unit}</td>
                  <td className="p-2 border-r text-right">₹{toRupees(it.rate || it.enteredRatePaise).toFixed(2)}</td>
                  <td className="p-2 border-r text-right">{it.gstRate}%</td>
                  <td className="p-2 text-right font-bold text-gray-900">₹{toRupees(it.totalAmount || it.totalAmountPaise).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex justify-between">
                <span>Taxable Amount</span>
                <span>₹{toRupees(invoice.totalTaxable).toFixed(2)}</span>
              </div>
              {invoice.totalCgst > 0 && <div className="flex justify-between"><span>CGST</span><span>₹{toRupees(invoice.totalCgst).toFixed(2)}</span></div>}
              {invoice.totalSgst > 0 && <div className="flex justify-between"><span>SGST</span><span>₹{toRupees(invoice.totalSgst).toFixed(2)}</span></div>}
              {invoice.totalIgst > 0 && <div className="flex justify-between"><span>IGST</span><span>₹{toRupees(invoice.totalIgst).toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold border-t border-gray-300 pt-1 text-sm text-gray-900">
                <span>Grand Total</span>
                <span>₹{toRupees(invoice.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Loader2, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';

interface IPurchase {
  _id: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  supplierId: string | { _id: string; name: string };
  supplierName?: string;
  grandTotalPaise: number;
  paidAmountPaise?: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch purchases');

      setPurchases(data.purchases || data.items || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 20) || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPurchases(); }, [search, page]);

  const getPaymentBadge = (status?: string) => {
    switch (status) {
      case 'PAID': return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 uppercase">Paid</span>;
      case 'PARTIALLY_PAID': return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700 uppercase">Partial</span>;
      default: return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 uppercase">Unpaid</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Purchase Invoices</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Track purchases from suppliers. Stock increases automatically on confirmation.</p>
        </div>
        <Link
          href="/purchases/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Purchase
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by supplier, invoice number..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPurchases} className="text-red-600 underline text-xs">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && purchases.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-xl">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-600 mb-1">No purchase invoices yet</h3>
          <p className="text-sm text-gray-400 mb-6">Record your first purchase to track stock inward and supplier payables.</p>
          <Link href="/purchases/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Record Purchase
          </Link>
        </div>
      )}

      {/* List */}
      {!loading && purchases.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Grand Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.map(p => {
                    const supplierName = typeof p.supplierId === 'object' ? p.supplierId.name : (p.supplierName || '—');
                    const grandTotal = p.grandTotalPaise || 0;
                    const paidAmount = p.paidAmountPaise || 0;
                    return (
                      <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {p.supplierInvoiceNumber || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplierName}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 tabular-nums">
                          ₹{paiseToRupees(grandTotal)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 tabular-nums">
                          ₹{paiseToRupees(paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getPaymentBadge(p.paymentStatus)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/purchases/${p._id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{total} purchase{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

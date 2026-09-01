'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Loader2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';

interface IDeliveryChallan {
  _id: string;
  challanNumber?: string;
  challanDate: string;
  customerId: string | { _id: string; name?: string; displayName?: string };
  customerName?: string;
  salesOrderId?: string | { orderNumber?: string };
  reason: string;
  status: 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  DISPATCHED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const REASON_LABELS: Record<string, string> = {
  SUPPLY: 'Supply',
  JOB_WORK: 'Job Work',
  APPROVAL: 'For Approval',
  REPAIR: 'Repair',
  RETURN: 'Return',
  OTHER: 'Other',
};

export default function DeliveryChallansPage() {
  const [challans, setChallans] = useState<IDeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchChallans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/delivery-challans?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery challans');

      setChallans(data.challans || data.deliveryChallans || data.items || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 20) || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery challans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallans(); }, [search, statusFilter, page]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Delivery Challans</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Track goods dispatched for supply, job work, approval, or repair.</p>
        </div>
        <Link
          href="/delivery-challans/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Delivery Challan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by challan number, customer..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchChallans} className="text-red-600 underline text-xs">Retry</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && !error && challans.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-xl">
          <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-600 mb-1">No delivery challans found</h3>
          <p className="text-sm text-gray-400 mb-6">Create delivery challans to track goods dispatched before invoicing.</p>
          <Link href="/delivery-challans/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> New Delivery Challan
          </Link>
        </div>
      )}

      {!loading && challans.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Challan #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Order</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {challans.map(c => {
                    const customerName = typeof c.customerId === 'object' ? (c.customerId.displayName || c.customerId.name) : (c.customerName || '—');
                    const soRef = typeof c.salesOrderId === 'object' ? c.salesOrderId?.orderNumber : (c.salesOrderId ? `SO-${String(c.salesOrderId).slice(-6).toUpperCase()}` : null);
                    return (
                      <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">
                          {c.challanNumber || `DC-${c._id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(c.challanDate || c.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {REASON_LABELS[c.reason] || c.reason}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          {soRef ? <Link href={`/sales-orders/${typeof c.salesOrderId === 'string' ? c.salesOrderId : ''}`} className="hover:underline">{soRef}</Link> : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/delivery-challans/${c._id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
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
              <p className="text-xs text-gray-500">{total} challan{total !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

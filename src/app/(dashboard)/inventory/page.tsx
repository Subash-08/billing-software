'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, Package, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface IInventoryProduct {
  _id: string;
  name: string;
  code?: string;
  hsnCode?: string;
  unit: string;
  sellingPrice: number;
  stockQuantity: number;
  reorderLevel?: number;
  trackInventory?: boolean;
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRupees(rupees: number): string {
  return rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const [products, setProducts] = useState<IInventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === 'low') params.set('lowStock', 'true');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch inventory');

      setProducts(data.products || []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); }, [filter]);

  const filtered = products.filter(p => {
    if (!p.trackInventory) return false;
    if (filter === 'out') return p.stockQuantity <= 0;
    if (filter === 'low') return p.stockQuantity > 0 && p.reorderLevel != null && p.stockQuantity <= p.reorderLevel;
    if (search) return p.name.toLowerCase().includes(search.toLowerCase()) || (p.code || '').toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalStockValue = products.reduce((sum, p) => {
    if (!p.trackInventory) return sum;
    const price = p.sellingPrice > 1000 ? p.sellingPrice / 100 : p.sellingPrice;
    return sum + (p.stockQuantity * price);
  }, 0);

  const lowStockCount = products.filter(p => p.trackInventory && p.reorderLevel != null && p.stockQuantity > 0 && p.stockQuantity <= p.reorderLevel).length;
  const outOfStockCount = products.filter(p => p.trackInventory && p.stockQuantity <= 0).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Inventory</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Real-time stock levels driven by purchases, sales, and adjustments.</p>
        </div>
        <button onClick={fetchInventory} className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Tracked Products</p>
          <p className="text-2xl font-bold text-gray-900">{products.filter(p => p.trackInventory).length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Selling Value</p>
          <p className="text-2xl font-bold text-gray-900">₹{formatRupees(totalStockValue)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 cursor-pointer" onClick={() => { setFilter('low'); setSearch(''); }}>
          <p className="text-xs text-orange-600 mb-1">Low Stock</p>
          <p className="text-2xl font-bold text-orange-700">{lowStockCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer" onClick={() => { setFilter('out'); setSearch(''); }}>
          <p className="text-xs text-red-600 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={e => { setSearch(e.target.value); setFilter('all'); setPage(1); }}
            className="w-full pl-10 pr-4 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'low', 'out'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSearch(''); setPage(1); }}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchInventory} className="text-red-600 underline text-xs">Retry</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && !error && paginated.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-xl">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-600 mb-1">No inventory data</h3>
          <p className="text-sm text-gray-400 mb-6">
            {filter === 'low' ? 'No products are currently below reorder level.' :
             filter === 'out' ? 'No products are currently out of stock.' :
             'Add products with inventory tracking enabled to see stock levels here.'}
          </p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-sm text-blue-600 hover:underline">View all inventory</button>
          )}
        </div>
      )}

      {!loading && paginated.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU / HSN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Selling Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reorder Level</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map(p => {
                    const sellingPrice = p.sellingPrice > 1000 ? p.sellingPrice / 100 : p.sellingPrice;
                    const value = p.stockQuantity * sellingPrice;
                    const isOut = p.stockQuantity <= 0;
                    const isLow = !isOut && p.reorderLevel != null && p.stockQuantity <= p.reorderLevel;
                    return (
                      <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${isOut ? 'bg-red-50/30' : isLow ? 'bg-orange-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {(isLow || isOut) && <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 ${isOut ? 'text-red-500' : 'text-orange-500'}`} />}
                            <span className="font-medium text-gray-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {p.code && <div className="text-xs font-mono text-gray-700">{p.code}</div>}
                            {p.hsnCode && <div className="text-xs text-gray-500">HSN: {p.hsnCode}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{p.unit}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">₹{formatRupees(sellingPrice)}</td>
                        <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                          {p.stockQuantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">
                          {p.reorderLevel ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 uppercase">Out of Stock</span>
                          ) : isLow ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 uppercase">Low Stock</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 uppercase">OK</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-800">
                          ₹{formatRupees(value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/products/${p._id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                            View
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
              <p className="text-xs text-gray-500">{filtered.length} tracked product{filtered.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Note about services */}
      <p className="text-xs text-gray-400 text-center">
        Services are not shown here — only physical goods with inventory tracking are included.
      </p>
    </div>
  );
}

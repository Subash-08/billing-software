'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye, Edit, Loader2, Package, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface IProduct {
  _id: string;
  name: string;
  code?: string;
  hsnCode: string;
  unit: string;
  uqc: string;
  sellingPrice: number;
  purchasePrice?: number;
  defaultGstRate: number;
  taxTreatment: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function ProductsListPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [taxFilter, setTaxFilter] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (taxFilter) params.set('taxTreatment', taxFilter);
      params.set('page', page.toString());
      params.set('limit', '10');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch products');

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / 10) || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, statusFilter, taxFilter, page]);

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate product '${name}'?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate product');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Products Catalog</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Physical goods master catalog with HSN codes & default GST rates.</p>
        </div>
        <Link href="/products/new">
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 gap-1.5 rounded">
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-md border border-[#E5E7EB] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by product name, SKU, HSN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs border-[#E5E7EB] bg-[#F9FAFB]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ACTIVE">Status: Active</option>
            <option value="INACTIVE">Status: Inactive</option>
            <option value="">All Statuses</option>
          </select>

          <select
            value={taxFilter}
            onChange={(e) => {
              setTaxFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="">All Tax Treatments</option>
            <option value="TAXABLE">Taxable</option>
            <option value="EXEMPT">Exempt</option>
            <option value="NIL_RATED">Nil Rated</option>
            <option value="NON_GST">Non-GST</option>
          </select>
        </div>
      </div>

      {/* Products Table Card */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium">Loading products...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-[#DC2626] font-medium">{error}</div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Package className="w-8 h-8 text-[#9CA3AF] mx-auto" />
              <p className="text-xs font-semibold text-[#1F2937]">No products found</p>
              <p className="text-[11px] text-[#6B7280]">Add physical items to your catalog to get started.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">HSN Code</th>
                    <th className="px-4 py-3">Unit / UQC</th>
                    <th className="px-4 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Default GST %</th>
                    <th className="px-4 py-3">Tax Treatment</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                  {products.map((prod) => (
                    <tr key={prod._id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1F2937]">{prod.name}</td>
                      <td className="px-4 py-3 font-mono text-[#6B7280]">{prod.code || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[#1F2937]">{prod.hsnCode}</td>
                      <td className="px-4 py-3 font-medium text-[#4B5563]">
                        {prod.unit} ({prod.uqc})
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#1F2937] tabular-nums">
                        ₹{prod.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#2563EB] tabular-nums">
                        {prod.defaultGstRate}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                          {prod.taxTreatment}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            prod.status === 'ACTIVE'
                              ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                              : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link href={`/products/${prod._id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#6B7280] hover:text-[#1F2937]" title="View Product">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/products/${prod._id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#2563EB] hover:bg-[#EFF6FF]" title="Edit Product">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {prod.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeactivate(prod._id, prod.name)}
                              className="h-7 w-7 text-[#DC2626] hover:bg-[#FEF2F2]"
                              title="Deactivate Product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between text-xs text-[#6B7280]">
                <span>Showing {products.length} of {total} products</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2 text-xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>
                  <span className="font-semibold text-[#1F2937]">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2 text-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

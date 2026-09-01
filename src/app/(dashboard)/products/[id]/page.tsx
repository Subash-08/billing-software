'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, Package, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

interface IProductDetail {
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
  isPriceInclusiveOfGst: boolean;
  categoryId?: string;
  description?: string;
  stockQuantity: number;
  reorderLevel?: number;
  trackInventory: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface IStockMovement {
  _id: string;
  type: string;
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  referenceType: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  OPENING: 'Opening Stock',
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  SALE_RETURN: 'Sales Return',
  ADJUSTMENT_IN: 'Adjustment In',
  ADJUSTMENT_OUT: 'Adjustment Out',
  DAMAGE: 'Damage',
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<IProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Stock ledger state
  const [ledger, setLedger] = useState<IStockMovement[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  // Stock adjustment dialog state
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjType, setAdjType] = useState<'OPENING' | 'PURCHASE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE'>('OPENING');
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  const loadProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch product details');
      setProduct(data.product);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    if (!id) return;
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/products/${id}/stock?limit=20`);
      const data = await res.json();
      if (res.ok) {
        setLedger(data.items || []);
        setLedgerTotal(data.total || 0);
      }
    } catch {
      // ledger load failure is non-critical
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    loadLedger();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          code: product.code ? product.code.toUpperCase() : undefined,
          hsnCode: product.hsnCode,
          unit: product.unit,
          uqc: product.uqc,
          sellingPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          defaultGstRate: product.defaultGstRate,
          isPriceInclusiveOfGst: product.isPriceInclusiveOfGst,
          taxTreatment: product.taxTreatment,
          description: product.description,
          status: product.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');
      setProduct(data.product);
      setSuccess('Product updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError(null);
    const qty = parseFloat(adjQty);
    if (!qty || qty <= 0) {
      setAdjError('Quantity must be greater than zero');
      return;
    }
    setAdjSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: adjType, quantity: qty, notes: adjNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record adjustment');
      setShowAdjustment(false);
      setAdjQty('');
      setAdjNotes('');
      setSuccess('Stock adjusted successfully!');
      // Reload product (updated stockQuantity) and ledger
      await Promise.all([loadProduct(), loadLedger()]);
    } catch (err: any) {
      setAdjError(err.message);
    } finally {
      setAdjSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading product profile...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-16 text-center text-xs space-y-3">
        <p className="text-[#DC2626] font-medium">{error || 'Product not found'}</p>
        <Link href="/products" className="text-[#2563EB] font-medium hover:underline inline-block">
          ← Return to Product Catalog
        </Link>
      </div>
    );
  }

  const isLowStock = product.trackInventory && product.reorderLevel != null && product.stockQuantity <= product.reorderLevel && product.stockQuantity > 0;
  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div className="flex items-center space-x-3">
          <Link href="/products">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">{product.name}</h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                product.status === 'ACTIVE'
                  ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                  : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
              }`}>
                {product.status}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {product.code ? `SKU: ${product.code} • ` : ''}HSN: {product.hsnCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {product.trackInventory && (
            <Button
              type="button"
              onClick={() => setShowAdjustment(true)}
              variant="outline"
              className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" /> Adjust Stock
            </Button>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-xs font-semibold text-[#166534]">
          {success}
        </div>
      )}

      {/* Stock Summary Card */}
      {product.trackInventory && (
        <div className={`rounded-xl border p-4 flex items-start gap-4 ${
          isOutOfStock ? 'bg-red-50 border-red-200' :
          isLowStock ? 'bg-orange-50 border-orange-200' :
          'bg-green-50 border-green-200'
        }`}>
          {isOutOfStock ? <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /> :
           isLowStock ? <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" /> :
           <Package className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-700'}`}>
                {product.stockQuantity}
              </span>
              <span className="text-sm text-gray-500">{product.unit} in stock</span>
              {product.reorderLevel != null && (
                <span className="text-[10px] text-gray-400">Reorder at: {product.reorderLevel}</span>
              )}
            </div>
            <p className={`text-[11px] font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-700'}`}>
              {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK — REORDER RECOMMENDED' : 'IN STOCK'}
            </p>
          </div>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleUpdate} className="space-y-6">
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              Product Master Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">Product Name</label>
                <Input
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  required
                  className="bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">SKU Code</label>
                <Input
                  value={product.code || ''}
                  onChange={(e) => setProduct({ ...product, code: e.target.value })}
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">HSN Goods Code</label>
                <Input
                  value={product.hsnCode}
                  onChange={(e) => setProduct({ ...product, hsnCode: e.target.value })}
                  required
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Selling Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={product.sellingPrice}
                  onChange={(e) => setProduct({ ...product, sellingPrice: parseFloat(e.target.value) || 0 })}
                  required
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Purchase Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={product.purchasePrice || ''}
                  onChange={(e) => setProduct({ ...product, purchasePrice: parseFloat(e.target.value) || undefined })}
                  className="bg-white font-mono text-xs"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Default GST Rate %</label>
                <select
                  value={product.defaultGstRate}
                  onChange={(e) => setProduct({ ...product, defaultGstRate: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Price Inclusive of GST?</label>
                <select
                  value={product.isPriceInclusiveOfGst ? 'true' : 'false'}
                  onChange={(e) => setProduct({ ...product, isPriceInclusiveOfGst: e.target.value === 'true' })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="false">Exclusive (GST added on top)</option>
                  <option value="true">Inclusive (GST included in price)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Status</label>
                <select
                  value={product.status}
                  onChange={(e) => setProduct({ ...product, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive (Soft Deactivated)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Link href="/products">
            <Button type="button" variant="outline" className="text-xs bg-white">
              Back to Catalog
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white text-xs font-semibold px-6 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </form>

      {/* Stock Ledger */}
      {product.trackInventory && (
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              Stock Ledger {ledgerTotal > 0 && <span className="text-gray-400 ml-1 font-normal">({ledgerTotal} entries)</span>}
            </CardTitle>
            <button onClick={() => { loadProduct(); loadLedger(); }} className="text-gray-400 hover:text-gray-600">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger...
              </div>
            ) : ledger.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-gray-400">No stock movements recorded yet.</p>
                <p className="text-[10px] text-gray-400 mt-1">Use "Adjust Stock" to record opening stock or adjustments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Qty Change</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">Before</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-500 uppercase tracking-wider">After</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.map(m => {
                      const isIn = ['OPENING', 'PURCHASE', 'SALE_RETURN', 'ADJUSTMENT_IN'].includes(m.type);
                      return (
                        <tr key={m._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isIn ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {MOVEMENT_LABELS[m.type] || m.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 font-mono">
                            {m.referenceNumber || m.referenceType}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                            {isIn ? '+' : '-'}{m.quantity} {m.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{m.previousStock}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">{m.newStock}</td>
                          <td className="px-4 py-2.5 text-gray-400 max-w-[150px] truncate">{m.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Adjust Stock — {product.name}</h2>
              <button onClick={() => setShowAdjustment(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
            <form onSubmit={handleStockAdjustment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={e => setAdjType(e.target.value as typeof adjType)}
                  className="w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="OPENING">Opening Stock (initial balance)</option>
                  <option value="ADJUSTMENT_IN">Adjustment In (found stock, correction)</option>
                  <option value="ADJUSTMENT_OUT">Adjustment Out (correction, write-off)</option>
                  <option value="DAMAGE">Damage (destroyed / spoiled)</option>
                  <option value="PURCHASE">Purchase (direct stock receipt)</option>
                </select>
                <p className="mt-1 text-[10px] text-gray-400">
                  {adjType === 'OPENING' && 'Sets the initial stock balance. Creates an OPENING stock movement.'}
                  {adjType === 'ADJUSTMENT_IN' && 'Increases stock. Use for corrections or found inventory.'}
                  {adjType === 'ADJUSTMENT_OUT' && 'Decreases stock. Use for corrections or write-offs.'}
                  {adjType === 'DAMAGE' && 'Decreases stock. Records goods lost to damage or spoilage.'}
                  {adjType === 'PURCHASE' && 'Increases stock. Use only if a purchase is not tracked through Purchase Invoices.'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Quantity ({product.unit})
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={adjQty}
                  onChange={e => setAdjQty(e.target.value)}
                  required
                  placeholder="e.g. 10"
                  className="text-xs"
                />
                <p className="mt-1 text-[10px] text-gray-400">Current stock: <strong>{product.stockQuantity} {product.unit}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for adjustment..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {adjError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{adjError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAdjustment(false)} className="text-xs">Cancel</Button>
                <Button type="submit" disabled={adjSubmitting} className="bg-blue-600 text-white text-xs px-6">
                  {adjSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Record Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

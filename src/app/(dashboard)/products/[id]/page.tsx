'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, Trash2, Package } from 'lucide-react';

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
  categoryId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<IProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    loadProduct();
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
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  product.status === 'ACTIVE'
                    ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                    : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                }`}
              >
                {product.status}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {product.code ? `SKU: ${product.code} • ` : ''}HSN: {product.hsnCode}
            </p>
          </div>
        </div>

        <Link href={`/products/${product._id}/edit`}>
          <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-3 py-2 gap-1.5 rounded">
            <span>Edit Product</span>
          </Button>
        </Link>
      </div>

      {success && (
        <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-xs font-semibold text-[#166534]">
          {success}
        </div>
      )}

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
    </div>
  );
}

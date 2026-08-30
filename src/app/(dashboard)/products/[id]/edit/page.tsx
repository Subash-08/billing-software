'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    hsnCode: '',
    unit: 'NOS',
    sellingPrice: 0,
    purchasePrice: 0,
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch product');

        const p = data.product;
        setFormData({
          name: p.name || '',
          code: p.code || '',
          hsnCode: p.hsnCode || '',
          unit: p.unit || 'NOS',
          sellingPrice: p.sellingPrice || 0,
          purchasePrice: p.purchasePrice || 0,
          defaultGstRate: p.defaultGstRate ?? 18,
          taxTreatment: p.taxTreatment || 'TAXABLE',
          status: p.status || 'ACTIVE',
          description: p.description || '',
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'sellingPrice' || name === 'purchasePrice' || name === 'defaultGstRate'
        ? parseFloat(value) || 0
        : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.details || data.error || 'Failed to update product');
        return;
      }

      router.push(`/products/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs font-medium">Loading product item...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link href={`/products/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Edit Product Master</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Update catalog item name, HSN code, price, and default GST rate.</p>
        </div>
      </div>

      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Product Master Specification</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="font-medium text-[#374151] block mb-1">Product / Item Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Dell UltraSharp 27 Monitor"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">SKU / Item Code</label>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. SKU-MON-27"
                  className="text-xs uppercase font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">HSN / SAC Code *</label>
                <Input
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  placeholder="85285200"
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Unit of Measurement (UOM)</label>
                <Input
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="NOS / PCS"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Selling Price (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  className="text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Default GST Rate (%)</label>
                <select
                  name="defaultGstRate"
                  value={formData.defaultGstRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value={0}>0% (Nil Rated)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E5E7EB]">
          <Link href={`/products/${id}`}>
            <Button variant="outline" type="button" className="text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-6 gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Product Master</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

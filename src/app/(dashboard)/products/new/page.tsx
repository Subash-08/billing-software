'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface ICategory {
  _id: string;
  name: string;
  type: string;
}

interface IUnit {
  _id: string;
  name: string;
  symbol: string;
  uqc: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);

  const [form, setForm] = useState({
    name: '',
    code: '',
    hsnCode: '',
    unit: 'Pcs',
    uqc: 'PCS',
    sellingPrice: '',
    purchasePrice: '',
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
    categoryId: '',
    description: '',
  });

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [catRes, unitRes] = await Promise.all([
          fetch('/api/categories?type=PRODUCT&status=ACTIVE'),
          fetch('/api/units'),
        ]);
        const catData = await catRes.json();
        const unitData = await unitRes.json();

        if (catRes.ok) setCategories(catData.categories || []);
        if (unitRes.ok) setUnits(unitData.units || []);
      } catch {
        // Master data fallback
      }
    }
    loadMasterData();
  }, []);

  const handleUnitChange = (symbol: string) => {
    const matched = units.find((u) => u.symbol === symbol);
    setForm({
      ...form,
      unit: symbol,
      uqc: matched ? matched.uqc : form.uqc,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
        hsnCode: form.hsnCode.trim(),
        unit: form.unit,
        uqc: form.uqc,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        defaultGstRate: Number(form.defaultGstRate),
        taxTreatment: form.taxTreatment,
        categoryId: form.categoryId || undefined,
        description: form.description.trim() || undefined,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      router.push('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4">
        <Link href="/products">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Create New Product</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Add physical goods to your catalog with HSN and default tax profile.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-xs font-semibold text-[#DC2626]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Basic Information */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              1. Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">Product Name *</label>
                <Input
                  placeholder="e.g. Industrial Steel Bolt M8"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">SKU / Item Code</label>
                <Input
                  placeholder="e.g. BOLT-M8-001 (auto-uppercased)"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="bg-white font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Classification & Units */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              2. Classification & Measurement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">HSN Goods Code *</label>
                <Input
                  placeholder="e.g. 73181500 (4, 6, 8 digits)"
                  value={form.hsnCode}
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  required
                  className="bg-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[#374151] mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="">-- No Category --</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name} ({cat.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#374151] mb-1">Stock Unit / UQC *</label>
                <select
                  value={form.unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  {units.map((u) => (
                    <option key={u._id} value={u.symbol}>
                      {u.name} ({u.symbol} - {u.uqc})
                    </option>
                  ))}
                  {units.length === 0 && <option value="Pcs">Pcs (PCS)</option>}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Pricing & Tax Defaults */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              3. Pricing & Tax Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">Selling Price (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  required
                  className="bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#374151] mb-1">Purchase Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.purchasePrice}
                  onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  className="bg-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-[#374151] mb-1">Default GST Rate %</label>
                <select
                  value={form.defaultGstRate}
                  onChange={(e) => setForm({ ...form, defaultGstRate: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18% (Standard)</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#374151] mb-1">Tax Treatment</label>
                <select
                  value={form.taxTreatment}
                  onChange={(e) => setForm({ ...form, taxTreatment: e.target.value })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="TAXABLE">Taxable</option>
                  <option value="NIL_RATED">Nil Rated</option>
                  <option value="EXEMPT">Exempt</option>
                  <option value="NON_GST">Non-GST</option>
                  <option value="ZERO_RATED">Zero Rated (Export/SEZ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#374151] mb-1">Description / Notes</label>
              <textarea
                rows={2}
                placeholder="Item specification or notes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <Link href="/products">
            <Button type="button" variant="outline" className="text-xs bg-white">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-6 gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Product'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

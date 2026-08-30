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
}

export default function NewServicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);

  const [form, setForm] = useState({
    name: '',
    code: '',
    sacCode: '',
    billingUnit: 'Job',
    rate: '',
    defaultGstRate: 18,
    taxTreatment: 'TAXABLE',
    categoryId: '',
    description: '',
  });

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [catRes, unitRes] = await Promise.all([
          fetch('/api/categories?type=SERVICE&status=ACTIVE'),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
        sacCode: form.sacCode.trim(),
        billingUnit: form.billingUnit,
        rate: parseFloat(form.rate) || 0,
        defaultGstRate: Number(form.defaultGstRate),
        taxTreatment: form.taxTreatment,
        categoryId: form.categoryId || undefined,
        description: form.description.trim() || undefined,
      };

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create service');

      router.push('/services');
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
        <Link href="/services">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Create New Service</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Add billable service offerings with SAC code and default tax profile.</p>
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
                <label className="block font-medium text-[#374151] mb-1">Service Title *</label>
                <Input
                  placeholder="e.g. IT Support & Infrastructure Maintenance"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Service Code</label>
                <Input
                  placeholder="e.g. SERV-IT-001 (auto-uppercased)"
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
              2. Classification & Billing Measurement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">SAC Code *</label>
                <Input
                  placeholder="e.g. 998311 (4 to 6 digits)"
                  value={form.sacCode}
                  onChange={(e) => setForm({ ...form, sacCode: e.target.value })}
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
                <label className="block font-medium text-[#374151] mb-1">Billing Unit *</label>
                <select
                  value={form.billingUnit}
                  onChange={(e) => setForm({ ...form, billingUnit: e.target.value })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="Job">Job</option>
                  <option value="Hrs">Hrs</option>
                  <option value="Mth">Mth</option>
                  <option value="Sqft">Sqft</option>
                  {units.map((u) => (
                    <option key={u._id} value={u.symbol}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">Service Rate (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  required
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
                placeholder="Service details or scope..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <Link href="/services">
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
            <span>{saving ? 'Saving...' : 'Save Service'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

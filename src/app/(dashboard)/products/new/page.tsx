'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';
import { HsnSacSearchInput } from '@/components/ui/hsn-sac-search';

interface ICategory { _id: string; name: string; type: string; }
interface IUnit { _id: string; name: string; symbol: string; uqc: string; }

const GST_RATES = [0, 5, 12, 18, 28];

const TAX_TREATMENT_INFO: Record<string, string> = {
  TAXABLE: 'Standard GST applies — CGST+SGST or IGST computed on taxable amount.',
  NIL_RATED: 'GST rate is 0% by law — supply is taxable but at 0%.',
  EXEMPT: 'Not subject to GST. No tax charged on this item.',
  NON_GST: 'Outside the scope of GST entirely.',
  ZERO_RATED: 'GST 0% for exports or SEZ supplies.',
};

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
    isPriceInclusiveOfGst: false,
    taxTreatment: 'TAXABLE',
    categoryId: '',
    description: '',
    // Inventory
    trackInventory: true,
    openingStock: '',
    reorderLevel: '',
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
      } catch { /* silently degrade */ }
    }
    loadMasterData();
  }, []);

  const handleUnitChange = (symbol: string) => {
    const matched = units.find((u) => u.symbol === symbol);
    setForm({ ...form, unit: symbol, uqc: matched ? matched.uqc : form.uqc });
  };

  const sellingPriceNum = parseFloat(form.sellingPrice) || 0;
  const gstRate = form.taxTreatment === 'TAXABLE' ? form.defaultGstRate : 0;
  const previewTaxable = form.isPriceInclusiveOfGst && gstRate > 0
    ? Math.round((sellingPriceNum / (1 + gstRate / 100)) * 100) / 100
    : sellingPriceNum;
  const previewGst = Math.round((previewTaxable * gstRate / 100) * 100) / 100;
  const previewTotal = form.isPriceInclusiveOfGst ? sellingPriceNum : Math.round((sellingPriceNum + previewGst) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Frontend validation
    const hsnPattern = /^[0-9]{4,8}$/;
    if (!hsnPattern.test(form.hsnCode.trim())) {
      setError('HSN code must be 4, 6, or 8 numeric digits. SAC codes cannot be used here.');
      setSaving(false);
      return;
    }
    if (sellingPriceNum < 0) {
      setError('Selling price cannot be negative.');
      setSaving(false);
      return;
    }

    const openingStockNum = form.openingStock ? parseFloat(form.openingStock) : 0;
    const reorderLevelNum = form.reorderLevel ? parseFloat(form.reorderLevel) : 0;

    try {
      // 1. Create the product
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
        hsnCode: form.hsnCode.trim(),
        unit: form.unit,
        uqc: form.uqc,
        sellingPrice: sellingPriceNum,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        defaultGstRate: gstRate,
        isPriceInclusiveOfGst: form.isPriceInclusiveOfGst,
        taxTreatment: form.taxTreatment,
        categoryId: form.categoryId || undefined,
        description: form.description.trim() || undefined,
        // Note: trackInventory and reorderLevel are stored on the product model
        // Opening stock is created as a separate ledger movement after product creation
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');

      const productId = data.product?._id;

      // 2. If opening stock provided, record OPENING movement
      if (productId && form.trackInventory && openingStockNum > 0) {
        const stockRes = await fetch(`/api/products/${productId}/stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'OPENING',
            quantity: openingStockNum,
            notes: 'Opening stock set at product creation',
          }),
        });
        if (!stockRes.ok) {
          const stockErr = await stockRes.json();
          // Non-fatal: product was created, stock movement failed
          console.warn('Opening stock movement failed:', stockErr.error);
        }
      }

      router.push('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inp = 'w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const lbl = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/products" className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-xs text-gray-500">Physical goods with HSN, GST config, inventory tracking, and opening stock.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Identity ─────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">1 · Product Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Product Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Laptop 15-inch" className={inp} />
            </div>
            <div>
              <label className={lbl}>SKU / Item Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. LAP-001 (auto-uppercased)" className={`${inp} font-mono`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional product notes or specification..." className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* ── Section 2: GST Classification ───────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">2 · GST Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={lbl}>HSN Code &amp; Item Classification <span className="text-red-500">*</span></label>
              <HsnSacSearchInput
                type="HSN"
                value={form.hsnCode}
                onChange={(code) => setForm(f => ({ ...f, hsnCode: code }))}
              />
            </div>
            <div>
              <label className={lbl}>Unit / UQC <span className="text-red-500">*</span></label>
              <select value={form.unit} onChange={e => handleUnitChange(e.target.value)} className={sel}>
                {units.map(u => <option key={u._id} value={u.symbol}>{u.name} ({u.symbol})</option>)}
                {units.length === 0 && <option value="Pcs">Pcs (PCS)</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>GST Applicability <span className="text-red-500">*</span></label>
              <select value={form.taxTreatment} onChange={e => setForm({ ...form, taxTreatment: e.target.value })} className={sel}>
                <option value="TAXABLE">Taxable</option>
                <option value="NIL_RATED">Nil Rated (0% by law)</option>
                <option value="EXEMPT">Exempt (no GST)</option>
                <option value="NON_GST">Non-GST</option>
                <option value="ZERO_RATED">Zero Rated (Export/SEZ)</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-400">{TAX_TREATMENT_INFO[form.taxTreatment]}</p>
            </div>
            <div>
              <label className={lbl}>GST Rate %</label>
              <select
                value={form.defaultGstRate}
                onChange={e => setForm({ ...form, defaultGstRate: Number(e.target.value) })}
                disabled={form.taxTreatment !== 'TAXABLE'}
                className={`${sel} disabled:opacity-50 disabled:bg-gray-50`}
              >
                {GST_RATES.map(r => <option key={r} value={r}>{r}%{r === 18 ? ' (Standard)' : ''}</option>)}
              </select>
              {form.taxTreatment !== 'TAXABLE' && (
                <p className="mt-1 text-[10px] text-orange-500">GST rate overridden to 0% by tax applicability setting.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Pricing ──────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">3 · Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} required placeholder="0.00" className={`${inp} font-mono`} />
            </div>
            <div>
              <label className={lbl}>Price Mode <span className="text-red-500">*</span></label>
              <select
                value={form.isPriceInclusiveOfGst ? 'INCLUSIVE' : 'EXCLUSIVE'}
                onChange={e => setForm({ ...form, isPriceInclusiveOfGst: e.target.value === 'INCLUSIVE' })}
                className={sel}
              >
                <option value="EXCLUSIVE">Exclusive GST (GST added on top)</option>
                <option value="INCLUSIVE">Inclusive GST (GST already in price)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Purchase Price (₹)</label>
              <input type="number" step="0.01" min="0" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} placeholder="Optional" className={`${inp} font-mono`} />
            </div>
          </div>

          {/* Live Price Preview */}
          {sellingPriceNum > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Price Preview (per unit)
              </p>
              <div className="grid grid-cols-4 gap-2 text-blue-800">
                <div className="text-center">
                  <p className="text-[10px] text-blue-500">Taxable</p>
                  <p className="font-bold font-mono">₹{previewTaxable.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-blue-500">GST ({gstRate}%)</p>
                  <p className="font-bold font-mono">₹{previewGst.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-blue-500">Grand Total</p>
                  <p className="font-bold font-mono text-blue-900">₹{previewTotal.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-blue-500">Mode</p>
                  <p className="font-semibold">{form.isPriceInclusiveOfGst ? 'Incl. GST' : 'Excl. GST'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 4: Inventory ────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">4 · Inventory Tracking</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-600">Track inventory</span>
              <div
                onClick={() => setForm({ ...form, trackInventory: !form.trackInventory })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.trackInventory ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.trackInventory ? 'left-5' : 'left-0.5'}`} />
              </div>
            </label>
          </div>

          {form.trackInventory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Opening Stock ({form.unit || 'units'})</label>
                <input type="number" step="0.001" min="0" value={form.openingStock} onChange={e => setForm({ ...form, openingStock: e.target.value })} placeholder="0" className={`${inp} font-mono`} />
                <p className="mt-1 text-[10px] text-gray-400">Creates an OPENING stock ledger entry. Leave blank if stock is 0.</p>
              </div>
              <div>
                <label className={lbl}>Reorder Level ({form.unit || 'units'})</label>
                <input type="number" step="0.001" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} placeholder="0" className={`${inp} font-mono`} />
                <p className="mt-1 text-[10px] text-gray-400">Alert shown on dashboard and inventory when stock falls at or below this level.</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              Inventory tracking disabled. Stock movements will not be recorded for this product.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Link href="/products" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

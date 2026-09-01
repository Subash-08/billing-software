'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';

const GST_RATES = [0, 5, 12, 18, 28];

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    hsnCode: '',
    unit: 'Pcs',
    uqc: 'PCS',
    sellingPrice: 0,
    purchasePrice: 0,
    defaultGstRate: 18,
    isPriceInclusiveOfGst: false,
    taxTreatment: 'TAXABLE',
    reorderLevel: 0,
    trackInventory: true,
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch product');
        const p = data.product;
        setForm({
          name: p.name || '',
          code: p.code || '',
          hsnCode: p.hsnCode || '',
          unit: p.unit || 'Pcs',
          uqc: p.uqc || 'PCS',
          sellingPrice: p.sellingPrice || 0,
          purchasePrice: p.purchasePrice || 0,
          defaultGstRate: p.defaultGstRate ?? 18,
          isPriceInclusiveOfGst: p.isPriceInclusiveOfGst ?? false,
          taxTreatment: p.taxTreatment || 'TAXABLE',
          reorderLevel: p.reorderLevel || 0,
          trackInventory: p.trackInventory ?? true,
          status: p.status || 'ACTIVE',
          description: p.description || '',
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const hsnPattern = /^[0-9]{4,8}$/;
    if (!hsnPattern.test(form.hsnCode.trim())) {
      setError('HSN code must be 4, 6, or 8 numeric digits.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          code: form.code ? form.code.toUpperCase() : undefined,
          hsnCode: form.hsnCode,
          unit: form.unit,
          uqc: form.uqc,
          sellingPrice: form.sellingPrice,
          purchasePrice: form.purchasePrice || undefined,
          defaultGstRate: form.defaultGstRate,
          isPriceInclusiveOfGst: form.isPriceInclusiveOfGst,
          taxTreatment: form.taxTreatment,
          reorderLevel: form.reorderLevel,
          description: form.description || undefined,
          status: form.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');
      router.push(`/products/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs">Loading product...</span>
      </div>
    );
  }

  const gstRate = form.taxTreatment === 'TAXABLE' ? form.defaultGstRate : 0;
  const previewTaxable = form.isPriceInclusiveOfGst && gstRate > 0
    ? Math.round((form.sellingPrice / (1 + gstRate / 100)) * 100) / 100
    : form.sellingPrice;
  const previewGst = Math.round((previewTaxable * gstRate / 100) * 100) / 100;
  const previewTotal = form.isPriceInclusiveOfGst ? form.sellingPrice : Math.round((form.sellingPrice + previewGst) * 100) / 100;

  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inp = 'w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const lbl = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/products/${id}`} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-xs text-gray-500">Update catalog fields. Issued invoices are unaffected by these changes.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Identity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Product Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inp} />
            </div>
            <div>
              <label className={lbl}>SKU / Item Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className={`${inp} font-mono`} />
            </div>
            <div>
              <label className={lbl}>HSN Code <span className="text-red-500">*</span></label>
              <input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} required className={`${inp} font-mono`} />
              <p className="mt-1 text-[10px] text-gray-400">4, 6, or 8 numeric digits (Goods code)</p>
            </div>
            <div>
              <label className={lbl}>Unit</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* GST */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>GST Applicability</label>
              <select value={form.taxTreatment} onChange={e => setForm({ ...form, taxTreatment: e.target.value })} className={sel}>
                <option value="TAXABLE">Taxable</option>
                <option value="NIL_RATED">Nil Rated</option>
                <option value="EXEMPT">Exempt</option>
                <option value="NON_GST">Non-GST</option>
                <option value="ZERO_RATED">Zero Rated (Export/SEZ)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>GST Rate %</label>
              <select
                value={form.defaultGstRate}
                onChange={e => setForm({ ...form, defaultGstRate: Number(e.target.value) })}
                disabled={form.taxTreatment !== 'TAXABLE'}
                className={`${sel} disabled:opacity-50`}
              >
                {GST_RATES.map(r => <option key={r} value={r}>{r}%{r === 18 ? ' (Standard)' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Selling Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} required className={`${inp} font-mono`} />
            </div>
            <div>
              <label className={lbl}>Price Mode <span className="text-red-500">*</span></label>
              <select
                value={form.isPriceInclusiveOfGst ? 'INCLUSIVE' : 'EXCLUSIVE'}
                onChange={e => setForm({ ...form, isPriceInclusiveOfGst: e.target.value === 'INCLUSIVE' })}
                className={sel}
              >
                <option value="EXCLUSIVE">Exclusive GST</option>
                <option value="INCLUSIVE">Inclusive GST</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Purchase Price (₹)</label>
              <input type="number" step="0.01" min="0" value={form.purchasePrice || ''} onChange={e => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })} placeholder="Optional" className={`${inp} font-mono`} />
            </div>
          </div>

          {form.sellingPrice > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Price Preview</p>
              <div className="grid grid-cols-4 gap-2 text-blue-800">
                <div className="text-center"><p className="text-[10px] text-blue-500">Taxable</p><p className="font-bold font-mono">₹{previewTaxable.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">GST ({gstRate}%)</p><p className="font-bold font-mono">₹{previewGst.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">Grand Total</p><p className="font-bold font-mono text-blue-900">₹{previewTotal.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">Mode</p><p className="font-semibold">{form.isPriceInclusiveOfGst ? 'Incl. GST' : 'Excl. GST'}</p></div>
              </div>
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inventory Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Reorder Level ({form.unit})</label>
              <input type="number" step="0.001" min="0" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: parseFloat(e.target.value) || 0 })} className={`${inp} font-mono`} />
              <p className="mt-1 text-[10px] text-gray-400">Low-stock alert triggered at or below this level.</p>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={sel}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive (Soft Deactivated)</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 bg-gray-50 rounded p-2">
            To adjust stock quantity, go to the Product detail page and use the &quot;Adjust Stock&quot; button. Editing this form does not change stock levels.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Link href={`/products/${id}`} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

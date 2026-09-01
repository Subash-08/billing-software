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
  EXEMPT: 'Not subject to GST. No tax charged on this service.',
  NON_GST: 'Outside the scope of GST entirely.',
  ZERO_RATED: 'GST 0% for exports or SEZ supplies.',
};

const COMMON_BILLING_UNITS = [
  { symbol: 'Job', name: 'Job' },
  { symbol: 'Hrs', name: 'Hours' },
  { symbol: 'Day', name: 'Days' },
  { symbol: 'Mth', name: 'Month' },
  { symbol: 'Yr', name: 'Year' },
  { symbol: 'Sqft', name: 'Square Feet' },
];

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
    isPriceInclusiveOfGst: false,
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
      } catch { /* silently degrade */ }
    }
    loadMasterData();
  }, []);

  const rateNum = parseFloat(form.rate) || 0;
  const gstRate = form.taxTreatment === 'TAXABLE' ? form.defaultGstRate : 0;
  const previewTaxable = form.isPriceInclusiveOfGst && gstRate > 0
    ? Math.round((rateNum / (1 + gstRate / 100)) * 100) / 100
    : rateNum;
  const previewGst = Math.round((previewTaxable * gstRate / 100) * 100) / 100;
  const previewTotal = form.isPriceInclusiveOfGst ? rateNum : Math.round((rateNum + previewGst) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // SAC validation — 4 to 6 digits, numeric
    const sacPattern = /^[0-9]{4,6}$/;
    if (!sacPattern.test(form.sacCode.trim())) {
      setError('SAC code must be 4 to 6 numeric digits. HSN codes cannot be used for services.');
      setSaving(false);
      return;
    }
    if (rateNum < 0) {
      setError('Service rate cannot be negative.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() ? form.code.trim().toUpperCase() : undefined,
        sacCode: form.sacCode.trim(),
        billingUnit: form.billingUnit,
        rate: rateNum,
        defaultGstRate: gstRate,
        isPriceInclusiveOfGst: form.isPriceInclusiveOfGst,
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

  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inp = 'w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const lbl = 'block text-xs font-medium text-gray-700 mb-1';

  // Combine common + unit master options, deduplicate by symbol
  const allUnits = [
    ...COMMON_BILLING_UNITS,
    ...units.filter(u => !COMMON_BILLING_UNITS.find(cu => cu.symbol === u.symbol)),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/services" className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Service</h1>
          <p className="text-xs text-gray-500">Billable service offerings with SAC code, GST config, and price mode. Services never affect inventory stock.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">{error}</div>
      )}

      {/* No-inventory notice */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700">
          <strong>Services never affect inventory.</strong> Issuing an invoice for a service will not create any stock movement. Only physical goods (Products) deduct from inventory.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Identity ─────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">1 · Service Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Service Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. IT Support & Maintenance" className={inp} />
            </div>
            <div>
              <label className={lbl}>Service Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. SERV-IT-001" className={`${inp} font-mono`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional service details or scope..." className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* ── Section 2: GST Classification ───────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">2 · GST Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={lbl}>SAC Code &amp; Service Classification <span className="text-red-500">*</span></label>
              <HsnSacSearchInput
                type="SAC"
                value={form.sacCode}
                onChange={(code) => setForm(f => ({ ...f, sacCode: code }))}
              />
            </div>
            <div>
              <label className={lbl}>Billing Unit <span className="text-red-500">*</span></label>
              <select value={form.billingUnit} onChange={e => setForm({ ...form, billingUnit: e.target.value })} className={sel}>
                {allUnits.map(u => <option key={u.symbol} value={u.symbol}>{u.name} ({u.symbol})</option>)}
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
            </div>
          </div>
        </div>

        {/* ── Section 3: Pricing ──────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">3 · Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Service Rate (₹) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} required placeholder="0.00" className={`${inp} font-mono`} />
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
          </div>

          {/* Live Rate Preview */}
          {rateNum > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Rate Preview (per billing unit)
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Link href="/services" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving...' : 'Save Service'}
          </button>
        </div>
      </form>
    </div>
  );
}

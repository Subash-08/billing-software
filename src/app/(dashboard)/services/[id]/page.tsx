'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Info } from 'lucide-react';

interface IServiceDetail {
  _id: string;
  name: string;
  code?: string;
  sacCode: string;
  billingUnit: string;
  uqc: string;
  rate: number;
  defaultGstRate: number;
  isPriceInclusiveOfGst: boolean;
  taxTreatment: string;
  categoryId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const GST_RATES = [0, 5, 12, 18, 28];

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<IServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadService() {
      try {
        const res = await fetch(`/api/services/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch service');
        setService(data.service);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const sacPattern = /^[0-9]{4,6}$/;
    if (!sacPattern.test(service.sacCode.trim())) {
      setError('SAC code must be 4 to 6 numeric digits.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          code: service.code ? service.code.toUpperCase() : undefined,
          sacCode: service.sacCode,
          billingUnit: service.billingUnit,
          rate: service.rate,
          defaultGstRate: service.defaultGstRate,
          isPriceInclusiveOfGst: service.isPriceInclusiveOfGst,
          taxTreatment: service.taxTreatment,
          description: service.description,
          status: service.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update service');
      setService(data.service);
      setSuccess('Service updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-xs">Loading service...</span>
      </div>
    );
  }

  if (error && !service) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-xs text-red-600">{error}</p>
        <Link href="/services" className="text-xs text-blue-600 hover:underline">← Back to Services</Link>
      </div>
    );
  }

  if (!service) return null;

  const sel = 'w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inp = 'w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const lbl = 'block text-xs font-medium text-gray-700 mb-1';

  const gstRate = service.taxTreatment === 'TAXABLE' ? service.defaultGstRate : 0;
  const previewTaxable = service.isPriceInclusiveOfGst && gstRate > 0
    ? Math.round((service.rate / (1 + gstRate / 100)) * 100) / 100
    : service.rate;
  const previewGst = Math.round((previewTaxable * gstRate / 100) * 100) / 100;
  const previewTotal = service.isPriceInclusiveOfGst ? service.rate : Math.round((service.rate + previewGst) * 100) / 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/services" className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{service.name}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${service.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {service.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">{service.code ? `Code: ${service.code} · ` : ''}SAC: {service.sacCode}</p>
          </div>
        </div>
      </div>

      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 font-medium">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">{error}</div>}

      {/* No-inventory notice */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-purple-700"><strong>Services never affect inventory.</strong> Invoicing this service creates zero stock movements.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-5">
        {/* Identity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Service Name</label>
              <input value={service.name} onChange={e => setService({ ...service, name: e.target.value })} required className={inp} />
            </div>
            <div>
              <label className={lbl}>Service Code</label>
              <input value={service.code || ''} onChange={e => setService({ ...service, code: e.target.value })} className={`${inp} font-mono`} />
            </div>
            <div>
              <label className={lbl}>SAC Code</label>
              <input value={service.sacCode} onChange={e => setService({ ...service, sacCode: e.target.value })} required className={`${inp} font-mono`} />
              <p className="mt-1 text-[10px] text-gray-400">4–6 numeric digits</p>
            </div>
            <div>
              <label className={lbl}>Billing Unit</label>
              <input value={service.billingUnit} onChange={e => setService({ ...service, billingUnit: e.target.value })} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={2} value={service.description || ''} onChange={e => setService({ ...service, description: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        {/* GST */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>GST Applicability</label>
              <select value={service.taxTreatment} onChange={e => setService({ ...service, taxTreatment: e.target.value })} className={sel}>
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
                value={service.defaultGstRate}
                onChange={e => setService({ ...service, defaultGstRate: Number(e.target.value) })}
                disabled={service.taxTreatment !== 'TAXABLE'}
                className={`${sel} disabled:opacity-50`}
              >
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Service Rate (₹)</label>
              <input type="number" step="0.01" min="0" value={service.rate} onChange={e => setService({ ...service, rate: parseFloat(e.target.value) || 0 })} required className={`${inp} font-mono`} />
            </div>
            <div>
              <label className={lbl}>Price Mode</label>
              <select
                value={service.isPriceInclusiveOfGst ? 'INCLUSIVE' : 'EXCLUSIVE'}
                onChange={e => setService({ ...service, isPriceInclusiveOfGst: e.target.value === 'INCLUSIVE' })}
                className={sel}
              >
                <option value="EXCLUSIVE">Exclusive GST (GST added on top)</option>
                <option value="INCLUSIVE">Inclusive GST (GST already in price)</option>
              </select>
            </div>
          </div>

          {service.rate > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Rate Preview</p>
              <div className="grid grid-cols-4 gap-2 text-blue-800">
                <div className="text-center"><p className="text-[10px] text-blue-500">Taxable</p><p className="font-bold font-mono">₹{previewTaxable.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">GST ({gstRate}%)</p><p className="font-bold font-mono">₹{previewGst.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">Grand Total</p><p className="font-bold font-mono text-blue-900">₹{previewTotal.toFixed(2)}</p></div>
                <div className="text-center"><p className="text-[10px] text-blue-500">Mode</p><p className="font-semibold">{service.isPriceInclusiveOfGst ? 'Incl. GST' : 'Excl. GST'}</p></div>
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>Status</label>
            <select value={service.status} onChange={e => setService({ ...service, status: e.target.value as 'ACTIVE' | 'INACTIVE' })} className={sel}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/services" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
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

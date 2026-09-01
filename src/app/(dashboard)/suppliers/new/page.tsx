'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' }, { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' }, { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' }, { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' }, { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh (New)' },
  { code: '38', name: 'Ladakh' },
];

export default function NewSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    legalName: '',
    gstin: '',
    gstTreatment: 'REGISTERED' as 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'SEZ' | 'OVERSEAS',
    stateCode: '33',
    phone: '',
    email: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '',
      country: 'India',
    },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branch: '',
    },
  });

  const updateAddress = (field: string, value: string) => {
    setForm(f => ({
      ...f,
      address: { ...f.address, [field]: value },
    }));
    if (field === 'stateCode') {
      const stateName = INDIAN_STATES.find(s => s.code === value)?.name || '';
      setForm(f => ({
        ...f,
        stateCode: value,
        address: { ...f.address, stateCode: value, state: stateName },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        legalName: form.legalName || undefined,
        gstin: form.gstin || undefined,
        gstTreatment: form.gstTreatment,
        stateCode: form.stateCode,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: {
          addressLine1: form.address.addressLine1,
          addressLine2: form.address.addressLine2 || undefined,
          city: form.address.city,
          district: form.address.district || undefined,
          state: form.address.state,
          stateCode: form.address.stateCode,
          pincode: form.address.pincode,
          country: form.address.country,
        },
        bankDetails: (form.bankDetails.accountNumber || form.bankDetails.bankName) ? {
          accountName: form.bankDetails.accountName || undefined,
          accountNumber: form.bankDetails.accountNumber || undefined,
          bankName: form.bankDetails.bankName || undefined,
          ifscCode: form.bankDetails.ifscCode || undefined,
          branch: form.bankDetails.branch || undefined,
        } : undefined,
      };
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create supplier');
      router.push('/suppliers');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-9 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/suppliers" className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Supplier</h1>
          <p className="text-xs text-gray-500">Enter supplier details. GSTIN will determine GST treatment for purchases.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Supplier Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Ramesh Traders" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Legal / Company Name</label>
              <input value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} placeholder="Same as above if individual" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>GSTIN</label>
              <input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} placeholder="15-character GSTIN" maxLength={15} className={`${inputCls} font-mono uppercase`} />
            </div>
            <div>
              <label className={labelCls}>GST Treatment <span className="text-red-500">*</span></label>
              <select value={form.gstTreatment} onChange={e => setForm(f => ({ ...f, gstTreatment: e.target.value as typeof form.gstTreatment }))} className={inputCls}>
                <option value="REGISTERED">Registered (has GSTIN)</option>
                <option value="UNREGISTERED">Unregistered</option>
                <option value="COMPOSITION">Composition Dealer</option>
                <option value="SEZ">SEZ</option>
                <option value="OVERSEAS">Overseas</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@example.com" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Address Line 1 <span className="text-red-500">*</span></label>
              <input value={form.address.addressLine1} onChange={e => updateAddress('addressLine1', e.target.value)} required placeholder="Street, Building, etc." className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address Line 2</label>
              <input value={form.address.addressLine2} onChange={e => updateAddress('addressLine2', e.target.value)} placeholder="Area, Landmark (optional)" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>City <span className="text-red-500">*</span></label>
              <input value={form.address.city} onChange={e => updateAddress('city', e.target.value)} required placeholder="City" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>District</label>
              <input value={form.address.district} onChange={e => updateAddress('district', e.target.value)} placeholder="District" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State <span className="text-red-500">*</span></label>
              <select value={form.address.stateCode} onChange={e => updateAddress('stateCode', e.target.value)} className={inputCls}>
                {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pincode <span className="text-red-500">*</span></label>
              <input value={form.address.pincode} onChange={e => updateAddress('pincode', e.target.value)} required placeholder="6-digit pincode" maxLength={6} className={`${inputCls} font-mono`} />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Account Name</label>
              <input value={form.bankDetails.accountName} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountName: e.target.value } }))} placeholder="Account holder name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Account Number</label>
              <input value={form.bankDetails.accountNumber} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: e.target.value } }))} placeholder="Bank account number" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls}>Bank Name</label>
              <input value={form.bankDetails.bankName} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, bankName: e.target.value } }))} placeholder="Bank name" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>IFSC Code</label>
              <input value={form.bankDetails.ifscCode} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, ifscCode: e.target.value.toUpperCase() } }))} placeholder="IFSC code" className={`${inputCls} font-mono uppercase`} />
            </div>
            <div>
              <label className={labelCls}>Branch</label>
              <input value={form.bankDetails.branch} onChange={e => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, branch: e.target.value } }))} placeholder="Branch name" className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/suppliers" className="inline-flex items-center gap-2 px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Supplier
          </button>
        </div>
      </form>
    </div>
  );
}

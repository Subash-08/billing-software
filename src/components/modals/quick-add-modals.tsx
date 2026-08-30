'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, UserPlus, PackagePlus, Loader2 } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: any) => void;
}

export function QuickAddCustomerModal({ isOpen, onClose, onSuccess }: QuickAddCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('33');
  const [state, setState] = useState('Tamil Nadu');
  const [city, setCity] = useState('Chennai');
  const [addressLine1, setAddressLine1] = useState('Main Road');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        displayName: name.trim(),
        customerType: gstin.trim() ? 'BUSINESS' : 'INDIVIDUAL',
        gstTreatment: gstin.trim() ? 'REGISTERED' : 'UNREGISTERED',
        gstin: gstin.trim().toUpperCase() || undefined,
        phone: phone.trim() || '9840000000',
        stateCode,
        billingAddress: {
          name: name.trim(),
          addressLine1: addressLine1.trim() || 'Main Street',
          city: city.trim() || 'Chennai',
          state: state.trim() || 'Tamil Nadu',
          stateCode,
          pincode: '600001',
        },
      };

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.customer) {
        onSuccess(json.customer);
        onClose();
      } else {
        setError(json.details || json.error || 'Failed to create customer');
      }
    } catch (err: any) {
      setError(err.message || 'Network error creating customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Quick Add Customer</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Customer / Business Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Technologies Pvt Ltd"
              className="text-xs h-8"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN (Optional)</label>
              <Input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="33AAAAA0000A1Z5"
                className="text-xs h-8 uppercase font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9840012345"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">State Code *</label>
              <Input
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                placeholder="33"
                className="text-xs h-8 font-mono"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">State Name</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Tamil Nadu"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-blue-600 text-white text-xs gap-1">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Select Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProduct: any) => void;
}

export function QuickAddProductModal({ isOpen, onClose, onSuccess }: QuickAddProductModalProps) {
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('998311');
  const [unit, setUnit] = useState('PCS');
  const [sellingPrice, setSellingPrice] = useState('100');
  const [gstRate, setGstRate] = useState('18');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const priceVal = parseFloat(sellingPrice) || 0;
      const ratePaise = Math.round(priceVal * 100);

      const payload = {
        name: name.trim(),
        sku: `SKU-${Date.now().toString().slice(-5)}`,
        hsnCode: hsnCode.trim() || '998311',
        unit: unit.toUpperCase(),
        salesUnitPriceGstInclusive: false,
        pricing: { sellingPricePaise: ratePaise },
        taxCategory: { defaultGstRatePercent: parseFloat(gstRate) || 18, taxTreatment: 'TAXABLE' },
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.product) {
        onSuccess({
          _id: json.product._id,
          name: json.product.name,
          hsnCode: json.product.hsnCode,
          unit: json.product.unit,
          sellingPrice: priceVal,
          defaultGstRate: parseFloat(gstRate) || 18,
        });
        onClose();
      } else {
        setError(json.details || json.error || 'Failed to create product');
      }
    } catch (err: any) {
      setError(err.message || 'Network error creating product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <span>Quick Add Product</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Product / Service Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium Consulting Service"
              className="text-xs h-8"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">HSN / SAC Code</label>
              <Input
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="998311"
                className="text-xs h-8 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Unit (UQC)</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value.toUpperCase())}
                placeholder="PCS / NOS / HRS"
                className="text-xs h-8 uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Selling Price (₹) *</label>
              <Input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="100.00"
                className="text-xs h-8 font-mono"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GST Rate (%)</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 text-xs px-2 bg-white"
              >
                <option value="0">0% (Nil Rated / Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard)</option>
                <option value="28">28% GST (Luxury)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 text-white text-xs gap-1">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Select Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

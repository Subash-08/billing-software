'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

export default function CreateCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [formData, setFormData] = useState({
    customerType: 'BUSINESS',
    displayName: '',
    legalName: '',
    phone: '',
    email: '',
    gstTreatment: 'REGISTERED',
    gstin: '',
    stateCode: '33',
    billingAddress: {
      label: 'Billing Address',
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      state: 'Tamil Nadu',
      stateCode: '33',
      pincode: '',
      country: 'India',
    },
    shippingAddresses: [
      {
        label: 'Shipping Address',
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '',
        country: 'India',
        isDefaultShipping: true,
      },
    ],
    contacts: [
      {
        name: '',
        phone: '',
        email: '',
        designation: '',
      },
    ],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedBilling = { ...formData.billingAddress, [name]: value };
    setFormData({
      ...formData,
      billingAddress: updatedBilling,
      stateCode: name === 'stateCode' ? value : formData.stateCode,
    });
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedShipping = [{ ...formData.shippingAddresses[0], [name]: value }];
    setFormData({ ...formData, shippingAddresses: updatedShipping });
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedContacts = [{ ...formData.contacts[0], [name]: value }];
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        shippingAddresses: sameAsBilling
          ? [{ ...formData.billingAddress, label: 'Default Shipping', isDefaultShipping: true }]
          : formData.shippingAddresses,
        contacts: formData.contacts[0].name ? formData.contacts : [],
      };

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.details || data.error || 'Failed to create customer');
        return;
      }

      router.push(`/customers/${data.customer._id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3">
        <Link href="/customers">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Create New Customer</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Register customer tax classification, billing address, and GST profile.</p>
        </div>
      </div>

      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">1. Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Customer Type</label>
                <select
                  name="customerType"
                  value={formData.customerType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="BUSINESS">Business Entity (B2B)</option>
                  <option value="INDIVIDUAL">Individual / Retail Client (B2C)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Display Name *</label>
                <Input name="displayName" value={formData.displayName} onChange={handleChange} placeholder="e.g. ABC Enterprises" required className="text-xs" />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Legal Entity Name</label>
                <Input name="legalName" value={formData.legalName} onChange={handleChange} placeholder="ABC ENTERPRISES PRIVATE LIMITED" className="text-xs" />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Phone Number *</label>
                <Input name="phone" value={formData.phone} onChange={handleChange} maxLength={10} placeholder="9840012345" required className="text-xs font-mono" />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Email Address</label>
                <Input name="email" value={formData.email} onChange={handleChange} placeholder="billing@abcenterprises.com" className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Profile Card */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">2. GST & Tax Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">GST Treatment *</label>
                <select
                  name="gstTreatment"
                  value={formData.gstTreatment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="REGISTERED">Registered Taxpayer</option>
                  <option value="COMPOSITION">Composition Scheme</option>
                  <option value="UNREGISTERED">Unregistered Business</option>
                  <option value="SEZ">SEZ Developer / Unit</option>
                  <option value="EXPORT">Overseas / Export</option>
                  <option value="OTHER">Other Entity</option>
                </select>
              </div>

              {formData.gstTreatment !== 'UNREGISTERED' && (
                <div>
                  <label className="font-medium text-[#374151] block mb-1">GSTIN (15 chars)</label>
                  <Input
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="33AAAAA0000A1Z5"
                    className="font-mono uppercase text-xs"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">First 2 digits must match State Code.</p>
                </div>
              )}

              <div>
                <label className="font-medium text-[#374151] block mb-1">POS State Code *</label>
                <Input
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  maxLength={2}
                  placeholder="33"
                  required
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-[#6B7280] mt-1">33 = Tamil Nadu, 29 = Karnataka</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address Card */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">3. Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div>
              <label className="font-medium text-[#374151] block mb-1">Street Address Line 1 *</label>
              <Input name="addressLine1" value={formData.billingAddress.addressLine1} onChange={handleBillingChange} required className="text-xs" />
            </div>

            <div>
              <label className="font-medium text-[#374151] block mb-1">Street Address Line 2</label>
              <Input name="addressLine2" value={formData.billingAddress.addressLine2} onChange={handleBillingChange} className="text-xs" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">City *</label>
                <Input name="city" value={formData.billingAddress.city} onChange={handleBillingChange} required className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">State *</label>
                <Input name="state" value={formData.billingAddress.state} onChange={handleBillingChange} required className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">State Code *</label>
                <Input name="stateCode" value={formData.billingAddress.stateCode} onChange={handleBillingChange} required maxLength={2} className="font-mono text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Pincode *</label>
                <Input name="pincode" value={formData.billingAddress.pincode} onChange={handleBillingChange} required maxLength={6} className="font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address Card */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">4. Shipping Address</CardTitle>
            <label className="flex items-center space-x-2 text-xs text-[#374151] cursor-pointer">
              <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="text-[#2563EB]" />
              <span>Same as billing address</span>
            </label>
          </CardHeader>

          {!sameAsBilling && (
            <CardContent className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Shipping Address Line 1 *</label>
                <Input name="addressLine1" value={formData.shippingAddresses[0].addressLine1} onChange={handleShippingChange} required className="text-xs" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-[#374151] block mb-1">City *</label>
                  <Input name="city" value={formData.shippingAddresses[0].city} onChange={handleShippingChange} required className="text-xs" />
                </div>
                <div>
                  <label className="font-medium text-[#374151] block mb-1">State *</label>
                  <Input name="state" value={formData.shippingAddresses[0].state} onChange={handleShippingChange} required className="text-xs" />
                </div>
                <div>
                  <label className="font-medium text-[#374151] block mb-1">Pincode *</label>
                  <Input name="pincode" value={formData.shippingAddresses[0].pincode} onChange={handleShippingChange} required maxLength={6} className="font-mono text-xs" />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Primary Contact Person Card */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">5. Primary Contact Person</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Contact Name</label>
                <Input name="name" value={formData.contacts[0].name} onChange={handleContactChange} placeholder="e.g. Ramesh Kumar" className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Mobile Number</label>
                <Input name="phone" value={formData.contacts[0].phone} onChange={handleContactChange} maxLength={10} placeholder="9840099999" className="text-xs font-mono" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Designation</label>
                <Input name="designation" value={formData.contacts[0].designation} onChange={handleContactChange} placeholder="Accounts Manager" className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3 pt-4 border-t border-[#E5E7EB]">
          <Link href="/customers">
            <Button type="button" variant="outline" className="text-xs px-4 py-2 border-[#D1D5DB]">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded">
            {saving ? 'Saving customer...' : 'Save & create customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

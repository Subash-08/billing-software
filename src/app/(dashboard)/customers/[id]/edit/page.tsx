'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
    status: 'ACTIVE',
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

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/customers/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch customer');

        const c = data.customer;
        setFormData({
          customerType: c.customerType || 'BUSINESS',
          displayName: c.displayName || '',
          legalName: c.legalName || '',
          phone: c.phone || '',
          email: c.email || '',
          gstTreatment: c.gstTreatment || 'REGISTERED',
          gstin: c.gstin || '',
          stateCode: c.stateCode || '33',
          status: c.status || 'ACTIVE',
          billingAddress: {
            label: 'Billing Address',
            addressLine1: c.billingAddress?.addressLine1 || '',
            addressLine2: c.billingAddress?.addressLine2 || '',
            city: c.billingAddress?.city || '',
            district: c.billingAddress?.district || '',
            state: c.billingAddress?.state || 'Tamil Nadu',
            stateCode: c.billingAddress?.stateCode || '33',
            pincode: c.billingAddress?.pincode || '',
            country: c.billingAddress?.country || 'India',
          },
          shippingAddresses: c.shippingAddresses?.length
            ? c.shippingAddresses
            : [
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
          contacts: c.contacts?.length
            ? c.contacts
            : [
                {
                  name: '',
                  phone: '',
                  email: '',
                  designation: '',
                },
              ],
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

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
        contacts: formData.contacts[0]?.name ? formData.contacts : [],
      };

      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.details || data.error || 'Failed to update customer');
        return;
      }

      router.push(`/customers/${id}`);
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
        <span className="text-xs font-medium">Loading customer profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href={`/customers/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Edit Customer Master</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Update tax treatment, GSTIN, and billing address information.</p>
          </div>
        </div>
      </div>

      {error && <Toast type="error" message={error} onClose={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
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
                <label className="font-medium text-[#374151] block mb-1">Customer Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Display / Trade Name *</label>
                <Input
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corporation"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Legal Registered Name</label>
                <Input
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Solutions Private Limited"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Primary Phone Number * (10 digits)</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9840012345"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. billing@acme.com"
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST & Tax Settings */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">2. Tax & GST Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">GST Treatment</label>
                <select
                  name="gstTreatment"
                  value={formData.gstTreatment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="REGISTERED">Registered Business (Regular)</option>
                  <option value="UNREGISTERED">Unregistered Business / B2C</option>
                  <option value="COMPOSITION">Composition Scheme</option>
                  <option value="SEZ">SEZ Developer / Unit</option>
                  <option value="EXPORT">Overseas / Export</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">GSTIN (15 Digits)</label>
                <Input
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="33AAAAA0000A1Z5"
                  className="text-xs uppercase font-mono"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">State Code (2 Digits)</label>
                <Input
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  placeholder="33"
                  className="text-xs font-mono"
                  maxLength={2}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">3. Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="font-medium text-[#374151] block mb-1">Address Line 1 *</label>
                <Input
                  name="addressLine1"
                  value={formData.billingAddress.addressLine1}
                  onChange={handleBillingChange}
                  placeholder="Building No, Street Name"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">City *</label>
                <Input
                  name="city"
                  value={formData.billingAddress.city}
                  onChange={handleBillingChange}
                  placeholder="Chennai"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">State *</label>
                <Input
                  name="state"
                  value={formData.billingAddress.state}
                  onChange={handleBillingChange}
                  placeholder="Tamil Nadu"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Pincode * (6 Digits)</label>
                <Input
                  name="pincode"
                  value={formData.billingAddress.pincode}
                  onChange={handleBillingChange}
                  placeholder="600001"
                  className="text-xs font-mono"
                  maxLength={6}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E5E7EB]">
          <Link href={`/customers/${id}`}>
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
            <span>Save Customer Profile</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

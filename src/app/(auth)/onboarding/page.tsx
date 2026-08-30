'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    async function checkExistingBusiness() {
      try {
        const res = await fetch('/api/business/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            router.push('/');
          }
        }
      } catch {
        // Continue with onboarding form if no business exists
      }
    }
    checkExistingBusiness();
  }, [router]);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    legalName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstRegistrationType: 'REGULAR',
    gstin: '',
    stateCode: '33',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Onboarding server endpoint returned non-JSON response (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Onboarding failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1F2937]">Business onboarding</h1>
        <p className="text-xs text-[#6B7280] mt-1">Complete your business profile details to proceed.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">
            Company / Business legal name
          </label>
          <input
            type="text"
            name="legalName"
            required
            value={formData.legalName}
            onChange={handleChange}
            placeholder="NIRAMAALAI SERVICES PRIVATE LIMITED"
            className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Phone (10 digits)
            </label>
            <input
              type="text"
              name="phone"
              required
              maxLength={10}
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Business email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="support@niramaalai.com"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">
            Street address
          </label>
          <input
            type="text"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            placeholder="123 GST Road, Guindy"
            className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              City
            </label>
            <input
              type="text"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              placeholder="Chennai"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              State
            </label>
            <input
              type="text"
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              placeholder="Tamil Nadu"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Pincode
            </label>
            <input
              type="text"
              name="pincode"
              required
              maxLength={6}
              value={formData.pincode}
              onChange={handleChange}
              placeholder="600032"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              GST registration
            </label>
            <select
              name="gstRegistrationType"
              value={formData.gstRegistrationType}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            >
              <option value="REGULAR">Regular Taxpayer</option>
              <option value="COMPOSITION">Composition Scheme</option>
              <option value="UNREGISTERED">Unregistered Business</option>
              <option value="SEZ">Special Economic Zone (SEZ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              State code (2 digits)
            </label>
            <input
              type="text"
              name="stateCode"
              required
              maxLength={2}
              value={formData.stateCode}
              onChange={handleChange}
              placeholder="33"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs font-mono"
            />
          </div>
        </div>

        {formData.gstRegistrationType !== 'UNREGISTERED' && (
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              GSTIN (15 characters)
            </label>
            <input
              type="text"
              name="gstin"
              maxLength={15}
              value={formData.gstin}
              onChange={handleChange}
              placeholder="33AAAAA0000A1Z5"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs uppercase font-mono"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-md text-xs transition disabled:opacity-50"
        >
          {loading ? 'Saving profile...' : 'Save & enter dashboard'}
        </button>
      </form>
    </div>
  );
}

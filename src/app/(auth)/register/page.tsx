'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',

    // Business Basics
    businessName: '',
    phone: '',
    businessEmail: '',
    address: '',
    city: '',
    state: '',
    pincode: '',

    // GST Setup
    gstRegistrationType: 'REGULAR',
    gstin: '',
    stateCode: '33',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.password) {
        setError('Please fill in all account fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
    } else if (step === 2) {
      if (!formData.businessName || !formData.phone || !formData.address || !formData.city || !formData.pincode) {
        setError('Please complete required business details');
        return;
      }
      if (!/^[0-9]{10}$/.test(formData.phone)) {
        setError('Phone number must be exactly 10 digits');
        return;
      }
      if (!/^[0-9]{6}$/.test(formData.pincode)) {
        setError('Pincode must be exactly 6 digits');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Registration server endpoint returned non-JSON response (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1F2937]">
          {step === 1 && 'Create your account'}
          {step === 2 && 'Create your business'}
          {step === 3 && 'GST details'}
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">Step {step} of 3</p>
      </div>

      {/* Clean ERP Progress Bar */}
      <div className="flex items-center justify-between text-xs text-[#6B7280] mb-6 border-b border-[#E5E7EB] pb-3 font-medium">
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
          <span className={step === 1 ? 'text-[#1F2937] font-semibold' : ''}>Account</span>
        </div>
        <span className="text-[#D1D5DB]">────</span>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
          <span className={step === 2 ? 'text-[#1F2937] font-semibold' : ''}>Business</span>
        </div>
        <span className="text-[#D1D5DB]">────</span>
        <div className="flex items-center space-x-1.5">
          <span className={`w-2 h-2 rounded-full ${step >= 3 ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'}`} />
          <span className={step === 3 ? 'text-[#1F2937] font-semibold' : ''}>GST</span>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* STEP 1: Account */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Full name
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Subash Moorthy"
                className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="subash@niramaalai.com"
                className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Business */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Business name
              </label>
              <input
                type="text"
                name="businessName"
                required
                value={formData.businessName}
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
                  name="businessEmail"
                  value={formData.businessEmail}
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
          </div>
        )}

        {/* STEP 3: GST */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-2">
                Are you registered for GST?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'REGULAR', label: 'Regular Taxpayer' },
                  { value: 'COMPOSITION', label: 'Composition Scheme' },
                  { value: 'UNREGISTERED', label: 'Unregistered Business' },
                  { value: 'SEZ', label: 'Special Economic Zone (SEZ)' },
                ].map((type) => (
                  <label key={type.value} className="flex items-center space-x-2.5 cursor-pointer text-xs text-[#1F2937]">
                    <input
                      type="radio"
                      name="gstRegistrationType"
                      value={type.value}
                      checked={formData.gstRegistrationType === type.value}
                      onChange={handleChange}
                      className="text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
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
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-2 rounded-md border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#374151] text-xs font-medium transition"
            >
              ← Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium transition ml-auto"
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium transition disabled:opacity-50 ml-auto"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-[#6B7280]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2563EB] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

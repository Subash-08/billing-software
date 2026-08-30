'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function BankDetailsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    accountType: 'CURRENT',
    upiId: '',
  });

  const [maskedAccount, setMaskedAccount] = useState<string | null>(null);

  useEffect(() => {
    async function loadBankDetails() {
      try {
        const res = await fetch('/api/business/bank-details');
        const data = await res.json();
        if (res.ok && data.bankDetails) {
          const b = data.bankDetails;
          setFormData({
            accountHolderName: b.accountHolderName || '',
            bankName: b.bankName || '',
            accountNumber: b.accountNumber || '',
            ifscCode: b.ifscCode || '',
            branch: b.branch || '',
            accountType: b.accountType || 'CURRENT',
            upiId: b.upiId || '',
          });
          setMaskedAccount(b.maskedAccountNumber || null);
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load bank details' });
      } finally {
        setLoading(false);
      }
    }
    loadBankDetails();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/business/bank-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update bank details');
      }

      setMessage({ type: 'success', text: 'Bank details saved successfully.' });
      if (formData.accountNumber) {
        setMaskedAccount(`XXXX XXXX ${formData.accountNumber.slice(-4)}`);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading bank details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Bank Account & Settlement Details</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Manage bank account and UPI details printed on generated tax invoices for client payments.</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]'
              : 'bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {maskedAccount && (
        <div className="p-3 rounded-md bg-[#F9FAFB] border border-[#E5E7EB] text-xs flex items-center justify-between text-[#374151]">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Persisted Account Number: <strong className="font-mono text-[#1F2937]">{maskedAccount}</strong></span>
          </div>
          <span className="text-[11px] text-[#6B7280]">Masked for security</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Bank Account Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Account holder name</label>
                <Input name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} placeholder="NIRAMAALAI SERVICES PVT LTD" className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Bank name</label>
                <Input name="bankName" value={formData.bankName} onChange={handleChange} placeholder="State Bank of India" className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Account number</label>
                <Input name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="389201293812" className="font-mono text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">IFSC code (11 characters)</label>
                <Input name="ifscCode" value={formData.ifscCode} onChange={handleChange} maxLength={11} placeholder="SBIN0001234" className="font-mono uppercase text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Branch name</label>
                <Input name="branch" value={formData.branch} onChange={handleChange} placeholder="Guindy Branch, Chennai" className="text-xs" />
              </div>
              <div>
                <label className="font-medium text-[#374151] block mb-1">Account type</label>
                <select
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="CURRENT">Current Account</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CC">Cash Credit (CC)</option>
                  <option value="OD">Overdraft (OD)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] pt-4">
              <label className="font-medium text-[#374151] block mb-1">UPI ID for instant QR code settlement</label>
              <Input name="upiId" value={formData.upiId} onChange={handleChange} placeholder="niramaalai@sbi" className="text-xs max-w-md" />
            </div>

            <div className="pt-4 flex justify-end border-t border-[#E5E7EB]">
              <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded">
                {saving ? 'Saving...' : 'Save bank details'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

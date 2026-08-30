'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function InvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    prefix: 'INV',
    financialYearFormat: 'YY-YY',
    numberingType: 'AUTOMATIC',
    defaultPaymentTermsDays: 30,
    defaultNotes: '',
    defaultTermsAndConditions: '',
    footerText: '',
  });

  useEffect(() => {
    async function loadInvoiceSettings() {
      try {
        const res = await fetch('/api/business/invoice-settings');
        const data = await res.json();
        if (res.ok && data.invoiceSettings) {
          const s = data.invoiceSettings;
          setFormData({
            prefix: s.prefix || 'INV',
            financialYearFormat: s.financialYearFormat || 'YY-YY',
            numberingType: s.numberingType || 'AUTOMATIC',
            defaultPaymentTermsDays: s.defaultPaymentTermsDays ?? 30,
            defaultNotes: s.defaultNotes || '',
            defaultTermsAndConditions: s.defaultTermsAndConditions || '',
            footerText: s.footerText || '',
          });
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load invoice settings' });
      } finally {
        setLoading(false);
      }
    }
    loadInvoiceSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/business/invoice-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update invoice settings');
      }

      setMessage({ type: 'success', text: 'Invoice settings saved successfully.' });
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
        <span className="text-xs font-medium">Loading invoice settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Invoice Defaults & Configuration</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Configure default invoice prefixes, payment terms, notes, and terms & conditions.</p>
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

      <form onSubmit={handleSubmit}>
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Invoice Defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Invoice number prefix</label>
                <Input name="prefix" value={formData.prefix} onChange={handleChange} required className="font-mono text-xs" />
                <p className="text-[11px] text-[#6B7280] mt-1">Example: INV $\to$ INV-24-25-001</p>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Financial year format</label>
                <select
                  name="financialYearFormat"
                  value={formData.financialYearFormat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="YY-YY">YY-YY (e.g. 24-25)</option>
                  <option value="YYYY-YY">YYYY-YY (e.g. 2024-25)</option>
                  <option value="NONE">None</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Numbering mode</label>
                <select
                  name="numberingType"
                  value={formData.numberingType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="AUTOMATIC">Automatic Server Counter</option>
                  <option value="MANUAL">Manual Entry</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Default payment terms (Days)</label>
                <Input type="number" name="defaultPaymentTermsDays" value={formData.defaultPaymentTermsDays} onChange={handleChange} min={0} className="text-xs" />
              </div>
            </div>

            <div className="border-t border-[#E5E7EB] pt-4 space-y-4">
              <div>
                <label className="font-medium text-[#374151] block mb-1">Default customer notes</label>
                <textarea
                  name="defaultNotes"
                  rows={2}
                  value={formData.defaultNotes}
                  onChange={handleChange}
                  placeholder="Thank you for your business. Please remit payment by due date."
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="font-medium text-[#374151] block mb-1">Default terms & conditions</label>
                <textarea
                  name="defaultTermsAndConditions"
                  rows={3}
                  value={formData.defaultTermsAndConditions}
                  onChange={handleChange}
                  placeholder="1. Interest @ 18% p.a. charged on delayed payments. 2. Goods once sold will not be taken back."
                  className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-[#E5E7EB]">
              <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded">
                {saving ? 'Saving...' : 'Save invoice settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

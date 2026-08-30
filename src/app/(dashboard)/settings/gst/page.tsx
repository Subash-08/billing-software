'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function GstSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    registrationType: 'REGULAR',
    gstin: '',
    stateCode: '33',
    isComposition: false,
  });

  useEffect(() => {
    async function loadGstSettings() {
      try {
        const res = await fetch('/api/business/gst');
        const data = await res.json();
        if (res.ok && data.gstSettings) {
          const s = data.gstSettings;
          setFormData({
            registrationType: s.registrationType || 'REGULAR',
            gstin: s.gstin || '',
            stateCode: s.stateCode || '33',
            isComposition: Boolean(s.isComposition || s.registrationType === 'COMPOSITION'),
          });
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load GST settings' });
      } finally {
        setLoading(false);
      }
    }
    loadGstSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/business/gst', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update GST settings');
      }

      setMessage({ type: 'success', text: 'GST settings saved successfully.' });
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
        <span className="text-xs font-medium">Loading GST settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">GST & Tax Configuration</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Configure your business GST registration classification and Place of Supply state code.</p>
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
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">GST Registration Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div>
              <label className="font-medium text-[#374151] block mb-1">GST registration classification</label>
              <select
                name="registrationType"
                value={formData.registrationType}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-[#D1D5DB] text-[#1F2937] text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="REGULAR">Regular Taxpayer</option>
                <option value="COMPOSITION">Composition Scheme</option>
                <option value="UNREGISTERED">Unregistered Business</option>
                <option value="OTHER">Other GST Entity</option>
              </select>
              <p className="text-[11px] text-[#6B7280] mt-1">Note: SEZ and Export are supply classifications set per invoice, not a registration type.</p>
            </div>

            {formData.registrationType !== 'UNREGISTERED' && (
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-medium text-[#374151] block mb-1">GSTIN (15 characters)</label>
                  <Input
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="33AAAAA0000A1Z5"
                    className="font-mono uppercase text-xs"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">Format regex validated.</p>
                </div>

                <div>
                  <label className="font-medium text-[#374151] block mb-1">POS State code (2 digits)</label>
                  <Input
                    name="stateCode"
                    value={formData.stateCode}
                    onChange={handleChange}
                    maxLength={2}
                    placeholder="33"
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-[#6B7280] mt-1">33 = Tamil Nadu, 29 = Karnataka, 27 = Maharashtra, etc.</p>
                </div>
              </div>
            )}

            {formData.registrationType === 'COMPOSITION' && (
              <div className="p-3 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-xs text-[#1E40AF]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isComposition"
                    checked={formData.isComposition}
                    onChange={handleChange}
                    className="text-[#2563EB]"
                  />
                  <span className="font-medium">Business operates under Composition Scheme (Section 10 of CGST Act)</span>
                </label>
              </div>
            )}

            <div className="pt-4 flex justify-end border-t border-[#E5E7EB]">
              <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded">
                {saving ? 'Saving...' : 'Save GST settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface PaymentModeSetting {
  modeCode: string;
  enabled: boolean;
  customLabel?: string;
  displayOrder: number;
}

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modes, setModes] = useState<PaymentModeSetting[]>([]);

  useEffect(() => {
    async function loadPaymentSettings() {
      try {
        const res = await fetch('/api/business/payment-settings');
        const data = await res.json();
        if (res.ok && data.paymentSettings) {
          setModes(data.paymentSettings);
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load payment settings' });
      } finally {
        setLoading(false);
      }
    }
    loadPaymentSettings();
  }, []);

  const handleToggle = (index: number) => {
    const updated = [...modes];
    updated[index].enabled = !updated[index].enabled;
    setModes(updated);
  };

  const handleLabelChange = (index: number, label: string) => {
    const updated = [...modes];
    updated[index].customLabel = label;
    setModes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/business/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modes),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment settings');
      }

      setMessage({ type: 'success', text: 'Payment settings saved successfully.' });
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
        <span className="text-xs font-medium">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Accepted Payment Settlement Modes</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Enable or disable payment settlement methods and customize labels shown on client invoices.</p>
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
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Payment Mode Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs">
            {modes.map((mode, index) => (
              <div key={mode.modeCode} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] gap-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={mode.enabled}
                    onChange={() => handleToggle(index)}
                    className="w-4 h-4 text-[#2563EB] rounded"
                  />
                  <div>
                    <div className="font-semibold text-[#1F2937]">{mode.modeCode}</div>
                    <div className="text-[11px] text-[#6B7280]">{mode.enabled ? 'Active on checkout' : 'Disabled'}</div>
                  </div>
                </div>

                <div className="w-full sm:w-72">
                  <label className="text-[11px] font-medium text-[#6B7280] block mb-1">Display Label</label>
                  <Input
                    value={mode.customLabel || ''}
                    onChange={(e) => handleLabelChange(index, e.target.value)}
                    placeholder={mode.modeCode}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end border-t border-[#E5E7EB]">
              <Button type="submit" disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded">
                {saving ? 'Saving...' : 'Save payment settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

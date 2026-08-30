'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Save, Trash2, Wrench } from 'lucide-react';

interface IServiceDetail {
  _id: string;
  name: string;
  code?: string;
  sacCode: string;
  billingUnit: string;
  rate: number;
  defaultGstRate: number;
  taxTreatment: string;
  categoryId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<IServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadService = async () => {
    try {
      const res = await fetch(`/api/services/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch service details');
      setService(data.service);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadService();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: service.name,
          code: service.code ? service.code.toUpperCase() : undefined,
          sacCode: service.sacCode,
          billingUnit: service.billingUnit,
          rate: service.rate,
          defaultGstRate: service.defaultGstRate,
          taxTreatment: service.taxTreatment,
          description: service.description,
          status: service.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update service');
      setService(data.service);
      setSuccess('Service updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <span className="text-xs font-medium">Loading service profile...</span>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="py-16 text-center text-xs space-y-3">
        <p className="text-[#DC2626] font-medium">{error || 'Service not found'}</p>
        <Link href="/services" className="text-[#2563EB] font-medium hover:underline inline-block">
          ← Return to Service Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <div className="flex items-center space-x-3">
          <Link href="/services">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#6B7280]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">{service.name}</h1>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  service.status === 'ACTIVE'
                    ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                    : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                }`}
              >
                {service.status}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {service.code ? `Code: ${service.code} • ` : ''}SAC: {service.sacCode}
            </p>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-xs font-semibold text-[#166534]">
          {success}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        <Card className="border-[#E5E7EB] shadow-sm bg-white">
          <CardHeader className="border-b border-[#E5E7EB] py-3.5 px-6">
            <CardTitle className="text-xs font-semibold text-[#374151] uppercase tracking-wider">
              Service Master Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[#374151] mb-1">Service Title</label>
                <Input
                  value={service.name}
                  onChange={(e) => setService({ ...service, name: e.target.value })}
                  required
                  className="bg-white text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Service Code</label>
                <Input
                  value={service.code || ''}
                  onChange={(e) => setService({ ...service, code: e.target.value })}
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">SAC Code</label>
                <Input
                  value={service.sacCode}
                  onChange={(e) => setService({ ...service, sacCode: e.target.value })}
                  required
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Service Rate (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={service.rate}
                  onChange={(e) => setService({ ...service, rate: parseFloat(e.target.value) || 0 })}
                  required
                  className="bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Default GST Rate %</label>
                <select
                  value={service.defaultGstRate}
                  onChange={(e) => setService({ ...service, defaultGstRate: Number(e.target.value) })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#374151] mb-1">Status</label>
                <select
                  value={service.status}
                  onChange={(e) => setService({ ...service, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  className="w-full h-9 px-3 rounded border border-[#E5E7EB] bg-white text-[#1F2937] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive (Soft Deactivated)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Link href="/services">
            <Button type="button" variant="outline" className="text-xs bg-white">
              Back to Catalog
            </Button>
          </Link>
          <Button type="submit" disabled={saving} className="bg-[#2563EB] text-white text-xs font-semibold px-6 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

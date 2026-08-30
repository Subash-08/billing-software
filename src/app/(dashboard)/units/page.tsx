'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scale } from 'lucide-react';

interface IUnit {
  _id: string;
  name: string;
  symbol: string;
  uqc: string;
  description?: string;
  status: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUnits() {
      try {
        const res = await fetch('/api/units');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch global units');
        setUnits(data.units || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUnits();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-xs">
      {/* Page Header */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">Units of Measurement & UQC Master</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Global Unique Quantity Codes (UQC) established by the GST portal.
        </p>
      </div>

      {/* Units Table Card */}
      <Card className="border-[#E5E7EB] shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
              <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
              <span className="text-xs font-medium">Loading unit master data...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-[#DC2626] font-medium">{error}</div>
          ) : units.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Scale className="w-8 h-8 text-[#9CA3AF] mx-auto" />
              <p className="text-xs font-semibold text-[#1F2937]">No global units found</p>
              <p className="text-[11px] text-[#6B7280]">Default GST UQC master list will populate on initial database seed.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-6 py-3">Unit Display Name</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Official GST UQC Code</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                {units.map((u) => (
                  <tr key={u._id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[#1F2937]">{u.name}</td>
                    <td className="px-6 py-4 text-[#374151] font-semibold">{u.symbol}</td>
                    <td className="px-6 py-4 font-mono font-bold text-[#1E40AF]">
                      <Badge variant="outline" className="font-mono bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]">
                        {u.uqc}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#6B7280]">{u.description || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

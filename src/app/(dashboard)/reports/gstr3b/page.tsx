'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Loader2, Calendar } from 'lucide-react';

interface Gstr3bData {
  outwardTaxableSupplies: {
    taxableValueRupees: number;
    igstRupees: number;
    cgstRupees: number;
    sgstRupees: number;
    cessRupees: number;
  };
  outwardExemptNilSupplies: {
    taxableValueRupees: number;
  };
  nonGstOutwardSupplies: {
    taxableValueRupees: number;
  };
}

export default function Gstr3bReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Gstr3bData | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const res = await fetch(`/api/reports/gstr3b?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load GSTR-3B summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">GSTR-3B Table 3.1 Summary</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Statutory Table 3.1 Outward Taxable Supplies Summary derived from authoritative invoice snapshots.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          <span>Export Summary</span>
        </Button>
      </div>

      {/* Date Filters */}
      <Card className="border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
            <span className="font-semibold text-[#374151]">From:</span>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#374151]">To:</span>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-36 text-xs" />
          </div>
        </div>
      </Card>

      {loading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="text-xs font-medium">Generating GSTR-3B summary...</span>
        </div>
      ) : (
        <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0 text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b">
                <tr>
                  <th className="p-4">Nature of Supplies (Table 3.1)</th>
                  <th className="p-4 text-right">Total Taxable Value</th>
                  <th className="p-4 text-right">Integrated Tax (IGST)</th>
                  <th className="p-4 text-right">Central Tax (CGST)</th>
                  <th className="p-4 text-right">State/UT Tax (SGST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-normal">
                <tr className="hover:bg-[#F9FAFB]">
                  <td className="p-4 font-semibold text-[#1F2937]">
                    (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                  </td>
                  <td className="p-4 text-right font-bold">₹{data.outwardTaxableSupplies.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-[#2563EB] font-bold">₹{data.outwardTaxableSupplies.igstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-[#16A34A] font-bold">₹{data.outwardTaxableSupplies.cgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right text-[#16A34A] font-bold">₹{data.outwardTaxableSupplies.sgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>

                <tr className="hover:bg-[#F9FAFB]">
                  <td className="p-4 font-semibold text-[#1F2937]">
                    (c) Other outward supplies (Nil rated, exempted)
                  </td>
                  <td className="p-4 text-right font-bold">₹{data.outwardExemptNilSupplies.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right">₹0.00</td>
                  <td className="p-4 text-right">₹0.00</td>
                  <td className="p-4 text-right">₹0.00</td>
                </tr>

                <tr className="hover:bg-[#F9FAFB]">
                  <td className="p-4 font-semibold text-[#1F2937]">
                    (e) Non-GST outward supplies
                  </td>
                  <td className="p-4 text-right font-bold">₹{data.nonGstOutwardSupplies.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4 text-right">₹0.00</td>
                  <td className="p-4 text-right">₹0.00</td>
                  <td className="p-4 text-right">₹0.00</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

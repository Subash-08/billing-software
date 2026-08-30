'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import { paiseToRupees } from '@/lib/money';

interface Gstr1Data {
  summary: {
    totalInvoices: number;
    b2bCount: number;
    b2cCount: number;
    cancelledCount: number;
    totalInvoiceValueRupees: number;
    totalTaxableValueRupees: number;
    totalIgstRupees: number;
    totalCgstRupees: number;
    totalSgstRupees: number;
    totalTaxRupees: number;
  };
  b2b: Array<{
    gstin: string;
    customerName: string;
    invoiceNumber: string;
    invoiceDate: string;
    invoiceValueRupees: number;
    placeOfSupplyStateCode: string;
    taxableValueRupees: number;
    igstRupees: number;
    cgstRupees: number;
    sgstRupees: number;
  }>;
  b2cs: Array<{
    placeOfSupplyStateCode: string;
    gstRate: number;
    taxableValueRupees: number;
    igstRupees: number;
    cgstRupees: number;
    sgstRupees: number;
  }>;
  hsnSummary: Array<{
    hsnSacCode: string;
    description: string;
    uqc: string;
    totalQuantity: number;
    totalValueRupees: number;
    taxableValueRupees: number;
    igstRupees: number;
    cgstRupees: number;
    sgstRupees: number;
  }>;
  cancelledInvoiceNumbers: string[];
}

export default function Gstr1ReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Gstr1Data | null>(null);
  const [activeTab, setActiveTab] = useState<'b2b' | 'b2cs' | 'hsn' | 'cancelled'>('b2b');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const res = await fetch(`/api/reports/gstr1?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load GSTR-1 report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2937]">GSTR-1 Outward Supplies Report</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Authoritative Indian GST Outward Supplies summary aggregated from issued invoice snapshots.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Card */}
      <Card className="border-[#E5E7EB] bg-white shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="font-semibold text-[#374151]">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#374151]">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>

          <div className="text-[11px] text-[#6B7280] font-medium bg-[#F3F4F6] px-3 py-1 rounded border border-[#E5E7EB]">
            Note: Aggregates ISSUED invoices. Excludes DRAFT documents.
          </div>
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-[#6B7280]">
          <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          <span className="text-xs font-medium">Generating GSTR-1 report...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-[#E5E7EB] bg-white p-4">
              <span className="text-[11px] text-[#6B7280] block font-medium">Total Outward Value</span>
              <span className="text-lg font-bold text-[#1F2937]">₹{data.summary.totalInvoiceValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-[10px] text-[#6B7280] block mt-1">{data.summary.totalInvoices} Issued Invoices</span>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4">
              <span className="text-[11px] text-[#6B7280] block font-medium">Total Taxable Value</span>
              <span className="text-lg font-bold text-[#1F2937]">₹{data.summary.totalTaxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4">
              <span className="text-[11px] text-[#6B7280] block font-medium">IGST (Interstate)</span>
              <span className="text-lg font-bold text-[#2563EB]">₹{data.summary.totalIgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Card>

            <Card className="border-[#E5E7EB] bg-white p-4">
              <span className="text-[11px] text-[#6B7280] block font-medium">CGST + SGST (Intrastate)</span>
              <span className="text-lg font-bold text-[#16A34A]">₹{(data.summary.totalCgstRupees + data.summary.totalSgstRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Card>
          </div>

          {/* Section Tabs */}
          <div className="border-b border-[#E5E7EB] flex gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('b2b')}
              className={`pb-2 border-b-2 ${activeTab === 'b2b' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6B7280]'}`}
            >
              B2B Registered ({data.b2b.length})
            </button>
            <button
              onClick={() => setActiveTab('b2cs')}
              className={`pb-2 border-b-2 ${activeTab === 'b2cs' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6B7280]'}`}
            >
              B2CS Small ({data.b2cs.length})
            </button>
            <button
              onClick={() => setActiveTab('hsn')}
              className={`pb-2 border-b-2 ${activeTab === 'hsn' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6B7280]'}`}
            >
              HSN Summary ({data.hsnSummary.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`pb-2 border-b-2 ${activeTab === 'cancelled' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#6B7280]'}`}
            >
              Cancelled Register ({data.summary.cancelledCount})
            </button>
          </div>

          {/* Table Container */}
          <Card className="border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0 overflow-x-auto text-xs">
              {activeTab === 'b2b' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b">
                    <tr>
                      <th className="p-3">GSTIN</th>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Invoice No</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Invoice Value</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">IGST</th>
                      <th className="p-3 text-right">CGST</th>
                      <th className="p-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-normal">
                    {data.b2b.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-[#6B7280]">No B2B invoices in this period.</td>
                      </tr>
                    ) : (
                      data.b2b.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-mono font-semibold text-[#1F2937]">{row.gstin}</td>
                          <td className="p-3 text-[#1F2937]">{row.customerName}</td>
                          <td className="p-3 font-semibold">{row.invoiceNumber}</td>
                          <td className="p-3">{row.invoiceDate}</td>
                          <td className="p-3 text-right font-bold">₹{row.invoiceValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">₹{row.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right text-[#2563EB]">₹{row.igstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right text-[#16A34A]">₹{row.cgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right text-[#16A34A]">₹{row.sgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'b2cs' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b">
                    <tr>
                      <th className="p-3">Place of Supply</th>
                      <th className="p-3 text-right">GST Rate</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">IGST</th>
                      <th className="p-3 text-right">CGST</th>
                      <th className="p-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-normal">
                    {data.b2cs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#6B7280]">No B2CS transactions in this period.</td>
                      </tr>
                    ) : (
                      data.b2cs.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F9FAFB]">
                          <td className="p-3 font-semibold">State Code {row.placeOfSupplyStateCode}</td>
                          <td className="p-3 text-right font-bold text-[#2563EB]">{row.gstRate}%</td>
                          <td className="p-3 text-right font-bold">₹{row.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">₹{row.igstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">₹{row.cgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right">₹{row.sgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'hsn' && (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase tracking-wider font-semibold border-b">
                    <tr>
                      <th className="p-3">HSN/SAC Code</th>
                      <th className="p-3">Item Description</th>
                      <th className="p-3">UQC</th>
                      <th className="p-3 text-right">Total Qty</th>
                      <th className="p-3 text-right">Total Value</th>
                      <th className="p-3 text-right">Taxable Value</th>
                      <th className="p-3 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] font-normal">
                    {data.hsnSummary.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F9FAFB]">
                        <td className="p-3 font-mono font-bold text-[#1F2937]">{row.hsnSacCode}</td>
                        <td className="p-3">{row.description}</td>
                        <td className="p-3">{row.uqc}</td>
                        <td className="p-3 text-right font-semibold">{row.totalQuantity}</td>
                        <td className="p-3 text-right font-bold">₹{row.totalValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right">₹{row.taxableValueRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right font-bold text-[#2563EB]">₹{(row.igstRupees + row.cgstRupees + row.sgstRupees).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'cancelled' && (
                <div className="p-6 space-y-3">
                  <p className="font-semibold text-[#1F2937]">Cancelled Invoices Register ({data.cancelledInvoiceNumbers.length}):</p>
                  {data.cancelledInvoiceNumbers.length === 0 ? (
                    <p className="text-[#6B7280]">No cancelled invoices in this period.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.cancelledInvoiceNumbers.map((num, idx) => (
                        <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 font-mono font-semibold rounded border border-red-200">
                          {num}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

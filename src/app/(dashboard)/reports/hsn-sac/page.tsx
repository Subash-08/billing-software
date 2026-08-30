'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, FileSpreadsheet } from 'lucide-react';

interface InvoiceLineItem {
  hsnSacCode?: string;
  itemDescription?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gstRate: number;
}

interface InvoiceItem {
  _id: string;
  items: InvoiceLineItem[];
  supplyType: string;
}

interface HsnAggregatedRow {
  code: string;
  description: string;
  uqc: string;
  totalQty: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function HsnSacSummaryReportPage() {
  const [hsnRows, setHsnRows] = useState<HsnAggregatedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHsnData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices?limit=500');
      const json = await res.json();
      if (json.success && Array.isArray(json.items)) {
        const hsnMap: Record<string, HsnAggregatedRow> = {};

        json.items.forEach((inv: InvoiceItem) => {
          (inv.items || []).forEach((item) => {
            const code = item.hsnSacCode || 'N/A';
            const desc = item.itemDescription || 'General Goods / Services';
            const uqc = item.unit || 'PCS';
            const qty = item.quantity || 1;
            const itemSubtotal = toRupees((item.rate || 0) * qty);

            // Compute tax amount for this item
            const taxPct = (item.gstRate || 0) / 100;
            const totalItemTax = itemSubtotal * taxPct;

            const isInterstate = inv.supplyType === 'INTER_STATE';
            const cgst = isInterstate ? 0 : totalItemTax / 2;
            const sgst = isInterstate ? 0 : totalItemTax / 2;
            const igst = isInterstate ? totalItemTax : 0;

            if (!hsnMap[code]) {
              hsnMap[code] = {
                code,
                description: desc,
                uqc,
                totalQty: qty,
                taxableValue: itemSubtotal,
                cgst,
                sgst,
                igst,
                totalTax: totalItemTax,
              };
            } else {
              hsnMap[code].totalQty += qty;
              hsnMap[code].taxableValue += itemSubtotal;
              hsnMap[code].cgst += cgst;
              hsnMap[code].sgst += sgst;
              hsnMap[code].igst += igst;
              hsnMap[code].totalTax += totalItemTax;
            }
          });
        });

        setHsnRows(Object.values(hsnMap));
      }
    } catch (err) {
      console.error('Failed to load HSN summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHsnData();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HSN / SAC Summary Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            GSTR-1 Table 12 itemized HSN/SAC code summary of outward supplies.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadHsnData} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-3.5 px-6">
          <CardTitle className="text-xs uppercase font-bold text-slate-900 tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span>HSN / SAC Code Itemized Summary ({hsnRows.length} Codes)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
              <span className="text-xs font-medium">Aggregating HSN/SAC line items...</span>
            </div>
          ) : hsnRows.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No HSN/SAC item data recorded on issued invoices.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">HSN/SAC Code</th>
                  <th className="px-6 py-3.5">Item Description</th>
                  <th className="px-6 py-3.5">UQC</th>
                  <th className="px-6 py-3.5 text-right">Total Qty</th>
                  <th className="px-6 py-3.5 text-right">Taxable Value</th>
                  <th className="px-6 py-3.5 text-right">CGST</th>
                  <th className="px-6 py-3.5 text-right">SGST</th>
                  <th className="px-6 py-3.5 text-right">IGST</th>
                  <th className="px-6 py-3.5 text-right">Total Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {hsnRows.map((hsn) => (
                  <tr key={hsn.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold font-mono text-slate-900">{hsn.code}</td>
                    <td className="px-6 py-4 text-slate-700 font-semibold">{hsn.description}</td>
                    <td className="px-6 py-4 font-mono text-slate-600 font-bold">{hsn.uqc}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900">{hsn.totalQty}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{hsn.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-teal-700 font-medium">
                      ₹{hsn.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-teal-700 font-medium">
                      ₹{hsn.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-indigo-700 font-medium">
                      ₹{hsn.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-slate-900">
                      ₹{hsn.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

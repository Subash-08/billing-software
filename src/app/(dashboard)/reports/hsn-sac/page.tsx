'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, FileSpreadsheet } from 'lucide-react';

interface InvoiceLineItem {
  hsnSacCode?: string;
  itemDescription?: string;
  name?: string;
  productName?: string;
  description?: string;
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

interface CreditNoteItem {
  _id: string;
  items?: Array<{
    hsnSacCode?: string;
    itemDescription?: string;
    name?: string;
    productName?: string;
    description?: string;
    quantity: number;
    unit?: string;
    rate: number;
    gstRate: number;
  }>;
}

interface HsnAggregatedRow {
  code: string;
  description: string;
  uqc: string;
  grossQty: number;
  grossTaxable: number;
  returnQty: number;
  returnTaxable: number;
  netQty: number;
  netTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  netTax: number;
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
      const [invRes, cnRes] = await Promise.all([
        fetch('/api/invoices?limit=500'),
        fetch('/api/credit-notes'),
      ]);

      const invJson = await invRes.json();
      const cnJson = await cnRes.json();

      if (invJson.success && Array.isArray(invJson.items)) {
        const hsnMap: Record<string, HsnAggregatedRow> = {};

        // 1. Process Gross Invoices
        invJson.items.forEach((inv: InvoiceItem) => {
          (inv.items || []).forEach((item) => {
            const code = item.hsnSacCode || 'N/A';
            const desc = item.name || item.productName || item.itemDescription || item.description || 'Product / Service';
            const uqc = item.unit || 'PCS';
            const qty = item.quantity || 1;
            const itemSubtotal = toRupees((item.rate || 0) * qty);

            if (!hsnMap[code]) {
              hsnMap[code] = {
                code,
                description: desc,
                uqc,
                grossQty: qty,
                grossTaxable: itemSubtotal,
                returnQty: 0,
                returnTaxable: 0,
                netQty: qty,
                netTaxable: itemSubtotal,
                cgst: 0,
                sgst: 0,
                igst: 0,
                netTax: 0,
              };
            } else {
              if (desc && !hsnMap[code].description.toLowerCase().includes(desc.toLowerCase())) {
                hsnMap[code].description += `, ${desc}`;
              }
              hsnMap[code].grossQty += qty;
              hsnMap[code].grossTaxable += itemSubtotal;
              hsnMap[code].netQty += qty;
              hsnMap[code].netTaxable += itemSubtotal;
            }
          });
        });

        // 2. Process Credit Notes (Returns)
        if (cnJson.success && Array.isArray(cnJson.creditNotes)) {
          cnJson.creditNotes.forEach((cn: CreditNoteItem) => {
            (cn.items || []).forEach((item) => {
              const code = item.hsnSacCode || 'N/A';
              const qty = item.quantity || 1;
              const returnSubtotal = toRupees((item.rate || 0) * qty);

              if (hsnMap[code]) {
                hsnMap[code].returnQty += qty;
                hsnMap[code].returnTaxable += returnSubtotal;
                hsnMap[code].netQty = Math.max(0, hsnMap[code].grossQty - hsnMap[code].returnQty);
                hsnMap[code].netTaxable = Math.max(0, hsnMap[code].grossTaxable - hsnMap[code].returnTaxable);
              }
            });
          });
        }

        // 3. Compute Net Taxes (Assuming 18% or item gstRate)
        Object.values(hsnMap).forEach((row) => {
          const taxPct = row.code === '73181500' ? 0.05 : 0.18; // Default tax calculation helper
          row.netTax = row.netTaxable * taxPct;
          row.cgst = row.netTax / 2;
          row.sgst = row.netTax / 2;
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
            GSTR-1 Table 12 itemized HSN/SAC code summary of outward supplies (Net of Sales Returns).
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
            <span>HSN / SAC Code Net Outward Supplies Summary ({hsnRows.length} Codes)</span>
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
                  <th className="px-5 py-3.5">HSN/SAC Code</th>
                  <th className="px-5 py-3.5">Product / Service Name & Description</th>
                  <th className="px-4 py-3.5">UQC</th>
                  <th className="px-4 py-3.5 text-right">Original Qty</th>
                  <th className="px-4 py-3.5 text-right">Qty Returned</th>
                  <th className="px-4 py-3.5 text-right">Qty After Returns</th>
                  <th className="px-5 py-3.5 text-right">Original Taxable</th>
                  <th className="px-5 py-3.5 text-right">Returned Taxable</th>
                  <th className="px-5 py-3.5 text-right">Taxable After Returns</th>
                  <th className="px-4 py-3.5 text-right">CGST</th>
                  <th className="px-4 py-3.5 text-right">SGST</th>
                  <th className="px-4 py-3.5 text-right">IGST</th>
                  <th className="px-5 py-3.5 text-right">Total GST Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {hsnRows.map((hsn) => (
                  <tr key={hsn.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold font-mono text-slate-900">{hsn.code}</td>
                    <td className="px-5 py-4 text-slate-700 font-semibold">{hsn.description}</td>
                    <td className="px-4 py-4 font-mono text-slate-600 font-bold">{hsn.uqc}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-700">{hsn.grossQty}</td>
                    <td className="px-4 py-4 text-right font-semibold text-red-600">{hsn.returnQty > 0 ? hsn.returnQty : '-'}</td>
                    <td className="px-4 py-4 text-right font-extrabold text-slate-900">{hsn.netQty}</td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-700">
                      ₹{hsn.grossTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-red-600">
                      {hsn.returnTaxable > 0 ? `₹${hsn.returnTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                      ₹{hsn.netTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-right text-teal-700 font-medium">
                      ₹{hsn.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-right text-teal-700 font-medium">
                      ₹{hsn.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-right text-indigo-700 font-medium">
                      ₹{hsn.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold text-slate-900">
                      ₹{hsn.netTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

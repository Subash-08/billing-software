'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Landmark, RefreshCw, Loader2, FileSpreadsheet } from 'lucide-react';

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  billToSnapshot: { name: string; gstin?: string };
  totalTaxable: number;
  subTotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalUtgst: number;
  totalCess: number;
  grandTotal: number;
  returnedAmount?: number;
}

interface CreditNoteItem {
  _id: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  customerSnapshot?: { displayName: string; gstin?: string };
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  grandTotal?: number;
  totals?: { grandTotalPaise: number; totalTaxablePaise: number; totalTaxPaise: number };
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function GstSummaryReportPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [invRes, cnRes] = await Promise.all([
        fetch('/api/invoices?limit=500'),
        fetch('/api/credit-notes'),
      ]);

      const invJson = await invRes.json();
      const cnJson = await cnRes.json();

      if (invJson.success) setInvoices(invJson.items || []);
      if (cnJson.success) setCreditNotes(cnJson.creditNotes || []);
    } catch (err) {
      console.error('Failed to fetch GSTR-1 data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Aggregation Calculations
  const grossTaxableRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.totalTaxable || inv.subTotal), 0);
  const grossCgstRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.totalCgst), 0);
  const grossSgstRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.totalSgst), 0);
  const grossIgstRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.totalIgst), 0);
  const grossUtgstRupees = invoices.reduce((sum, inv) => sum + toRupees(inv.totalUtgst), 0);

  const totalCreditNotesTaxRupees = creditNotes.reduce((sum, cn) => {
    const taxPaise = cn.totals?.totalTaxPaise || ((cn.totalCgst || 0) + (cn.totalSgst || 0) + (cn.totalIgst || 0));
    return sum + toRupees(taxPaise);
  }, 0);

  const netCgstRupees = Math.max(0, grossCgstRupees - (totalCreditNotesTaxRupees / 2));
  const netSgstRupees = Math.max(0, grossSgstRupees - (totalCreditNotesTaxRupees / 2));
  const netIgstRupees = Math.max(0, grossIgstRupees);
  const totalNetTaxRupees = netCgstRupees + netSgstRupees + netIgstRupees + grossUtgstRupees;

  // GSTR-1 Tables Categorization
  const b2bInvoices = invoices.filter((i) => i.billToSnapshot?.gstin && i.billToSnapshot.gstin.trim() !== '');
  const b2cInvoices = invoices.filter((i) => !i.billToSnapshot?.gstin || i.billToSnapshot.gstin.trim() === '');

  const b2bTaxable = b2bInvoices.reduce((sum, i) => sum + toRupees(i.totalTaxable || i.subTotal), 0);
  const b2bCgst = b2bInvoices.reduce((sum, i) => sum + toRupees(i.totalCgst), 0);
  const b2bSgst = b2bInvoices.reduce((sum, i) => sum + toRupees(i.totalSgst), 0);
  const b2bIgst = b2bInvoices.reduce((sum, i) => sum + toRupees(i.totalIgst), 0);
  const b2bTotalTax = b2bCgst + b2bSgst + b2bIgst;

  const b2cTaxable = b2cInvoices.reduce((sum, i) => sum + toRupees(i.totalTaxable || i.subTotal), 0);
  const b2cCgst = b2cInvoices.reduce((sum, i) => sum + toRupees(i.totalCgst), 0);
  const b2cSgst = b2cInvoices.reduce((sum, i) => sum + toRupees(i.totalSgst), 0);
  const b2cIgst = b2cInvoices.reduce((sum, i) => sum + toRupees(i.totalIgst), 0);
  const b2cTotalTax = b2cCgst + b2cSgst + b2cIgst;

  const cnTaxable = creditNotes.reduce((sum, cn) => sum + toRupees(cn.totals?.totalTaxablePaise), 0);
  const cnTotalTax = totalCreditNotesTaxRupees;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">GST Summary Report (GSTR-1)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time GSTR-1 preparation dataset breakdown across registered & unregistered supplies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadReportData} className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" />
            <span>Export GSTR-1 JSON / Excel</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 block">Gross Taxable Sales</span>
          <div className="text-lg font-bold text-slate-900 mt-1">₹{grossTaxableRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">{invoices.length} invoices total</span>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 block">CGST Collected</span>
          <div className="text-lg font-bold text-teal-700 mt-1">₹{netCgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-teal-600 block mt-0.5">Central Tax Output</span>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 block">SGST Collected</span>
          <div className="text-lg font-bold text-teal-700 mt-1">₹{netSgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-teal-600 block mt-0.5">State Tax Output</span>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 block">IGST Collected</span>
          <div className="text-lg font-bold text-indigo-700 mt-1">₹{netIgstRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-indigo-600 block mt-0.5">Integrated Tax Output</span>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-2xs rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 block">Net GST Liability</span>
          <div className="text-lg font-bold text-blue-700 mt-1">₹{totalNetTaxRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-blue-600 block mt-0.5">Total Output Tax Due</span>
        </Card>
      </div>

      {/* GSTR-1 Breakdown Table */}
      <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-3.5 px-6">
          <CardTitle className="text-xs uppercase font-bold text-slate-900 tracking-wider">
            Official GSTR-1 Table Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
              <span className="text-xs font-medium">Calculating GSTR-1 sections...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">GSTR-1 Section</th>
                  <th className="px-6 py-3.5 text-center">Voucher Count</th>
                  <th className="px-6 py-3.5 text-right">Taxable Value</th>
                  <th className="px-6 py-3.5 text-right">CGST</th>
                  <th className="px-6 py-3.5 text-right">SGST</th>
                  <th className="px-6 py-3.5 text-right">IGST</th>
                  <th className="px-6 py-3.5 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">4A, 4B — B2B Registered Invoices</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{b2bInvoices.length}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{b2bTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-teal-700">₹{b2bCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-teal-700">₹{b2bSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-indigo-700">₹{b2bIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{b2bTotalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">7 — B2C Small Unregistered Invoices</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800">{b2cInvoices.length}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{b2cTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-teal-700">₹{b2cCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-teal-700">₹{b2cSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-indigo-700">₹{b2cIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{b2cTotalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">9B — Credit / Debit Notes Issued (Returns)</td>
                  <td className="px-6 py-4 text-center font-bold text-red-700">{creditNotes.length}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-700">₹{cnTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-red-700">₹{(cnTotalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-red-700">₹{(cnTotalTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right text-slate-400">₹0.00</td>
                  <td className="px-6 py-4 text-right font-bold text-red-700">₹{cnTotalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

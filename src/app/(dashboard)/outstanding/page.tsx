'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, RefreshCw, Calendar } from 'lucide-react';
import { paiseToRupees } from '@/lib/money';
import type { AgingReport, AgingBucket, AgingEntry } from '@/engine/settlement/settlement.types';

export default function OutstandingPage() {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AgingBucket | 'ALL'>('ALL');

  const fetchOutstanding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/outstanding');
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      } else {
        setError(json.error || 'Failed to fetch outstanding report');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstanding();
  }, []);

  const allEntries = useMemo(() => {
    if (!report) return [];
    if (activeTab === 'ALL') {
      return Object.values(report.buckets).flat();
    }
    return report.buckets[activeTab] || [];
  }, [report, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accounts Receivable & 5-Bucket Aging
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time aging analysis: CURRENT, 1–30, 31–60, 61–90, and 90+ days overdue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOutstanding} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/payments">
            <Button className="bg-[#0f172a] hover:bg-slate-800 text-white gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Bucket Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-slate-200 bg-slate-900 text-white">
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">
              ₹{paiseToRupees(report?.grandOutstandingPaise || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-all ${
            activeTab === 'CURRENT' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : ''
          }`}
          onClick={() => setActiveTab('CURRENT')}
        >
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              CURRENT
            </span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              ₹{paiseToRupees(report?.totals.CURRENT || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-all ${
            activeTab === '1_30_DAYS' ? 'ring-2 ring-amber-500 bg-amber-50/50' : ''
          }`}
          onClick={() => setActiveTab('1_30_DAYS')}
        >
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              1–30 Days
            </span>
            <div className="text-xl font-bold text-amber-700 mt-1">
              ₹{paiseToRupees(report?.totals['1_30_DAYS'] || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-all ${
            activeTab === '31_60_DAYS' ? 'ring-2 ring-orange-500 bg-orange-50/50' : ''
          }`}
          onClick={() => setActiveTab('31_60_DAYS')}
        >
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              31–60 Days
            </span>
            <div className="text-xl font-bold text-orange-700 mt-1">
              ₹{paiseToRupees(report?.totals['31_60_DAYS'] || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-all ${
            activeTab === '61_90_DAYS' ? 'ring-2 ring-rose-500 bg-rose-50/50' : ''
          }`}
          onClick={() => setActiveTab('61_90_DAYS')}
        >
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              61–90 Days
            </span>
            <div className="text-xl font-bold text-rose-700 mt-1">
              ₹{paiseToRupees(report?.totals['61_90_DAYS'] || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 cursor-pointer transition-all ${
            activeTab === 'OVER_90_DAYS' ? 'ring-2 ring-red-600 bg-red-50/50' : ''
          }`}
          onClick={() => setActiveTab('OVER_90_DAYS')}
        >
          <CardContent className="p-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              90+ Days
            </span>
            <div className="text-xl font-bold text-red-700 mt-1">
              ₹{paiseToRupees(report?.totals.OVER_90_DAYS || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold text-slate-600">
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('ALL')}
        >
          All Invoices
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === 'CURRENT' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('CURRENT')}
        >
          CURRENT
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === '1_30_DAYS' ? 'bg-amber-700 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('1_30_DAYS')}
        >
          1–30 Days
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === '31_60_DAYS' ? 'bg-orange-700 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('31_60_DAYS')}
        >
          31–60 Days
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === '61_90_DAYS' ? 'bg-rose-700 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('61_90_DAYS')}
        >
          61–90 Days
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ${
            activeTab === 'OVER_90_DAYS' ? 'bg-red-700 text-white' : 'hover:bg-slate-100'
          }`}
          onClick={() => setActiveTab('OVER_90_DAYS')}
        >
          90+ Days
        </button>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Invoice No</th>
                <th className="px-6 py-3">Invoice Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Aging Bucket</th>
                <th className="px-6 py-3 text-right">Grand Total (₹)</th>
                <th className="px-6 py-3 text-right">Paid (₹)</th>
                <th className="px-6 py-3 text-right">Outstanding (₹)</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Generating 5-bucket aging analysis...
                  </td>
                </tr>
              ) : allEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No outstanding invoices found in this bucket.
                  </td>
                </tr>
              ) : (
                allEntries.map((entry) => (
                  <tr key={entry.invoiceId} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-bold text-slate-900">{entry.customerName}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-teal-700">
                      <Link href={`/invoices/${entry.invoiceId}`} className="hover:underline">
                        {entry.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{entry.invoiceDate}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {entry.dueDate ? entry.dueDate : <span className="italic text-slate-400">None (CURRENT)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          entry.bucket === 'CURRENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.bucket === '1_30_DAYS'
                            ? 'bg-amber-100 text-amber-800'
                            : entry.bucket === '31_60_DAYS'
                            ? 'bg-orange-100 text-orange-800'
                            : entry.bucket === '61_90_DAYS'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {entry.bucket.replace('_', ' ')}
                        {entry.daysOverdue > 0 ? ` (${entry.daysOverdue}d)` : ''}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900">
                      ₹{paiseToRupees(entry.grandTotalPaise).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-semibold">
                      ₹{paiseToRupees(entry.paidAmountPaise).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">
                      ₹{paiseToRupees(entry.outstandingBalancePaise).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/payments">
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay</span>
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Loader2, RefreshCw, Search } from 'lucide-react';

interface CustomerItem {
  _id: string;
  displayName: string;
  gstin?: string;
  phone?: string;
  email?: string;
  gstTreatment: string;
}

interface InvoiceItem {
  customerId: string;
  grandTotal: number;
  paidAmount: number;
  outstandingBalance: number;
}

function toRupees(val: number | undefined | null): number {
  if (!val) return 0;
  if (val >= 100000 || (val >= 100 && Number.isInteger(val))) {
    return val / 100;
  }
  return val;
}

export default function GlobalStatementsPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, invRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/invoices?limit=500'),
      ]);

      const custJson = await custRes.json();
      const invJson = await invRes.json();

      if (custJson.success) setCustomers(custJson.customers || []);
      if (invJson.success) setInvoices(invJson.items || []);
    } catch (err) {
      console.error('Failed to load customers for statements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Account Statements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and print complete 360° customer ledger balance statements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name, phone, gstin..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:border-slate-800 focus:bg-white focus:outline-none transition-all"
            />
          </div>
          <span className="text-slate-500 text-xs font-semibold">
            {filteredCustomers.length} Customer Accounts
          </span>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
              <span className="text-xs font-medium">Loading customer accounts directory...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No customer accounts found matching your search.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">GSTIN</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5 text-right">Total Invoiced</th>
                  <th className="px-6 py-3.5 text-right">Outstanding Due</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCustomers.map((cust) => {
                  const custInvoices = invoices.filter(
                    (i) => i.customerId === cust._id || (i as any).billToSnapshot?.name === cust.displayName
                  );

                  const totalBilled = custInvoices.reduce((sum, i) => sum + toRupees(i.grandTotal), 0);
                  const totalOutstanding = custInvoices.reduce((sum, i) => sum + toRupees(i.outstandingBalance), 0);

                  return (
                    <tr key={cust._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/customers/${cust._id}`} className="font-bold text-slate-900 hover:underline">
                          {cust.displayName}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cust.gstTreatment}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 font-bold">
                        {cust.gstin || 'Unregistered'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cust.phone || cust.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-amber-700">
                        ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/customers/${cust._id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                            <span>View Account Statement</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

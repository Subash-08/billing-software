'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, CreditCard, Download, Landmark, FileDiff } from 'lucide-react';

export default function ExportCenterPage() {
  const handleExport = (type: string) => {
    window.open(`/api/reports/sales?format=csv`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Export Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export authoritative financial ledger data and tax reports in standard CSV and PDF formats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Sales & Invoices</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-xs">
              Complete invoice line items, tax breakdowns (CGST, SGST, IGST), and payment statuses.
            </CardDescription>
            <Button size="sm" className="w-full gap-2" onClick={() => handleExport('invoices')}>
              <Download className="h-3.5 w-3.5" /> Export Invoices CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Customer Directory</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-xs">
              Customer master details, GSTINs, addresses, state codes, and live credit balances.
            </CardDescription>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleExport('customers')}>
              <Download className="h-3.5 w-3.5" /> Export Customers CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Payments & Allocations</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-xs">
              Immutable payment receipts, allocation breakdowns, reference UTRs, and payment modes.
            </CardDescription>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleExport('payments')}>
              <Download className="h-3.5 w-3.5" /> Export Payments CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">GSTR-1 Sales Report</CardTitle>
            <Landmark className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-xs">
              GSTR-1 B2B, B2CS, and HSN/SAC summary aggregations for statutory GST filing.
            </CardDescription>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleExport('gstr1')}>
              <Download className="h-3.5 w-3.5" /> Export GSTR-1 Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Credit & Debit Notes</CardTitle>
            <FileDiff className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-xs">
              Issued Credit Notes, Debit Notes, original invoice references, and statutory tax reversals.
            </CardDescription>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleExport('notes')}>
              <Download className="h-3.5 w-3.5" /> Export Credit/Debit Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

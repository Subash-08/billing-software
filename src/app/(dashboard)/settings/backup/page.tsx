'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function DataBackupPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data & Backup</h1>
        <p className="text-sm text-slate-500 mt-1">Export your billing records, customer master, and invoices dataset.</p>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 py-3">
          <CardTitle className="text-xs uppercase font-bold text-slate-500 tracking-wider">Data Export</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs">
          <p className="text-slate-600">
            Download a full JSON/CSV export of all your business customer records, catalog items, and billing invoices.
          </p>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export Complete Dataset (.JSON)</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

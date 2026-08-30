'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Landmark, FileSearch, FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function ReportsCenterPage() {
  const reports = [
    {
      title: 'GST Summary & GSTR-1 Helper',
      description: 'Taxable sales, CGST, SGST, UTGST, IGST, and Cess breakdowns for filing dataset preparation.',
      href: '/reports/gst',
      icon: Landmark,
    },
    {
      title: 'Sales Register',
      description: 'Itemized invoice sales ledger grouped by date, customer, and tax treatment.',
      href: '/reports/sales',
      icon: FileSearch,
    },
    {
      title: 'HSN / SAC Tax Summary',
      description: 'Goods HSN and Services SAC code summary required for GST reporting.',
      href: '/reports/hsn-sac',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports Center</h1>
        <p className="text-sm text-slate-500 mt-1">Financial reporting, GST registers, and HSN breakdowns.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {reports.map((rep) => {
          const Icon = rep.icon;
          return (
            <Link key={rep.title} href={rep.href}>
              <Card className="h-full hover:border-teal-500 hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-50 rounded-lg text-teal-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900">{rep.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-2">{rep.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

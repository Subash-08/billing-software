'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { HelpCircle, BookOpen, ShieldCheck, Mail } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Help & Documentation Center</h1>
        <p className="text-sm text-slate-500 mt-1">GST rules guide, billing instructions, and support contact.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-sm font-bold">GST Billing Rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>• CGST + SGST is calculated automatically for Intra-State sales within the same state.</p>
            <p>• IGST is calculated for Inter-State sales across state boundaries.</p>
            <p>• UTGST applies for Union Territories without Legislature.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-sm font-bold">Support Contact</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>Need assistance with GST filing datasets or software configuration?</p>
            <p className="font-bold text-slate-900">Email: support@niramaalai.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

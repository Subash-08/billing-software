'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DocumentNumberingPage() {
  const sequences = [
    { docType: 'Tax Invoice', prefix: 'INV/', fy: '2025-26', nextSeq: 4 },
    { docType: 'Bill of Supply', prefix: 'BOS/', fy: '2025-26', nextSeq: 1 },
    { docType: 'Credit Note', prefix: 'CN/', fy: '2025-26', nextSeq: 1 },
    { docType: 'Debit Note', prefix: 'DN/', fy: '2025-26', nextSeq: 1 },
    { docType: 'Delivery Challan', prefix: 'DC/', fy: '2025-26', nextSeq: 1 },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Numbering & Sequences</h1>
        <p className="text-sm text-slate-500 mt-1">Per-business financial year document sequence counters (GST compliant).</p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Document Type</th>
                <th className="px-6 py-3">Prefix</th>
                <th className="px-6 py-3">Financial Year</th>
                <th className="px-6 py-3">Next Counter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sequences.map((seq) => (
                <tr key={seq.docType} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{seq.docType}</td>
                  <td className="px-6 py-4 font-mono text-slate-700">{seq.prefix}</td>
                  <td className="px-6 py-4 font-semibold text-slate-600">{seq.fy}</td>
                  <td className="px-6 py-4 font-bold text-teal-700 font-mono">{seq.nextSeq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

/**
 * Feature Readiness & V2 Roadmap Status Page
 * Displays V1 Active Modules vs Deferred V2 Modules
 */

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, ArrowLeft, ShieldCheck, Layers, Sparkles } from 'lucide-react';

const V1_ACTIVE_MODULES = [
  { name: 'Core Billing & Invoicing Engine', desc: 'Authoritative tax calculations, draft & issue lifecycle, integer paise precision', status: 'PRODUCTION READY' },
  { name: 'Customer Master Directory', desc: 'B2B/B2C classification, GSTIN format validation, state codes & multi-address support', status: 'PRODUCTION READY' },
  { name: 'Product Master (Goods)', desc: 'HSN classification lookup, SKU tracking, selling/cost rates, tax-inclusive toggle', status: 'PRODUCTION READY' },
  { name: 'Service Master', desc: 'SAC classification lookup, billing units, GST rate resolution', status: 'PRODUCTION READY' },
  { name: 'Centralized GST Calculation Engine', desc: 'CGST, SGST, IGST, UTGST, Cess, RCM, SEZ, LUT Bond, & place of supply rules', status: 'PRODUCTION READY' },
  { name: 'Immutable Invoice Snapshots', desc: 'Captures locked customer, product, and template snapshots at issuance time', status: 'PRODUCTION READY' },
  { name: 'Payment & Settlement Engine', desc: 'Multi-mode allocations, advance credit tracking, partial/full payments', status: 'PRODUCTION READY' },
  { name: 'Credit Notes & Debit Notes', desc: 'Sales return, tax adjustments, debit notes with complete customer ledger sync', status: 'PRODUCTION READY' },
  { name: 'Customer Ledger & Statements', desc: 'Real-time statement reconciliation, opening balances, closing balances', status: 'PRODUCTION READY' },
  { name: 'PDF & Print Engine', desc: 'Standard, Pre-printed Letterhead, and Digital Letterhead template modes', status: 'PRODUCTION READY' },
  { name: 'Reports & Analytics', desc: 'Sales report, GST summary (CGST/SGST/IGST/Cess), HSN/SAC summary, Outstanding aging', status: 'PRODUCTION READY' },
  { name: 'Multi-Tenant Security', desc: 'Session-derived business isolation across all database queries and endpoints', status: 'PRODUCTION READY' },
];

const V2_DEFERRED_MODULES = [
  { name: 'Purchases & Supplier Master', desc: 'Vendor management, purchase orders, purchase invoices, and vendor credit ledgers', status: 'PLANNED V2' },
  { name: 'Advanced Multi-Warehouse Inventory', desc: 'Warehouse locations, batch numbers, serial numbers, and physical stock transfers', status: 'PLANNED V2' },
  { name: 'Sales Orders & Estimates/Quotations', desc: 'Pipeline order management and one-click conversion to Tax Invoices', status: 'PLANNED V2' },
  { name: 'Delivery Challans (Rule 55)', desc: 'Movement of goods for job work and supply on approval', status: 'PLANNED V2' },
  { name: 'Recurring Billing & Subscriptions', desc: 'Automated recurring invoice schedule generation', status: 'PLANNED V2' },
  { name: 'Direct Government GSTR Filing Integration', desc: 'Automated direct API submission to GSTN portal for GSTR-1 & GSTR-3B', status: 'PLANNED V2' },
];

export default function V2StatusPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/business" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Feature Status &amp; Scope Matrix</h1>
          <p className="text-xs text-slate-500">Overview of V1 Core Production Modules vs Planned V2 Modules</p>
        </div>
      </div>

      {/* Scope Disclaimer */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sm">V1 Core Billing System Scope Lock</div>
          <p className="leading-relaxed">
            This platform is an Indian GST Billing &amp; Invoicing SaaS application designed to help businesses create legal tax invoices, record payments, track customer outstanding balances, issue credit/debit notes, and generate PDF bills. Direct GST return filing (GSTR-1/3B API upload) and Purchasing/Warehouse Management are scheduled for V2.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* V1 Active Production Modules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>V1 Core Active Modules ({V1_ACTIVE_MODULES.length})</span>
            </h2>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              LIVE IN V1
            </span>
          </div>

          <div className="space-y-3">
            {V1_ACTIVE_MODULES.map((m, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{m.name}</span>
                  <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {m.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* V2 Planned Modules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Deferred V2 Modules ({V2_DEFERRED_MODULES.length})</span>
            </h2>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              COMING IN V2
            </span>
          </div>

          <div className="space-y-3">
            {V2_DEFERRED_MODULES.map((m, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{m.name}</span>
                  <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {m.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

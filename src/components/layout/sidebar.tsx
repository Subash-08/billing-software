'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  FileDiff,
  FilePlus,
  Users,
  Package,
  Wrench,
  BarChart3,
  Landmark,
  FileSpreadsheet,
  LayoutTemplate,
  FileCode,
  Download,
  Sliders,
  ShieldCheck,
  Binary,
  History,
  QrCode,
  Truck,
  RotateCcw,
  Sparkles,
  Clock,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'MAIN',
    items: [{ title: 'Dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    heading: 'SALES',
    items: [
      { title: 'Invoices', href: '/invoices', icon: FileText },
      { title: 'Outstanding Aging', href: '/outstanding', icon: Clock },
      { title: 'Credit Notes', href: '/credit-notes', icon: FileDiff },
      { title: 'Debit Notes', href: '/debit-notes', icon: FilePlus },
      { title: 'Payments / Receipts', href: '/payments', icon: CreditCard },
      { title: 'Refunds', href: '/refunds', icon: RotateCcw },
    ],
  },
  {
    heading: 'MASTERS',
    items: [
      { title: 'Customers', href: '/customers', icon: Users },
      { title: 'Products', href: '/products', icon: Package },
      { title: 'Services', href: '/services', icon: Wrench },
      { title: 'Categories', href: '/categories', icon: Sparkles },
    ],
  },
  {
    heading: 'REPORTS',
    items: [
      { title: 'Sales Summary', href: '/reports/sales', icon: BarChart3 },
      { title: 'GSTR-1 Report', href: '/reports/gst', icon: Landmark },
      { title: 'GSTR-3B Report', href: '/reports/hsn-sac', icon: FileSpreadsheet },
      { title: 'Customer Statements', href: '/statements', icon: Users },
    ],
  },
  {
    heading: 'DOCUMENTS',
    items: [
      { title: 'Invoice Templates', href: '/settings/templates', icon: LayoutTemplate },
      { title: 'Document Settings', href: '/settings/invoices', icon: FileCode },
    ],
  },
  {
    heading: 'EXPORTS',
    items: [
      { title: 'Data Exports', href: '/exports', icon: Download },
    ],
  },
  {
    heading: 'SETTINGS',
    items: [
      { title: 'Business Profile', href: '/settings/business', icon: Sliders },
      { title: 'GST & Tax Settings', href: '/settings/gst', icon: ShieldCheck },
      { title: 'Invoice & Numbering', href: '/settings/numbering', icon: Binary },
      { title: 'Bank & UPI', href: '/settings/bank-details', icon: Landmark },
      { title: 'E-Invoice Settings', href: '/settings/e-invoice', icon: QrCode },
      { title: 'E-Way Bill Settings', href: '/settings/e-way-bill', icon: Truck },
      { title: 'Audit Log', href: '/settings/audit-logs', icon: History },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-[#0B0F19] text-slate-300 h-screen sticky top-0 flex flex-col justify-between overflow-y-auto scrollbar-thin z-20">
      <div className="p-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800/80 mb-5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-600/30">
            N
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm tracking-tight text-white">Niramaalai</h1>
              <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded-full">
                SaaS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">GST Billing & Accounting</p>
          </div>
        </div>

        {/* Nav Menu */}
        <nav className="space-y-5">
          {navSections.map((section) => (
            <div key={section.heading}>
              <h2 className="px-3 text-[10px] font-bold text-slate-500/80 tracking-widest uppercase mb-1.5">
                {section.heading}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25 translate-x-0.5'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-colors',
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Shortcut Bar */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Global Search</span>
        </span>
        <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono shadow-inner">
          Ctrl+K
        </kbd>
      </div>
    </aside>
  );
}

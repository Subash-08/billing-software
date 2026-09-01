'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Plus, FileText, Users, Package, Wrench, CreditCard, FileDiff, FilePlus, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSearchModal } from '@/components/global-search-modal';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; businessName: string }>({
    email: 'Loading...',
    businessName: 'NIRAMAALAI Business',
  });

  useEffect(() => {
    async function loadUserHeader() {
      try {
        const res = await fetch('/api/business/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.business) {
            setUserInfo({
              email: data.business.email || 'user@niramaalai.com',
              businessName: data.business.legalName || 'NIRAMAALAI Business',
            });
          }
        }
      } catch {
        // Fallback
      }
    }
    loadUserHeader();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const createActions = [
    { label: 'New Invoice', href: '/invoices/new', icon: FileText },
    { label: 'New Customer', href: '/customers/new', icon: Users },
    { label: 'New Product', href: '/products/new', icon: Package },
    { label: 'New Service', href: '/services/new', icon: Wrench },
    { label: 'Record Payment', href: '/payments', icon: CreditCard },
    { label: 'Credit Note', href: '/credit-notes', icon: FileDiff },
    { label: 'Debit Note', href: '/debit-notes', icon: FilePlus },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 shadow-xs print:hidden">
        {/* Search Bar Trigger */}
        <div className="flex items-center gap-3 w-80">
          <div className="relative w-full cursor-pointer" onClick={() => setSearchOpen(true)}>
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              readOnly
              placeholder="Search customers, invoices... (Ctrl+K)"
              className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-12 text-xs text-slate-800 placeholder:text-slate-400 cursor-pointer focus:outline-none hover:bg-slate-100/80 transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 shadow-xs">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Action Controls & User Business Badge */}
        <div className="flex items-center gap-3 relative">
          {/* + Create Action Button Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs h-8 px-3.5 gap-1.5 font-medium rounded-lg shadow-sm shadow-blue-600/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create</span>
            </Button>

            {createMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in-50 zoom-in-95"
                onClick={() => setCreateMenuOpen(false)}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Create
                </div>
                {createActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-slate-400" />
                      <span>{action.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Profile / Business Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 hover:bg-slate-100 transition-colors text-xs text-slate-700"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold shadow-xs">
                {userInfo.businessName.substring(0, 2).toUpperCase()}
              </div>
              <span className="font-medium max-w-[140px] truncate">{userInfo.businessName}</span>
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in-50 zoom-in-95"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="border-b border-slate-100 px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-800">{userInfo.businessName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{userInfo.email}</div>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings/business"
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>Business Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Command Palette Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

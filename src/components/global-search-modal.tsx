'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, FileText, Users, CreditCard, Package, ArrowRight, Loader2, Command } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  url: string;
}

export interface GroupedSearchResults {
  invoices: SearchResultItem[];
  customers: SearchResultItem[];
  payments: SearchResultItem[];
  products: SearchResultItem[];
}

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GroupedSearchResults>({
    invoices: [],
    customers: [],
    payments: [],
    products: [],
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flat list of current search result items for keyboard navigation
  const allItems: SearchResultItem[] = [
    ...results.invoices,
    ...results.customers,
    ...results.payments,
    ...results.products,
  ];

  // Keybindings listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or trigger
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ invoices: [], customers: [], payments: [], products: [] });
    }
  }, [isOpen]);

  // Debounced API Search Query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ invoices: [], customers: [], payments: [], products: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.success && json.results) {
          setResults(json.results);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation within modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        router.push(allItems[selectedIndex].url);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleModalKeyDown}
      >
        {/* Search Header */}
        <div className="p-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search invoices, customers, payments, products (Ctrl + K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="px-2 py-1 text-[11px] font-semibold bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 space-y-4 max-h-[60vh] text-xs">
          {allItems.length === 0 && !loading && query.length >= 2 && (
            <div className="py-12 text-center text-slate-500 space-y-1">
              <p className="font-semibold">No results found for "{query}"</p>
              <p className="text-[11px]">Try searching by invoice number, customer name, GSTIN, or product SKU.</p>
            </div>
          )}

          {allItems.length === 0 && !query && (
            <div className="space-y-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Navigation Shortcuts</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Create New Invoice', url: '/invoices/new', icon: FileText },
                  { label: 'Add New Customer', url: '/customers/new', icon: Users },
                  { label: 'Record Payment', url: '/payments', icon: CreditCard },
                  { label: 'GSTR-1 Tax Summary', url: '/reports/gstr1', icon: Package },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.url}
                      onClick={() => {
                        router.push(item.url);
                        onClose();
                      }}
                      className="flex items-center gap-2 p-2.5 rounded border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-left transition font-medium text-slate-700"
                    >
                      <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Group: Invoices */}
          {results.invoices.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2">Invoices</span>
              {results.invoices.map((inv) => {
                const itemIndex = allItems.findIndex((i) => i.id === inv.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      router.push(inv.url);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                      <div>
                        <div className="font-bold">{inv.title}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{inv.subtitle}</div>
                      </div>
                    </div>
                    {inv.status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {inv.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Group: Customers */}
          {results.customers.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2">Customers</span>
              {results.customers.map((cust) => {
                const itemIndex = allItems.findIndex((i) => i.id === cust.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      router.push(cust.url);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                      <div>
                        <div className="font-bold">{cust.title}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{cust.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Group: Payments */}
          {results.payments.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2">Payments</span>
              {results.payments.map((pmt) => {
                const itemIndex = allItems.findIndex((i) => i.id === pmt.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={pmt.id}
                    onClick={() => {
                      router.push(pmt.url);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                      <div>
                        <div className="font-bold">{pmt.title}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{pmt.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Group: Products */}
          {results.products.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2">Products & Services</span>
              {results.products.map((prd) => {
                const itemIndex = allItems.findIndex((i) => i.id === prd.id);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <div
                    key={prd.id}
                    onClick={() => {
                      router.push(prd.url);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                      isSelected ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                      <div>
                        <div className="font-bold">{prd.title}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{prd.subtitle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 px-4">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono font-bold text-slate-700">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border rounded shadow-xs font-mono font-bold text-slate-700">↵</kbd> Select</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Command className="w-3 h-3" /> + K to toggle search
          </div>
        </div>
      </div>
    </div>
  );
}

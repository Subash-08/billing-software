'use client';

/**
 * Reusable HSN / SAC Code Search & Selector Component
 * Features:
 * - Search local master reference data by code or description
 * - Type enforcement (HSN for Goods, SAC for Services)
 * - Validation feedback & manual override warnings
 * - Statutory GST Legal Disclaimer Callout
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, AlertTriangle, CheckCircle2, Info, Loader2, BookOpen } from 'lucide-react';

interface HsnSacSearchProps {
  value: string;
  type: 'HSN' | 'SAC';
  onChange: (code: string, description?: string) => void;
  placeholder?: string;
  className?: string;
}

interface HsnSacResult {
  id: string;
  code: string;
  type: 'HSN' | 'SAC';
  description: string;
  chapter?: string;
}

export function HsnSacSearchInput({
  value,
  type,
  onChange,
  placeholder,
  className = '',
}: HsnSacSearchProps) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<HsnSacResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedDesc, setSelectedDesc] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const fetchCodes = async (searchTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hsn-sac?search=${encodeURIComponent(searchTerm)}&type=${type}&limit=12`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    const uppercaseText = text.trim().toUpperCase();
    setQuery(uppercaseText);
    setSelectedDesc(null);
    onChange(uppercaseText);

    // Format validation
    if (type === 'HSN' && uppercaseText.startsWith('99') && uppercaseText.length === 6) {
      setValidationWarning("Warning: Code starting with '99' is typically a SAC Service code, not an HSN Goods code.");
    } else if (type === 'SAC' && uppercaseText.length > 0 && !uppercaseText.startsWith('99')) {
      setValidationWarning("Warning: SAC Service codes must start with '99' (e.g. 998314).");
    } else {
      setValidationWarning(null);
    }

    setOpen(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchCodes(uppercaseText);
    }, 250);
  };

  const handleSelect = (item: HsnSacResult) => {
    setQuery(item.code);
    setSelectedDesc(item.description);
    setValidationWarning(null);
    onChange(item.code, item.description);
    setOpen(false);
  };

  return (
    <div className={`relative space-y-1.5 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            fetchCodes(query);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 220);
          }}
          placeholder={placeholder || (type === 'HSN' ? 'Search HSN code or item name...' : 'Search SAC code or service name...')}
          className="w-full h-9 pl-3 pr-8 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs uppercase font-bold"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Selected Code Description Pill */}
      {selectedDesc && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-[11px] text-blue-900 flex items-start gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{query}</span> — {selectedDesc}
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {validationWarning && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{validationWarning}</span>
        </div>
      )}

      {/* Floating Suggestions Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 top-10 w-full bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto ring-1 ring-black/5">
          <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>Official GST {type} Reference Lookup</span>
            <span>Code | Description</span>
          </div>

          {loading && (
            <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              Searching official {type} directory...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-3 text-xs text-slate-500 space-y-1">
              <div>No exact master match found for &ldquo;{query}&rdquo;.</div>
              <div className="text-[10px] text-amber-700 font-semibold">
                You may enter a custom {type} code manually. Please verify with tax advisor.
              </div>
            </div>
          )}

          {!loading && results.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-start gap-2 border-b border-slate-100 transition cursor-pointer"
            >
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-800 rounded border border-slate-200 shrink-0">
                {item.code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-[11px] line-clamp-1">{item.description}</div>
                {item.chapter && <div className="text-[9px] text-slate-400">Chapter {item.chapter}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Legal Disclaimer */}
      <p className="text-[10px] text-slate-400 leading-tight">
        * HSN/SAC classification should be verified for your specific product/service. The application does not provide legal/tax advice.
      </p>
    </div>
  );
}

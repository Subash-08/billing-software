'use client';

import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  title?: string;
  message: string | string[] | Array<{ message: string; path?: (string | number)[] }>;
  onClose?: () => void;
  autoCloseDuration?: number;
}

/**
 * Parses raw API error payload, ZodError arrays, or JSON error strings
 * into a clean array of human-readable error messages.
 */
export function formatApiErrorMessages(
  errorPayload: any,
  type: ToastType = 'error'
): { title: string; messages: string[] } {
  let raw = errorPayload;

  // Handle fetch Response object or data wrapper
  if (raw && typeof raw === 'object') {
    if (raw.details && Array.isArray(raw.details)) {
      raw = raw.details;
    } else if (raw.error) {
      raw = raw.error;
    }
  }

  // Handle stringified JSON array
  if (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{'))) {
    try {
      raw = JSON.parse(raw);
    } catch {
      // Keep as string
    }
  }

  // Handle Zod issue array
  if (Array.isArray(raw)) {
    const messages = raw.map((issue: any) => {
      if (typeof issue === 'string') return issue;
      const msg = issue.message || 'Invalid value';
      if (issue.path && Array.isArray(issue.path) && issue.path.length > 0) {
        const field = issue.path
          .filter((p: any) => typeof p === 'string')
          .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ');
        return field ? `${field}: ${msg}` : msg;
      }
      return msg;
    });

    return {
      title: messages.length > 1 ? `${messages.length} Validation Errors` : 'Validation Error',
      messages,
    };
  }

  const defaultTitle =
    type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : type === 'info' ? 'Info' : 'Error';

  if (typeof raw === 'string') {
    return { title: defaultTitle, messages: [raw] };
  }

  return { title: defaultTitle, messages: ['An unexpected error occurred. Please try again.'] };
}

export function Toast({
  type = 'error',
  title,
  message,
  onClose,
  autoCloseDuration = 7000,
}: ToastProps) {
  const { title: parsedTitle, messages } = formatApiErrorMessages(message, type);
  const displayTitle = title || parsedTitle;

  useEffect(() => {
    if (autoCloseDuration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration, onClose]);

  const styleMap = {
    error: {
      container: 'bg-red-900/95 text-red-50 border-red-700 shadow-red-950/40',
      icon: <AlertCircle className="h-5 w-5 text-red-300 shrink-0 mt-0.5" />,
      titleColor: 'text-white font-semibold text-xs',
      textColor: 'text-red-100 text-xs',
      closeBtn: 'text-red-200 hover:text-white hover:bg-red-800/60',
    },
    success: {
      container: 'bg-emerald-900/95 text-emerald-50 border-emerald-700 shadow-emerald-950/40',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />,
      titleColor: 'text-white font-semibold text-xs',
      textColor: 'text-emerald-100 text-xs',
      closeBtn: 'text-emerald-200 hover:text-white hover:bg-emerald-800/60',
    },
    warning: {
      container: 'bg-amber-900/95 text-amber-50 border-amber-700 shadow-amber-950/40',
      icon: <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />,
      titleColor: 'text-white font-semibold text-xs',
      textColor: 'text-amber-100 text-xs',
      closeBtn: 'text-amber-200 hover:text-white hover:bg-amber-800/60',
    },
    info: {
      container: 'bg-slate-900/95 text-slate-50 border-slate-700 shadow-slate-950/40',
      icon: <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />,
      titleColor: 'text-white font-semibold text-xs',
      textColor: 'text-slate-200 text-xs',
      closeBtn: 'text-slate-300 hover:text-white hover:bg-slate-800/60',
    },
  };

  const style = styleMap[type];

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)] p-4 rounded-xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 text-xs transition-all animate-in fade-in-0 slide-in-from-top-6 duration-200 ${style.container}`}
    >
      <div className="flex items-start gap-3 flex-1">
        {style.icon}
        <div className="space-y-1 flex-1">
          <h4 className={style.titleColor}>{displayTitle}</h4>
          {messages.length === 1 ? (
            <p className={style.textColor}>{messages[0]}</p>
          ) : (
            <ul className={`list-disc pl-4 space-y-0.5 ${style.textColor}`}>
              {messages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`p-1 rounded-md transition-colors ${style.closeBtn}`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

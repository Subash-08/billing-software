import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950',
        {
          'border-transparent bg-slate-900 text-slate-50': variant === 'default',
          'border-transparent bg-slate-100 text-slate-900': variant === 'secondary',
          'border-transparent bg-emerald-100 text-emerald-800': variant === 'success',
          'border-transparent bg-amber-100 text-amber-800': variant === 'warning',
          'border-transparent bg-red-100 text-red-800': variant === 'destructive',
          'border-slate-200 text-slate-900': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

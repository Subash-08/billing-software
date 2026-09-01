'use client';

import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased print:block print:bg-white print:min-h-0 print:p-0 print:m-0">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen print:block print:min-h-0 print:p-0 print:m-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 print:p-0 print:m-0 print:bg-white">{children}</main>
      </div>
    </div>
  );
}

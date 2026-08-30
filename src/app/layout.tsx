import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NIRAMAALAI — Business Management & GST Billing',
  description: 'Production-grade Indian GST billing, invoicing, and business management platform.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#F7F8FA] text-[#1F2937] antialiased text-sm`}>
        {children}
      </body>
    </html>
  );
}

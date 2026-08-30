import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1F2937] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link href="/" className="inline-flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center font-bold text-white text-base">
            N
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1F2937]">
            NIRAMAALAI <span className="text-[#6B7280] font-normal text-sm">Billing</span>
          </span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white border border-[#E5E7EB] py-8 px-6 shadow-sm rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}

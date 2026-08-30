'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Login server endpoint returned non-JSON response (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Invalid email address or password');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1F2937]">Sign in to NIRAMAALAI</h1>
        <p className="text-xs text-[#6B7280] mt-1">Manage invoices, payments and GST billing.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#374151] mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-xs transition"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-[#374151]">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#2563EB] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-xs transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-md text-xs transition disabled:opacity-50 mt-2"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-center">
        <p className="text-xs text-[#6B7280]">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#2563EB] hover:underline font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

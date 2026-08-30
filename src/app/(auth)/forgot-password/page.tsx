'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Server returned unexpected response (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1F2937]">Reset your password</h1>
        <p className="text-xs text-[#6B7280] mt-1">Enter your registered email address below.</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="p-4 rounded-md bg-[#F0FDF4] border border-[#86EFAC] text-xs text-[#166534] space-y-2">
          <div className="flex items-center space-x-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Reset link generated</span>
          </div>
          <p className="text-[#374151]">
            If an account exists for <strong>{email}</strong>, password reset instructions have been logged.
          </p>
          <div className="pt-2">
            <Link href="/login" className="text-[#2563EB] font-medium hover:underline">
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Registered email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-md text-xs transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-center">
        <Link href="/login" className="text-xs text-[#6B7280] hover:text-[#1F2937]">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

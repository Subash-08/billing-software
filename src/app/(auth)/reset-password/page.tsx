'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmNewPassword: confirmPassword }),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(`Server returned non-JSON response (${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
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
        <h1 className="text-xl font-semibold text-[#1F2937]">Create new password</h1>
        <p className="text-xs text-[#6B7280] mt-1">Enter your new password below.</p>
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
            <span>Password reset successful</span>
          </div>
          <p className="text-[#374151]">Your account password has been updated.</p>
          <div className="pt-2">
            <Link href="/login" className="px-4 py-2 bg-[#2563EB] text-white font-medium rounded-md inline-block text-xs">
              Sign in now
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              New password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md bg-white border border-[#D1D5DB] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-md text-xs transition disabled:opacity-50 mt-2"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-[#6B7280]">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function CircleResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const missingToken = !token;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setStatus('error');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }
    setStatus('working');
    try {
      const res = await fetch(`${API_BASE}/api/v1/my-circle/circle-users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (res.ok) {
        setStatus('done');
        setTimeout(() => router.push('/my-circle/contact'), 2500);
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage(body?.detail || 'That link expired or is invalid. Please request a new one.');
        setStatus('error');
      }
    } catch {
      setMessage('Connection problem. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E8F4F8] via-white to-border">
      <div className="w-full max-w-md">
        <Link
          href="/my-circle/contact"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-cg-sage to-cg-slate text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Set a new password
              </h1>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              Choose something you'll remember. The reset link expires 30 minutes after it was sent.
            </p>
          </div>

          <div className="p-6">
            {missingToken ? (
              <div className="text-center space-y-3 py-4">
                <p className="font-bold text-slate-900">This link is missing its token.</p>
                <p className="text-sm text-slate-600">
                  Open the link directly from your reset email, or request a new one.
                </p>
                <Link
                  href="/my-circle/forgot-password"
                  className="inline-block mt-2 px-5 py-2.5 bg-cg-sage hover:bg-cg-slate text-white rounded-xl font-bold transition"
                >
                  Request a new link
                </Link>
              </div>
            ) : status === 'done' ? (
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-lg text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Password updated
                </p>
                <p className="text-sm text-slate-600">Taking you back to sign in…</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    New password
                  </span>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={status === 'working'}
                      className="w-full border-2 border-slate-200 rounded-xl p-3 pr-11 text-sm focus:border-cg-sage focus:ring-0 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">At least 8 characters.</p>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Confirm new password
                  </span>
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={status === 'working'}
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-cg-sage focus:ring-0 outline-none transition"
                  />
                </label>

                {status === 'error' && message && (
                  <p className="text-sm text-rose-600 font-medium">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'working'}
                  className="w-full bg-gradient-to-r from-cg-sage to-cg-slate text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  {status === 'working' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CircleResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>}>
      <CircleResetPasswordInner />
    </Suspense>
  );
}

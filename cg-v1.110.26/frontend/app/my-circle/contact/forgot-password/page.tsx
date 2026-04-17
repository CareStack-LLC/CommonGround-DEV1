'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function CircleForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('working');
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/my-circle/circle-users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Backend returns success for unknown emails too (enumeration protection)
      if (res.ok || res.status === 202) {
        setStatus('sent');
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage(body?.detail || 'We could not send the email. Try again in a few minutes.');
        setStatus('error');
      }
    } catch {
      setMessage('Connection problem. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E8F4F8] via-white to-[#D6ECE8]">
      <div className="w-full max-w-md">
        <Link
          href="/my-circle/contact"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F] text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Forgot your password?
              </h1>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              Enter the email you used to join your child's circle and we'll send a reset link.
            </p>
          </div>

          <div className="p-6">
            {status === 'sent' ? (
              <div className="text-center space-y-3 py-4">
                <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="font-bold text-lg text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Check your inbox
                </p>
                <p className="text-sm text-slate-600">
                  If <span className="font-mono text-slate-900">{email}</span> is on file,
                  you'll have a reset link within a few minutes. The link expires in 30 minutes.
                </p>
                <Link
                  href="/my-circle/contact"
                  className="inline-block mt-4 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-900 transition"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    Email address
                  </span>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'working'}
                    placeholder="you@example.com"
                    className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-[#3DAA8A] focus:ring-0 outline-none transition"
                  />
                </label>

                {status === 'error' && message && (
                  <p className="text-sm text-rose-600 font-medium">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'working' || !email.trim()}
                  className="w-full bg-gradient-to-r from-[#3DAA8A] to-[#2D6A8F] text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  {status === 'working' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Need help? Email{' '}
          <a href="mailto:support@commonground.family" className="font-semibold text-slate-700 hover:text-slate-900">
            support@commonground.family
          </a>
        </p>
      </div>
    </div>
  );
}

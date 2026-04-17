'use client';

import { useState, useEffect } from 'react';
import { Shield, X, CheckCircle2, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Persistent "I need help" button visible on every KidSpace screen.
 * One tap fires a high-priority push notification to both parents.
 * Kids should always have this escape hatch — never hide it behind a menu.
 */
export function ChildSosButton() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [context, setContext] = useState<string>('');
  const [note, setNote] = useState('');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Only mount when a child token is present — don't show to parents in shared devices
    if (typeof window !== 'undefined') {
      setHasToken(!!localStorage.getItem('child_token'));
    }
    // Derive screen context from pathname for the parent notification
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/chat')) setContext('chat');
      else if (path.includes('/call')) setContext('call');
      else if (path.includes('/movies') || path.includes('/theater')) setContext('theater');
      else if (path.includes('/library') || path.includes('/stories')) setContext('library');
      else if (path.includes('/arcade')) setContext('arcade');
      else if (path.includes('/chores')) setContext('chores');
      else if (path.includes('/rewards')) setContext('rewards');
      else setContext('');
    }
  }, []);

  async function send() {
    setStatus('sending');
    const token = localStorage.getItem('child_token');
    if (!token) {
      setStatus('error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/circle-messages/child/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ context, note }),
      });
      if (res.ok) {
        setStatus('sent');
        setTimeout(() => {
          setOpen(false);
          setStatus('idle');
          setNote('');
        }, 2200);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!hasToken) return null;

  return (
    <>
      {/* Floating button — always reachable */}
      <button
        onClick={() => setOpen(true)}
        aria-label="I need help"
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold rounded-full shadow-2xl px-5 py-3 transition-all border-4 border-white"
        style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
      >
        <Shield className="h-5 w-5" strokeWidth={2.5} />
        <span className="text-sm">I need help</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => status === 'idle' && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 relative">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-7 w-7" strokeWidth={2.5} />
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Tell your parents
                </h2>
              </div>
              <p className="text-rose-50 text-sm leading-relaxed">
                Tapping the button will ping both of your parents right away. It's okay to
                ask for help — that's what they're here for.
              </p>
            </div>

            <div className="p-6 space-y-4">
              {status === 'sent' ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" strokeWidth={2} />
                  <p className="font-bold text-lg text-slate-900 text-center">
                    Your parents know
                  </p>
                  <p className="text-sm text-slate-600 text-center">
                    They'll check on you soon.
                  </p>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700 mb-1.5 block">
                      Want to say more? (optional)
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="You don't have to — just the button is enough."
                      maxLength={500}
                      rows={3}
                      disabled={status === 'sending'}
                      className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-rose-400 focus:ring-0 outline-none resize-none"
                    />
                  </label>

                  <button
                    onClick={send}
                    disabled={status === 'sending'}
                    className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-70 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition"
                    style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                  >
                    {status === 'sending' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" strokeWidth={2.5} />
                        Tell my parents now
                      </>
                    )}
                  </button>

                  {status === 'error' && (
                    <p className="text-sm text-rose-600 text-center font-medium">
                      That didn't go through. Try once more, or find a grown-up.
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 text-center">
                    If you're in danger right now, call <strong className="text-slate-900">911</strong>.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

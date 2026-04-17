'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Shield, MessageSquare, Video, Phone, Film, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ChildSchedule {
  child_id: string;
  child_name: string;
  can_chat: boolean;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_theater: boolean;
  allowed_days_readable: string[];
  allowed_start_time: string | null;
  allowed_end_time: string | null;
  always_available: boolean;
}

export default function CircleContactSchedulePage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildSchedule[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'empty'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('circle_token') : null;
    if (!token) {
      router.push('/my-circle/contact');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/my-circle/circle-users/schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        const list: ChildSchedule[] = data.children || [];
        setChildren(list);
        setStatus(list.length === 0 ? 'empty' : 'ready');
      } catch (err: any) {
        setError(err?.message || 'Could not load the schedule.');
        setStatus('error');
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F4F8] via-white to-[#D6ECE8] pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Link
          href="/my-circle/contact/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-[#3DAA8A]/15 to-[#2D6A8F]/10 rounded-2xl shadow-md">
            <Calendar className="w-6 h-6 text-[#2D6A8F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              When can I call?
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              The windows parents have set for each child. Read-only.
            </p>
          </div>
        </div>

        {status === 'loading' && (
          <div className="flex items-center gap-2 text-slate-500 font-medium p-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        )}

        {status === 'error' && (
          <div className="p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl">
            <p className="text-sm font-semibold text-rose-900">{error}</p>
            <p className="text-xs text-rose-800/80 mt-1">
              Try refreshing the page. If this keeps happening, email support@commonground.family.
            </p>
          </div>
        )}

        {status === 'empty' && (
          <div className="p-8 bg-white border-2 border-slate-200 rounded-2xl text-center shadow-lg">
            <Shield className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <p className="font-bold text-slate-900">No children assigned to your circle yet.</p>
            <p className="text-sm text-slate-600 mt-1">
              When a parent adds you to a child's circle, they'll appear here with allowed hours.
            </p>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            {children.map((c) => (
              <div
                key={c.child_id}
                className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#3DAA8A]/10 to-[#2D6A8F]/5 px-5 py-4 border-b-2 border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    {c.child_name}
                  </h2>
                </div>

                <div className="p-5 space-y-4">
                  {/* What you can do */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                      What you can do
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Capability label="Chat" icon={<MessageSquare className="w-3.5 h-3.5" />} enabled={c.can_chat} />
                      <Capability label="Video call" icon={<Video className="w-3.5 h-3.5" />} enabled={c.can_video_call} />
                      <Capability label="Voice call" icon={<Phone className="w-3.5 h-3.5" />} enabled={c.can_voice_call} />
                      <Capability label="Watch together" icon={<Film className="w-3.5 h-3.5" />} enabled={c.can_theater} />
                    </div>
                  </div>

                  {/* Schedule */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Allowed window
                    </p>
                    {c.always_available ? (
                      <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Any day, any time
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {c.allowed_days_readable.length === 0 ? (
                            <span className="text-sm text-slate-500">Not available on any day</span>
                          ) : (
                            c.allowed_days_readable.map((d) => (
                              <span
                                key={d}
                                className="text-xs font-bold px-2.5 py-1 bg-[#3DAA8A]/10 text-[#2D6A8F] rounded-full"
                              >
                                {d}
                              </span>
                            ))
                          )}
                        </div>
                        {(c.allowed_start_time || c.allowed_end_time) && (
                          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-500" />
                            {c.allowed_start_time || '—'} to {c.allowed_end_time || '—'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <p className="text-xs text-slate-500 text-center pt-2">
              If these times don't work, ask the parents — they set and can update them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Capability({ label, icon, enabled }: { label: string; icon: React.ReactNode; enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border-2 ${
        enabled
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

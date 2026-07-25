'use client';

/**
 * KidSpace Calendar — shows the child a chronological list of upcoming
 * events, grouped by day. Sources:
 *
 *   - Parent-created events that tag this child in ``child_ids``
 *   - Events the child created themselves via KidSpace
 *
 * Backend: ``GET /events/child/upcoming`` (child_events/upcoming in
 * ``backend/app/api/v1/endpoints/events.py``). The endpoint already filters
 * to scheduled + upcoming and limits rows, so the client render is kept
 * deliberately simple — no pagination, no filters, no settings. This mirrors
 * the KidSpace design language: big type, gentle colors, no jargon.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  PartyPopper,
  GraduationCap,
  Stethoscope,
  Trophy,
  Users as UsersIcon,
} from 'lucide-react';

import { childEventsAPI, type ChildEvent } from '@/lib/api';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

/** Map backend ``event_type`` to a kid-friendly icon + label + accent. */
function iconFor(eventType: string): {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: string;
} {
  const t = (eventType || 'custom').toLowerCase();
  if (t.includes('birthday') || t.includes('party')) {
    return { Icon: PartyPopper, label: 'Celebration', accent: 'from-cg-amber to-cg-amber' };
  }
  if (t.includes('school') || t.includes('class')) {
    return { Icon: GraduationCap, label: 'School', accent: 'from-cg-slate-light to-cg-slate' };
  }
  if (t.includes('medical') || t.includes('doctor') || t.includes('appointment')) {
    return { Icon: Stethoscope, label: 'Appointment', accent: 'from-cg-sage-light to-teal-500' };
  }
  if (t.includes('sport') || t.includes('game') || t.includes('practice')) {
    return { Icon: Trophy, label: 'Sports', accent: 'from-cg-amber to-cg-amber' };
  }
  if (t.includes('exchange') || t.includes('pickup') || t.includes('dropoff')) {
    return { Icon: UsersIcon, label: 'With a grown-up', accent: 'from-cg-slate-light to-cg-slate' };
  }
  return { Icon: CalendarDays, label: 'Event', accent: 'from-cg-amber to-cg-sage' };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDayKey(iso: string): string {
  // YYYY-MM-DD in the viewer's local tz — so events group by the calendar
  // day the child would see them on, not a UTC day.
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function KidSpaceCalendarPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [events, setEvents] = useState<ChildEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('child_token');
    const userStr = localStorage.getItem('child_user');
    if (!token || !userStr) {
      router.push('/my-circle/child');
      return;
    }
    try {
      setUserData(JSON.parse(userStr) as ChildUserData);
    } catch {
      router.push('/my-circle/child');
    }
  }, [router]);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await childEventsAPI.getUpcoming(50);
      setEvents(data);
    } catch (err: any) {
      setError(err?.message || "Couldn't load your calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    loadEvents();
  }, [userData, loadEvents]);

  // Group events by local calendar day — keeps the list readable on a phone.
  const grouped = events.reduce<Record<string, ChildEvent[]>>((acc, ev) => {
    const key = formatDayKey(ev.start_time);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});
  const dayKeys = Object.keys(grouped).sort();

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cg-slate-subtle via-cg-amber-subtle to-cg-sage-subtle flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cg-slate-light/30 border-t-cg-slate-light rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-cg-slate-subtle via-cg-amber-subtle to-cg-sage-subtle">
      <header className="flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm border-b-4 border-cg-amber-subtle shadow-md sticky top-0 z-20">
        <button
          onClick={() => router.push('/my-circle/child/dashboard')}
          className="p-2 rounded-2xl bg-gradient-to-br from-cg-slate-light to-cg-slate text-white shadow-md hover:shadow-lg transition-all"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-cg-slate-light" />
            My Calendar
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            What&apos;s coming up, {userData.childName}
          </p>
        </div>
      </header>

      <main className="p-4 space-y-6 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-cg-slate-light/30 border-t-cg-slate-light rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-white border-4 border-cg-amber rounded-3xl p-5 shadow-md">
            <p className="text-base text-slate-900 font-medium">
              {error}
            </p>
            <button
              onClick={loadEvents}
              className="mt-3 px-4 py-2 rounded-2xl bg-cg-slate-light text-white font-bold shadow hover:shadow-lg"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="bg-white border-4 border-cg-amber-subtle rounded-3xl p-8 shadow-md text-center">
            <Sparkles className="h-10 w-10 text-cg-amber mx-auto mb-3" />
            <p className="text-xl font-extrabold text-slate-900 mb-1">
              Nothing coming up
            </p>
            <p className="text-sm text-slate-600 font-medium">
              When a grown-up adds something to your calendar, it shows up
              right here.
            </p>
          </div>
        )}

        {!loading && !error && dayKeys.map((day) => (
          <section key={day} className="space-y-3">
            <h2 className="text-lg font-extrabold text-slate-800 px-2">
              {formatDayHeader(grouped[day][0].start_time)}
            </h2>

            <div className="space-y-3">
              {grouped[day].map((ev) => {
                const { Icon, label, accent } = iconFor(ev.event_type);
                return (
                  <article
                    key={ev.id}
                    className="bg-white border-4 border-cg-amber-subtle rounded-3xl p-4 shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-md flex-shrink-0`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {label}
                        </p>
                        <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                          {ev.title}
                        </h3>
                        {ev.description && (
                          <p className="text-sm text-slate-700 mt-1 font-medium">
                            {ev.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-sm font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTime(ev.start_time)}
                          </span>
                          {ev.created_by_child && (
                            <span className="inline-flex items-center gap-1 text-cg-sage-dark">
                              <Sparkles className="h-4 w-4" />
                              You added this
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

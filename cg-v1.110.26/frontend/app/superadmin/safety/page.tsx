'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, AlertTriangle, PhoneOff, Repeat, RefreshCw } from 'lucide-react';
import { adminAPI, type SafetyIncidents } from '@/lib/admin-api';

const SEVERITIES = ['', 'low', 'medium', 'high', 'severe'];
const sevColor: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
};

export default function ChildSafetyPage() {
  const [data, setData] = useState<SafetyIncidents | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [minSeverity, setMinSeverity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getSafetyIncidents({ days, minSeverity: minSeverity || undefined });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [days, minSeverity]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Child Safety</h1>
            <p className="text-sm text-slate-500">
              Platform-wide KidSpace incidents across all families.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
          <select
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s ? `≥ ${s}` : 'Any severity'}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} label="Flagged messages" value={data?.flagged_message_count} />
        <StatCard icon={<PhoneOff className="h-5 w-5 text-orange-600" />} label="Flagged calls" value={data?.flagged_call_count} />
        <StatCard icon={<PhoneOff className="h-5 w-5 text-red-600" />} label="Terminated calls" value={data?.terminated_call_count} />
        <StatCard icon={<Repeat className="h-5 w-5 text-red-700" />} label="Repeat contacts" value={data?.repeat_contact_count} />
      </div>

      {/* Repeat offenders */}
      <Section title="Repeat-offender circle contacts" subtitle="Contacts flagged across multiple families or sessions">
        {data && data.repeat_contacts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Contact</th>
                <th>Families</th>
                <th>Incidents</th>
                <th>Terminated</th>
              </tr>
            </thead>
            <tbody>
              {data.repeat_contacts.map((c) => (
                <tr key={c.circle_contact_id} className="border-t border-slate-100">
                  <td className="py-2 font-medium text-slate-900">{c.contact_name}</td>
                  <td>{c.families_count > 1 ? <span className="font-semibold text-red-700">{c.families_count}</span> : c.families_count}</td>
                  <td>{c.incident_count}</td>
                  <td>{c.terminated_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty loading={loading} text="No repeat offenders in this window." />
        )}
      </Section>

      {/* Calls */}
      <Section title="Flagged & terminated calls">
        {data && data.call_incidents.length > 0 ? (
          <div className="space-y-2">
            {data.call_incidents.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.aria_terminated && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">TERMINATED</span>
                    )}
                    <span className="text-slate-700">{c.intervention_count} intervention(s)</span>
                    {c.has_recording && <span className="text-xs text-slate-400">• recording on file</span>}
                  </div>
                  <span className="text-xs text-slate-400">{c.occurred_at?.slice(0, 16).replace('T', ' ')}</span>
                </div>
                {c.termination_reason && <p className="mt-1 text-slate-600">Reason: {c.termination_reason}</p>}
                {c.flags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.flags.map((f, i) => (
                      <span key={i} className={`rounded px-2 py-0.5 text-xs ${sevColor[f.severity] || 'bg-slate-100'}`}>
                        {f.severity}: {(f.categories || []).join(', ') || 'flagged'}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-slate-400">Family {c.family_file_id.slice(0, 8)} · Child {c.child_id.slice(0, 8)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty loading={loading} text="No flagged calls in this window." />
        )}
      </Section>

      {/* Messages */}
      <Section title="Flagged messages">
        {data && data.message_incidents.length > 0 ? (
          <div className="space-y-2">
            {data.message_incidents.map((m) => (
              <div key={m.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${sevColor[m.severity] || 'bg-slate-100'}`}>{m.severity}</span>
                    <span className="font-medium text-slate-900">{m.sender_name}</span>
                    <span className="text-xs text-slate-400">({m.sender_type})</span>
                    {m.is_hidden && <span className="text-xs font-semibold text-red-700">hidden</span>}
                  </div>
                  <span className="text-xs text-slate-400">{m.occurred_at?.slice(0, 16).replace('T', ' ')}</span>
                </div>
                {m.category && <p className="mt-1 text-slate-700">{m.category}{m.reason ? ` — ${m.reason}` : ''}</p>}
                <p className="mt-1 text-xs text-slate-400">Family {m.family_file_id.slice(0, 8)} · Child {m.child_id.slice(0, 8)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty loading={loading} text="No flagged messages in this window." />
        )}
      </Section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">{icon}<span className="text-sm text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Empty({ loading, text }: { loading: boolean; text: string }) {
  return <p className="py-4 text-center text-sm text-slate-400">{loading ? 'Loading…' : text}</p>;
}

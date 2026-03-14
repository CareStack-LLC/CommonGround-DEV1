'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Shield, Mail, Phone, Calendar, Clock,
  FileText, MessageSquare, Zap, Check, X, AlertTriangle,
  ExternalLink, User as UserIcon, CreditCard, Activity,
  Lock, Unlock, Globe, MapPin,
} from 'lucide-react';
import { adminAPI, type AdminUserDetail } from '@/lib/admin-api';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const TIER_COLORS: Record<string, string> = {
  web_starter: 'bg-zinc-700/50 text-zinc-400',
  plus: 'bg-blue-500/15 text-blue-400',
  complete: 'bg-violet-500/15 text-violet-400',
  professional_starter: 'bg-teal-500/15 text-teal-400',
  solo: 'bg-emerald-500/15 text-emerald-400',
  small_firm: 'bg-amber-500/15 text-amber-400',
  mid_size: 'bg-rose-500/15 text-rose-400',
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate' | null>(null);
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'files'>('overview');

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getUserDetail(userId);
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleStatusUpdate = async () => {
    if (!user || !statusAction || reason.length < 3) return;
    try {
      setUpdating(true);
      await adminAPI.updateUserStatus(userId, statusAction === 'activate', reason);
      await fetchUser();
      setStatusAction(null);
      setReason('');
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-zinc-800/60 rounded-lg h-10 w-48" />
        <div className="animate-pulse bg-zinc-800/60 rounded-xl h-60" />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="animate-pulse bg-zinc-800/60 rounded-xl h-48" />
          <div className="animate-pulse bg-zinc-800/60 rounded-xl h-48" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-zinc-400 mb-4">{error || 'User not found'}</p>
        <button onClick={() => router.push('/superadmin/users')} className="text-sm text-violet-400 hover:text-violet-300">
          Back to users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back & Header */}
      <button onClick={() => router.push('/superadmin/users')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All users
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center text-xl font-bold text-violet-300 border border-violet-500/20">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {user.first_name} {user.last_name}
              {user.is_admin && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
                  {user.admin_role || 'Admin'}
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            user.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={MessageSquare} label="Messages Sent" value={user.stats.messages_sent} />
        <StatCard icon={Zap} label="ARIA Flags" value={user.stats.aria_interventions} />
        <StatCard icon={FileText} label="Family Files" value={user.stats.family_files} />
        <StatCard icon={Clock} label="Last Active" value={timeAgo(user.last_active)} isText />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-zinc-800/60">
        {(['overview', 'activity', 'files'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'files' ? 'Family Files' : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Account Info */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Account Information</h3>
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Phone" value={user.phone || '—'} />
              <InfoRow icon={Check} label="Email Verified" value={user.email_verified ? 'Yes' : 'No'} valueColor={user.email_verified ? 'text-emerald-400' : 'text-zinc-500'} />
              <InfoRow icon={Lock} label="MFA" value={user.mfa_enabled ? 'Enabled' : 'Disabled'} valueColor={user.mfa_enabled ? 'text-emerald-400' : 'text-zinc-500'} />
              <InfoRow icon={Globe} label="Timezone" value={user.profile?.timezone || '—'} />
              <InfoRow icon={MapPin} label="State" value={user.profile?.state || '—'} />
              <InfoRow icon={Calendar} label="Created" value={formatDate(user.created_at)} />
              <InfoRow icon={Clock} label="Last Login" value={formatDate(user.last_login)} />
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Subscription</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Tier</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[user.profile?.subscription_tier || ''] || 'bg-zinc-800 text-zinc-500'}`}>
                  {(user.profile?.subscription_tier || 'unknown').replace('_', ' ')}
                </span>
              </div>
              <InfoRow icon={Activity} label="Status" value={user.profile?.subscription_status || '—'} valueColor={
                user.profile?.subscription_status === 'active' ? 'text-emerald-400' :
                user.profile?.subscription_status === 'trial' ? 'text-blue-400' :
                user.profile?.subscription_status === 'past_due' ? 'text-amber-400' : 'text-zinc-500'
              } />
              <InfoRow icon={Calendar} label="Period Start" value={formatDate(user.profile?.subscription_period_start || null)} />
              <InfoRow icon={Calendar} label="Period End" value={formatDate(user.profile?.subscription_period_end || null)} />
              {user.profile?.stripe_customer_id && (
                <InfoRow icon={CreditCard} label="Stripe ID" value={user.profile.stripe_customer_id} mono />
              )}
              {user.profile?.stripe_subscription_id && (
                <InfoRow icon={CreditCard} label="Sub ID" value={user.profile.stripe_subscription_id} mono />
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4">Account Actions</h3>
            {statusAction ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  {statusAction === 'deactivate' ? 'Deactivating' : 'Activating'} account for <span className="text-zinc-200 font-medium">{user.first_name} {user.last_name}</span>
                </p>
                <input
                  type="text"
                  placeholder="Reason for change (required, min 3 chars)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleStatusUpdate}
                    disabled={reason.length < 3 || updating}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                      statusAction === 'deactivate'
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {updating ? 'Processing...' : statusAction === 'deactivate' ? 'Confirm Deactivate' : 'Confirm Activate'}
                  </button>
                  <button onClick={() => { setStatusAction(null); setReason(''); }} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setStatusAction(user.is_active ? 'deactivate' : 'activate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  user.is_active
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                }`}
              >
                {user.is_active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Recent Activity</h3>
          {user.recent_activity.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No recent activity recorded.</p>
          ) : (
            <div className="space-y-0">
              {user.recent_activity.map((event, i) => (
                <div key={event.id} className="flex gap-3 py-3 border-b border-zinc-800/40 last:border-b-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${event.status === 'success' ? 'bg-emerald-500' : event.status === 'error' ? 'bg-red-500' : 'bg-zinc-600'}`} />
                    {i < user.recent_activity.length - 1 && <div className="w-px flex-1 bg-zinc-800/60 mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="text-sm text-zinc-300 capitalize">
                      {event.action.replace('admin:', '').replace(/_/g, ' ')}
                    </div>
                    {event.description && (
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">{event.description}</div>
                    )}
                    <div className="text-[11px] text-zinc-600 mt-1">{formatDate(event.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Family Files</h3>
          {user.family_files.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No family files associated with this user.</p>
          ) : (
            <div className="space-y-2">
              {user.family_files.map((ff) => (
                <div key={ff.id} className="flex items-center gap-4 px-4 py-3 bg-zinc-800/30 rounded-lg">
                  <FileText className="w-5 h-5 text-violet-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 font-medium truncate">{ff.title}</div>
                    <div className="text-xs text-zinc-500">{ff.file_number}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ff.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}>{ff.status}</span>
                  <span className="text-xs text-zinc-600">{formatDate(ff.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, isText }: { icon: React.ElementType; label: string; value: string | number; isText?: boolean }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-[11px] text-zinc-500">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${isText ? 'text-zinc-300 text-sm' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, valueColor, mono }: {
  icon: React.ElementType; label: string; value: string; valueColor?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className={`text-xs ${valueColor || 'text-zinc-300'} ${mono ? 'font-mono text-[11px]' : ''} max-w-[200px] truncate`}>{value}</span>
    </div>
  );
}

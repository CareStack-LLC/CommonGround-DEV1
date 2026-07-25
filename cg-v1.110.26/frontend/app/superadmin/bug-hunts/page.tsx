'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FlaskConical, Plus, RefreshCw, CheckCircle2, Clock, Archive,
  Bug, Users, ChevronRight,
} from 'lucide-react';
import { adminAPI, type BugHuntCohort } from '@/lib/admin-api';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700/50 text-[#8AACBC]',
  seeding: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  active: 'bg-cg-sage/15 text-cg-sage border border-cg-sage/20',
  completed: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  archived: 'bg-zinc-700/50 text-zinc-500',
};

const FEATURE_COLORS: Record<string, string> = {
  exchange: 'bg-orange-500/15 text-orange-400',
  messaging: 'bg-blue-500/15 text-blue-400',
  agreement: 'bg-cg-sage/15 text-cg-sage',
  custody_tracking: 'bg-yellow-500/15 text-yellow-400',
  clearfund: 'bg-purple-500/15 text-purple-400',
  general: 'bg-zinc-700/50 text-[#8AACBC]',
};

const FEATURE_LABELS: Record<string, string> = {
  exchange: 'Exchange System',
  messaging: 'Messaging',
  agreement: 'Agreements',
  custody_tracking: 'Custody Tracking',
  clearfund: 'ClearFund',
  general: 'General',
};

const AGREEMENT_BADGE: Record<string, string> = {
  good_faith: 'bg-emerald-500/15 text-emerald-400',
  'co-operative': 'bg-blue-500/15 text-blue-400',
  comprehensive: 'bg-purple-500/15 text-purple-400',
};

function getDistinctVersions(cohort: BugHuntCohort): string[] {
  const families = cohort.seed_config?.families as { agreement_version?: string }[] | undefined;
  if (!families) return [];
  return [...new Set(families.map(f => f.agreement_version).filter(Boolean))] as string[];
}

type FilterTab = 'active' | 'completed' | 'all';

export default function BugHuntsPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<BugHuntCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('active');

  const fetchCohorts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusMap: Record<FilterTab, string | undefined> = {
        active: 'active',
        completed: 'completed',
        all: undefined,
      };
      const data = await adminAPI.listBugHunts(statusMap[tab]);
      setCohorts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchCohorts(); }, [fetchCohorts]);

  const activeCounts = {
    active: cohorts.filter(c => c.status === 'active' || c.status === 'seeding' || c.status === 'draft').length,
    completed: cohorts.filter(c => c.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FlaskConical className="w-7 h-7 text-cg-sage" />
            Bug Hunt Cohorts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Organized QA testing sessions with generated test data</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCohorts()}
            className="p-2 rounded-lg hover:bg-cg-slate/20 transition-colors text-[#8AACBC]"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => router.push('/superadmin/bug-hunts/new')}
            className="flex items-center gap-2 px-4 py-2 bg-cg-sage text-white rounded-lg hover:bg-cg-sage/80 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Bug Hunt
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-foreground/50 rounded-lg p-1 w-fit">
        {(['active', 'completed', 'all'] as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-cg-slate/40 text-white'
                : 'text-muted-foreground hover:text-[#8AACBC]'
            }`}
          >
            {t === 'active' ? 'Active' : t === 'completed' ? 'Completed' : 'All'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-foreground/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && cohorts.length === 0 && (
        <div className="text-center py-16 bg-foreground/30 rounded-xl border border-cg-slate/20">
          <FlaskConical className="w-12 h-12 text-[#4A6E7F] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#8AACBC] mb-2">No bug hunts yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first organized testing session</p>
          <button
            onClick={() => router.push('/superadmin/bug-hunts/new')}
            className="px-4 py-2 bg-cg-sage text-white rounded-lg hover:bg-cg-sage/80 transition-colors text-sm font-medium"
          >
            Create Bug Hunt
          </button>
        </div>
      )}

      {/* Cohort list */}
      {!loading && cohorts.length > 0 && (
        <div className="space-y-3">
          {cohorts.map(cohort => (
            <button
              key={cohort.id}
              onClick={() => router.push(`/superadmin/bug-hunts/${cohort.id}`)}
              className="w-full text-left bg-foreground/50 hover:bg-foreground/70 border border-cg-slate/20 hover:border-cg-slate/40 rounded-xl p-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-white font-medium truncate">{cohort.name}</h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[cohort.status] || STATUS_COLORS.draft}`}>
                      {cohort.status}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FEATURE_COLORS[cohort.target_feature] || FEATURE_COLORS.general}`}>
                      {FEATURE_LABELS[cohort.target_feature] || cohort.target_feature}
                    </span>
                    {getDistinctVersions(cohort).map(v => (
                      <span key={v} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${AGREEMENT_BADGE[v] || 'bg-zinc-700/50 text-zinc-400'}`}>
                        {v.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  {cohort.description && (
                    <p className="text-sm text-muted-foreground truncate mb-2">{cohort.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {cohort.families_count ?? cohort.family_count} families
                    </span>
                    <span className="flex items-center gap-1">
                      <Bug className="w-3 h-3" />
                      {cohort.bugs_count ?? 0} bugs
                    </span>
                    {cohort.checklist_progress !== undefined && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {cohort.checklist_progress}% complete
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(cohort.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cohort.checklist_progress !== undefined && cohort.checklist_progress > 0 && (
                    <div className="w-20 h-1.5 bg-cg-slate/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cg-sage rounded-full transition-all"
                        style={{ width: `${cohort.checklist_progress}%` }}
                      />
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-[#4A6E7F] group-hover:text-[#8AACBC] transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

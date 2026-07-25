'use client';

import { CheckCircle, XCircle, RotateCcw, Loader2, GitCommit } from 'lucide-react';
import { timeAgo } from './helpers';

interface Deployment {
  id: string;
  environment: string;
  status: string;
  commit_sha?: string;
  commit_message?: string;
  branch?: string;
  deployed_by?: string;
  deployed_at: string;
  duration_seconds?: number;
}

interface DeploymentTimelineProps {
  deployments: Deployment[];
  loading?: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; dot: string }> = {
  success: { icon: CheckCircle, color: 'text-emerald-400', dot: 'bg-emerald-400' },
  failed: { icon: XCircle, color: 'text-red-400', dot: 'bg-red-400' },
  rolled_back: { icon: RotateCcw, color: 'text-amber-400', dot: 'bg-amber-400' },
  in_progress: { icon: Loader2, color: 'text-cg-slate-light', dot: 'bg-cg-slate-light' },
};

const ENV_BADGES: Record<string, string> = {
  production: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  staging: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  preview: 'bg-cg-slate-light/15 text-cg-slate-light border-cg-slate-light/30',
};

export function DeploymentTimeline({ deployments, loading }: DeploymentTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-foreground/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!deployments.length) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No deployments recorded yet</div>;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-cg-slate/30" />

      <div className="space-y-1">
        {deployments.map((deploy) => {
          const config = STATUS_CONFIG[deploy.status] || STATUS_CONFIG.success;
          const Icon = config.icon;
          const envBadge = ENV_BADGES[deploy.environment] || ENV_BADGES.preview;

          return (
            <div key={deploy.id} className="relative pl-10 py-2 group">
              {/* Timeline dot */}
              <div className={`absolute left-3 top-4 w-3 h-3 rounded-full ${config.dot} border-2 border-[#162D3A]`} />

              <div className="bg-[#1A3648]/40 border border-cg-slate/15 rounded-lg px-3 py-2.5 hover:border-cg-slate/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${config.color} ${deploy.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${envBadge}`}>
                    {deploy.environment}
                  </span>
                  <span className={`text-xs ${config.color} capitalize`}>{deploy.status.replace('_', ' ')}</span>
                  <span className="text-[10px] text-[#4A6E7F] ml-auto">{timeAgo(deploy.deployed_at)}</span>
                </div>

                {deploy.commit_message && (
                  <div className="text-xs text-[#8AACBC] line-clamp-1 mb-1">{deploy.commit_message}</div>
                )}

                <div className="flex items-center gap-3 text-[10px] text-[#4A6E7F]">
                  {deploy.commit_sha && (
                    <span className="flex items-center gap-1 font-mono">
                      <GitCommit className="w-2.5 h-2.5" />
                      {deploy.commit_sha.slice(0, 7)}
                    </span>
                  )}
                  {deploy.branch && <span>{deploy.branch}</span>}
                  {deploy.deployed_by && <span>by {deploy.deployed_by}</span>}
                  {deploy.duration_seconds && <span>{deploy.duration_seconds}s</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

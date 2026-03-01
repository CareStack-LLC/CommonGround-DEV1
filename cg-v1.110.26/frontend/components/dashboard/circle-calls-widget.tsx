'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Video, Clock, AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { circleCallsAPI, CircleCallHistoryItem } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CircleCallsWidgetProps {
  familyFileId: string;
  className?: string;
}

export default function CircleCallsWidget({ familyFileId, className }: CircleCallsWidgetProps) {
  const router = useRouter();
  const [calls, setCalls] = useState<CircleCallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentCalls();
  }, [familyFileId]);

  async function loadRecentCalls() {
    try {
      setIsLoading(true);
      const callHistory = await circleCallsAPI.getCallHistory(familyFileId, { limit: 5 });
      setCalls(callHistory);
      setError(null);
    } catch (err) {
      console.error('Failed to load circle calls:', err);
      setError('Unable to load call history');
    } finally {
      setIsLoading(false);
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const mins = Math.floor(diff / (1000 * 60));
      return mins < 1 ? 'Just now' : `${mins}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function getStatusColor(status: string, hasFlags: boolean): string {
    if (hasFlags) return 'text-amber-600 bg-amber-50';
    if (status === 'completed') return 'text-green-600 bg-green-50';
    if (status === 'missed') return 'text-gray-500 bg-gray-100';
    if (status === 'terminated') return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  }

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            Circle Calls
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            Circle Calls
          </h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-200 p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            Circle Calls
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <Phone className="h-8 w-8 text-purple-400" />
          </div>
          <p className="text-sm text-muted-foreground">No circle calls yet</p>
          <p className="text-xs text-gray-500 mt-1">Circle contacts can call your children</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalCalls = calls.length;
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
  const flaggedCalls = calls.filter(c => c.aria_intervention_count > 0).length;

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-purple-500" />
            Circle Calls
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCalls} {totalCalls === 1 ? 'call' : 'calls'} • {formatDuration(totalDuration)} total
          </p>
        </div>
        <button
          onClick={() => router.push(`/family-files/${familyFileId}/circle-calls`)}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Safety Notice if flags */}
      {flaggedCalls > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {flaggedCalls} {flaggedCalls === 1 ? 'call has' : 'calls have'} safety notices
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              ARIA detected concerning content
            </p>
          </div>
        </div>
      )}

      {/* Recent Calls List */}
      <div className="space-y-2">
        {calls.map((call) => (
          <button
            key={call.id}
            onClick={() => router.push(`/family-files/${familyFileId}/circle-calls/${call.id}`)}
            className="w-full p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200"
          >
            <div className="flex items-center gap-3">
              {/* Call Type Icon */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                call.call_type === 'video' ? 'bg-purple-100' : 'bg-slate-100'
              )}>
                {call.call_type === 'video' ? (
                  <Video className="h-5 w-5 text-purple-600" />
                ) : (
                  <Phone className="h-5 w-5 text-slate-600" />
                )}
              </div>

              {/* Call Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate">
                    {call.circle_contact_name} → {call.child_name}
                  </p>
                  {call.aria_intervention_count > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 rounded-full">
                      <Shield className="h-3 w-3 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">
                        {call.aria_intervention_count}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(call.initiated_at)}
                  </span>
                  {call.duration_seconds && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className={cn(
                'px-2 py-1 rounded-full text-xs font-medium flex-shrink-0',
                getStatusColor(call.status, call.aria_intervention_count > 0)
              )}>
                {call.aria_terminated_call ? 'Ended' : call.status === 'completed' ? 'Done' : call.status}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Phone,
  Video,
  Clock,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Calendar,
  Filter,
  X,
} from 'lucide-react';
import { circleCallsAPI, CircleCallHistoryItem, CircleCallReport } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function CircleCallsHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;

  const [calls, setCalls] = useState<CircleCallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [callReport, setCallReport] = useState<CircleCallReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChild, setFilterChild] = useState<string>('all');
  const [filterContact, setFilterContact] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCallHistory();
  }, [familyFileId]);

  async function loadCallHistory() {
    try {
      setIsLoading(true);
      const history = await circleCallsAPI.getCallHistory(familyFileId, { limit: 100 });
      setCalls(history);
      setError(null);
    } catch (err) {
      console.error('Failed to load call history:', err);
      setError('Unable to load call history');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCallReport(callId: string) {
    try {
      setLoadingReport(true);
      const report = await circleCallsAPI.getCallReport(callId);
      setCallReport(report);
    } catch (err) {
      console.error('Failed to load call report:', err);
      alert('Unable to load call details');
    } finally {
      setLoadingReport(false);
    }
  }

  function handleCallClick(callId: string) {
    if (selectedCall === callId) {
      setSelectedCall(null);
      setCallReport(null);
    } else {
      setSelectedCall(callId);
      loadCallReport(callId);
    }
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getStatusColor(status: string, hasFlags: boolean): string {
    if (hasFlags) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (status === 'completed') return 'text-green-600 bg-green-50 border-green-200';
    if (status === 'missed') return 'text-gray-500 bg-gray-100 border-gray-200';
    if (status === 'terminated') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  }

  // Get unique children and contacts for filters
  const uniqueChildren = Array.from(new Set(calls.map(c => c.child_name)));
  const uniqueContacts = Array.from(new Set(calls.map(c => c.circle_contact_name)));

  // Apply filters
  const filteredCalls = calls.filter(call => {
    if (filterStatus !== 'all' && call.status !== filterStatus) return false;
    if (filterChild !== 'all' && call.child_name !== filterChild) return false;
    if (filterContact !== 'all' && call.circle_contact_name !== filterContact) return false;
    return true;
  });

  // Calculate stats
  const totalCalls = filteredCalls.length;
  const totalDuration = filteredCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
  const flaggedCalls = filteredCalls.filter(c => c.aria_intervention_count > 0).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="space-y-3 mt-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Calls</h2>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={loadCallHistory}
              className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Phone className="h-6 w-6 text-purple-500" />
                Circle Calls History
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCalls} {totalCalls === 1 ? 'call' : 'calls'} • {formatDuration(totalDuration)} total
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(filterStatus !== 'all' || filterChild !== 'all' || filterContact !== 'all') && (
                <span className="w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Filters</h3>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterChild('all');
                  setFilterContact('all');
                }}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              {/* Child Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Child
                </label>
                <select
                  value={filterChild}
                  onChange={(e) => setFilterChild(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Children</option>
                  {uniqueChildren.map((child) => (
                    <option key={child} value={child}>
                      {child}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Filter */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Contact
                </label>
                <select
                  value={filterContact}
                  onChange={(e) => setFilterContact(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Contacts</option>
                  {uniqueContacts.map((contact) => (
                    <option key={contact} value={contact}>
                      {contact}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Safety Notice */}
        {flaggedCalls > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                {flaggedCalls} {flaggedCalls === 1 ? 'call has' : 'calls have'} safety notices
              </p>
              <p className="text-sm text-amber-700 mt-1">
                ARIA detected potentially concerning content during {flaggedCalls === 1 ? 'this call' : 'these calls'}.
                Review the details below.
              </p>
            </div>
          </div>
        )}

        {/* Calls List */}
        {filteredCalls.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Phone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No calls found</h3>
            <p className="text-muted-foreground">
              {calls.length === 0
                ? 'No circle calls have been made yet'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCalls.map((call) => (
              <div key={call.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Call Summary */}
                <button
                  onClick={() => handleCallClick(call.id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                      call.call_type === 'video' ? 'bg-purple-100' : 'bg-slate-100'
                    )}>
                      {call.call_type === 'video' ? (
                        <Video className="h-6 w-6 text-purple-600" />
                      ) : (
                        <Phone className="h-6 w-6 text-slate-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">
                          {call.circle_contact_name} → {call.child_name}
                        </p>
                        {call.aria_intervention_count > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 rounded-full">
                            <Shield className="h-3 w-3 text-amber-600" />
                            <span className="text-xs font-medium text-amber-700">
                              {call.aria_intervention_count} {call.aria_intervention_count === 1 ? 'flag' : 'flags'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(call.initiated_at)}
                        </span>
                        {call.duration_seconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(call.duration_seconds)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Expand */}
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium border',
                        getStatusColor(call.status, call.aria_intervention_count > 0)
                      )}>
                        {call.aria_terminated_call ? 'Terminated' : call.status === 'completed' ? 'Completed' : call.status}
                      </span>
                      <ChevronDown className={cn(
                        'h-5 w-5 text-gray-400 transition-transform',
                        selectedCall === call.id && 'rotate-180'
                      )} />
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {selectedCall === call.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {loadingReport ? (
                      <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
                        <p className="text-sm text-muted-foreground mt-3">Loading details...</p>
                      </div>
                    ) : callReport ? (
                      <div className="space-y-4">
                        {/* Safety Rating */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-muted-foreground mb-1">Safety Rating</p>
                            <p className="text-lg font-semibold text-foreground capitalize">
                              {callReport.safety_rating.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-muted-foreground mb-1">Transcript</p>
                            <p className="text-lg font-semibold text-foreground">
                              {callReport.total_transcript_chunks} segments
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-muted-foreground mb-1">Flags</p>
                            <p className="text-lg font-semibold text-foreground">
                              {callReport.flags_count}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-muted-foreground mb-1">Recording</p>
                            <p className="text-sm font-medium text-purple-600">
                              {call.has_recording ? 'Available' : 'Processing'}
                            </p>
                          </div>
                        </div>

                        {/* Category Breakdown */}
                        {Object.keys(callReport.category_counts).length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-600" />
                              Safety Categories
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(callReport.category_counts).map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {category.replace('_', ' ')}
                                  </span>
                                  <span className="text-sm font-medium text-foreground">
                                    {count} {count === 1 ? 'instance' : 'instances'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                          <button
                            onClick={() => alert('Court report generation coming soon')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            <FileText className="h-4 w-4" />
                            View Full Report
                          </button>
                          {call.has_recording && (
                            <button
                              onClick={() => alert('Recording download coming soon')}
                              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              Recording
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No details available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

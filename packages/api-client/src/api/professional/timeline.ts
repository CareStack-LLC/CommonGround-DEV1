/**
 * Professional Timeline API
 *
 * Case timeline and event history for professionals
 */

import { fetchWithParentAuth } from '../../core';

export interface TimelineEvent {
  id: string;
  event_type: string; // message, agreement, exchange, payment, court_event, aria_flag
  title: string;
  description?: string;
  timestamp: string;
  actor_name?: string;
  actor_type?: string; // parent_a, parent_b, system, court
  // Event-specific data
  details?: Record<string, unknown>;
  // Flags
  is_flagged: boolean;
  flag_severity?: 'low' | 'medium' | 'high';
}

export interface CaseTimeline {
  family_file_id: string;
  family_file_title: string;
  total_events: number;
  events: TimelineEvent[];
  // Filters applied
  date_start?: string;
  date_end?: string;
  event_types?: string[];
}

export interface TimelineFilters {
  date_start?: string;
  date_end?: string;
  event_types?: string[];
  actor_types?: string[];
  flagged_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ComplianceOverview {
  family_file_id: string;
  period_start: string;
  period_end: string;
  exchange_compliance: ExchangeComplianceSummary;
  financial_compliance: FinancialComplianceSummary;
  communication_compliance: CommunicationComplianceSummary;
  overall_score: number; // 0-100
  overall_status: 'excellent' | 'good' | 'fair' | 'concerning';
}

export interface ExchangeComplianceSummary {
  total_exchanges: number;
  completed_on_time: number;
  completed_late: number;
  missed: number;
  disputed: number;
  completion_rate: number;
  on_time_rate: number;
  parent_a_compliance: number;
  parent_b_compliance: number;
}

export interface FinancialComplianceSummary {
  total_obligations: number;
  paid_on_time: number;
  paid_late: number;
  overdue: number;
  disputed: number;
  total_amount: number;
  paid_amount: number;
  overdue_amount: number;
  parent_a_compliance: number;
  parent_b_compliance: number;
}

export interface CommunicationComplianceSummary {
  total_messages: number;
  flagged_messages: number;
  flag_rate: number;
  average_response_time_hours: number;
  parent_a_flag_rate: number;
  parent_b_flag_rate: number;
}

/**
 * Get case timeline
 */
export async function getCaseTimeline(
  familyFileId: string,
  filters?: TimelineFilters
): Promise<CaseTimeline> {
  const searchParams = new URLSearchParams();
  if (filters?.date_start) searchParams.set('date_start', filters.date_start);
  if (filters?.date_end) searchParams.set('date_end', filters.date_end);
  if (filters?.event_types) searchParams.set('event_types', filters.event_types.join(','));
  if (filters?.actor_types) searchParams.set('actor_types', filters.actor_types.join(','));
  if (filters?.flagged_only) searchParams.set('flagged_only', 'true');
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.offset) searchParams.set('offset', filters.offset.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<CaseTimeline>(
    `/professional/cases/${familyFileId}/timeline${query ? `?${query}` : ''}`
  );
}

/**
 * Get case compliance overview
 */
export async function getComplianceOverview(
  familyFileId: string,
  params?: {
    period_days?: number;
  }
): Promise<ComplianceOverview> {
  const searchParams = new URLSearchParams();
  if (params?.period_days) searchParams.set('period_days', params.period_days.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<ComplianceOverview>(
    `/professional/cases/${familyFileId}/compliance${query ? `?${query}` : ''}`
  );
}

/**
 * Get flagged events only
 */
export async function getFlaggedEvents(
  familyFileId: string,
  params?: {
    severity?: 'low' | 'medium' | 'high';
    limit?: number;
    offset?: number;
  }
): Promise<TimelineEvent[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('flagged_only', 'true');
  if (params?.severity) searchParams.set('severity', params.severity);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetchWithParentAuth<CaseTimeline>(
    `/professional/cases/${familyFileId}/timeline?${searchParams.toString()}`
  );
  return response.events;
}

/**
 * Export timeline for court
 */
export async function exportTimeline(
  familyFileId: string,
  params: {
    date_start?: string;
    date_end?: string;
    event_types?: string[];
    include_attachments?: boolean;
    format?: 'pdf' | 'json';
  }
): Promise<{ download_url: string; expires_at: string }> {
  return fetchWithParentAuth(`/professional/cases/${familyFileId}/timeline/export`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

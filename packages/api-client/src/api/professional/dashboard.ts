/**
 * Professional Dashboard API
 *
 * Dashboard data aggregation for professionals
 */

import { fetchWithParentAuth } from '../../core';
import type { CaseSummaryCard, UpcomingEvent } from './cases';

export interface Alert {
  id: string;
  alert_type: string; // intake_completed, compliance_issue, court_date_approaching, etc.
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  family_file_id?: string;
  family_file_title?: string;
  created_at: string;
  action_url?: string;
}

export interface PendingAction {
  id: string;
  action_type: string; // review_intake, approve_request, sign_document, etc.
  title: string;
  description: string;
  family_file_id?: string;
  family_file_title?: string;
  due_at?: string;
  created_at: string;
}

export interface RecentActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  family_file_id?: string;
  family_file_title?: string;
  actor_name?: string;
  created_at: string;
}

export interface ProfessionalDashboard {
  case_count: number;
  active_cases: number;
  pending_intakes: number;
  pending_approvals: number;
  unread_messages: number;
  cases: CaseSummaryCard[];
  alerts: Alert[];
  pending_actions: PendingAction[];
  upcoming_events: UpcomingEvent[];
  recent_activity: RecentActivity[];
}

export interface DashboardFilters {
  date_range?: 'today' | 'week' | 'month' | 'quarter';
  include_completed?: boolean;
  limit_cases?: number;
  limit_events?: number;
  limit_activity?: number;
}

/**
 * Get professional dashboard data
 */
export async function getDashboard(filters?: DashboardFilters): Promise<ProfessionalDashboard> {
  const searchParams = new URLSearchParams();
  if (filters?.date_range) searchParams.set('date_range', filters.date_range);
  if (filters?.include_completed) searchParams.set('include_completed', 'true');
  if (filters?.limit_cases) searchParams.set('limit_cases', filters.limit_cases.toString());
  if (filters?.limit_events) searchParams.set('limit_events', filters.limit_events.toString());
  if (filters?.limit_activity) searchParams.set('limit_activity', filters.limit_activity.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<ProfessionalDashboard>(`/professional/dashboard${query ? `?${query}` : ''}`);
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/dashboard/alerts/${alertId}/dismiss`, {
    method: 'POST',
  });
}

/**
 * Mark pending action as done
 */
export async function completeAction(actionId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/dashboard/actions/${actionId}/complete`, {
    method: 'POST',
  });
}

/**
 * Get upcoming events across all cases
 */
export async function getUpcomingEvents(params?: {
  days?: number;
  limit?: number;
}): Promise<UpcomingEvent[]> {
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set('days', params.days.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<UpcomingEvent[]>(`/professional/dashboard/events${query ? `?${query}` : ''}`);
}

/**
 * Get recent activity across all cases
 */
export async function getRecentActivity(params?: {
  limit?: number;
  offset?: number;
  family_file_id?: string;
}): Promise<RecentActivity[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.family_file_id) searchParams.set('family_file_id', params.family_file_id);

  const query = searchParams.toString();
  return fetchWithParentAuth<RecentActivity[]>(`/professional/dashboard/activity${query ? `?${query}` : ''}`);
}

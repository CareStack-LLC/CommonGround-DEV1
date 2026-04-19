/**
 * SuperAdmin API Client
 *
 * All calls require an admin JWT token (user.is_admin === true).
 * Includes Sentry breadcrumbs and automatic retry for transient failures.
 */

import * as Sentry from '@sentry/nextjs';

let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
const API_URL = apiUrl;

/** HTTP status codes that are safe to retry automatically. */
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1,
): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const method = options.method || 'GET';

  Sentry.addBreadcrumb({
    category: 'admin-api',
    message: `${method} ${endpoint}`,
    level: 'info',
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!res.ok) {
        // Retry on transient server errors (only for GET requests)
        if (RETRYABLE_STATUSES.has(res.status) && method === 'GET' && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const errorMsg = err.detail || `Admin API error ${res.status}`;

        Sentry.addBreadcrumb({
          category: 'admin-api',
          message: `${method} ${endpoint} → ${res.status}`,
          level: 'error',
          data: { status: res.status, detail: err.detail },
        });

        throw new Error(errorMsg);
      }

      return res.json();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Retry on network failures (Failed to fetch) for GET requests
      if (
        err instanceof TypeError &&
        err.message === 'Failed to fetch' &&
        method === 'GET' &&
        attempt < retries
      ) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      // If not retryable, throw immediately
      if (attempt >= retries) {
        Sentry.addBreadcrumb({
          category: 'admin-api',
          message: `${method} ${endpoint} failed: ${lastError.message}`,
          level: 'error',
        });
        throw lastError;
      }
    }
  }

  throw lastError || new Error(`Admin API call failed: ${endpoint}`);
}

async function adminFetchBlob(endpoint: string): Promise<Blob> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Admin API error ${res.status}`);
  }

  return res.blob();
}

/**
 * Trigger a browser file download for an auth-protected CSV endpoint.
 * Uses fetch + blob + a synthetic anchor so the Authorization header is
 * included (plain <a href> / window.open don't send headers).
 */
export async function triggerCsvDownload(
  endpoint: string,
  filename?: string,
): Promise<void> {
  const blob = await adminFetchBlob(endpoint);
  // Fallback filename from the endpoint path if none provided
  const name =
    filename ||
    (endpoint.split('?')[0].split('/').pop() || 'export.csv');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Types ---

export interface DashboardData {
  users: { total: number; active_30d: number; active_today: number; new_7d: number; new_24h: number; admins?: number; parents?: number; professionals?: number };
  family_files: { active: number };
  professionals: { total: number };
  subscriptions: { tier_breakdown: Record<string, number>; estimated_mrr: number; mrr?: number; mrr_source?: string; mrr_by_tier?: Record<string, { count: number; price: number; mrr: number }>; mrr_by_segment?: Record<string, number>; past_due_count: number; active_subscriptions?: number };
  engagement: { messages_7d: number; aria_interventions_7d: number };
  recent_signups: { id: string; name: string; created_at: string | null }[];
  recent_admin_actions: { id: string; action: string; user_email: string; description: string | null; created_at: string | null }[];
  generated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string | null;
  last_login: string | null;
  last_active: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  is_admin: boolean;
  admin_role: string | null;
  mfa_enabled: boolean;
  email_verified: boolean;
  created_at: string | null;
  last_login: string | null;
  last_active: string | null;
  profile: {
    subscription_tier: string;
    subscription_status: string;
    subscription_ends_at: string | null;
    subscription_period_start: string | null;
    subscription_period_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    timezone: string | null;
    state: string | null;
  } | null;
  family_file_count: number;
  stats: {
    messages_sent: number;
    aria_interventions: number;
    family_files: number;
  };
  family_files: {
    id: string;
    file_number: string;
    title: string;
    status: string;
    created_at: string | null;
  }[];
  recent_activity: {
    id: string;
    action: string;
    description: string | null;
    created_at: string | null;
    status: string;
  }[];
}

export interface UserSearchResult {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface StripePayment {
  id: string;
  customer: string;
  customer_email: string | null;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string | null;
}

export interface StripeLiveData {
  stripe_available: boolean;
  active_subscriptions?: number;
  total_mrr?: number;
  total_customers?: number;
  recent_payments?: StripePayment[];
  error?: string;
}

export interface StripeHealthData {
  total_profiles: number;
  with_stripe_customer: number;
  with_stripe_subscription: number;
  paid_no_stripe_sub: number;
  products_expected: string[];
  products_verified: {
    id: string;
    tier: string;
    name: string | null;
    active: boolean;
    found: boolean;
  }[];
}

export interface BillingOverview {
  consumer_subscriptions: Record<string, { total: number; statuses: Record<string, number> }>;
  professional_subscriptions: Record<string, number>;
  past_due_count: number;
  trial_count: number;
  cancelled_30d: number;
  new_paid_30d: number;
  mrr_by_tier: Record<string, { count: number; price: number; mrr: number }>;
  total_mrr: number;
  estimated_mrr: number;
  verified_mrr: number | null;
  mrr_by_segment?: Record<string, number>;
  mrr_source?: string;
  stripe_live: StripeLiveData | null;
  stripe_health: StripeHealthData | null;
  valuation?: Record<string, number>;
  refunds?: {
    recent_refunds: { id: string; amount: number; reason: string | null; status: string; created: string }[];
    total_refunded_30d: number;
    refund_count_30d: number;
    disputes: { id: string; amount: number; status: string; reason: string; created: string }[];
    dispute_count: number;
  } | null;
  note: string;
}

export interface UserSegments {
  admins: number;
  parents: number;
  professionals: number;
  partner_staff: number;
  total: number;
  paying_parents: number;
  paying_professionals: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  user_email: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface AuditLogResult {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface GrowthStats {
  period_days: number;
  daily_registrations: { date: string; count: number }[];
  total_new_users: number;
}

export interface EngagementStats {
  period_days: number;
  daily_messages: { date: string; count: number }[];
  daily_aria_interventions: { date: string; count: number }[];
  totals: {
    messages: number;
    aria_interventions: number;
    aria_acceptance_rate: number;
    new_family_files: number;
    new_agreements: number;
  };
}

export interface ReportRequest {
  id: string;
  action: string;
  user_email: string | null;
  description: string | null;
  status: string;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ReportListResult {
  reports: ReportRequest[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReportCreateResult {
  id: string;
  report_type: string;
  status: string;
  requested_at: string;
  requested_by: string;
  row_count?: number;
  message: string;
}

export interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'critical';
  active_sessions: number;
  errors_24h: number;
  suspicious_24h: number;
  database: {
    users: number;
    profiles: number;
    audit_logs: number;
  };
  checked_at: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  already_synced?: number;
  total_checked?: number;
  checked?: number;
  updated?: number;
  errors: { user_id?: string; email?: string; customer_id?: string; error: string }[];
}

export interface TierConfig {
  tiers: { name: string; price: number; user_count: number; is_paid: boolean }[];
}

// Chatbot admin types
export interface ChatbotSessionListItem {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: string;
  message_count: number;
  started_at: string;
  ended_at: string | null;
}

export interface ChatbotSessionsListResponse {
  sessions: ChatbotSessionListItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChatbotMessageItem {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatbotSessionDetail {
  id: string;
  visitor: { name: string | null; email: string | null; phone: string | null; source_page: string | null };
  status: string;
  message_count: number;
  started_at: string;
  ended_at: string | null;
  escalation_reason: string | null;
  transcript_emailed: boolean;
  messages: ChatbotMessageItem[];
}

export interface ChatbotAdminStats {
  total_sessions: number;
  active_today: number;
  avg_messages_per_session: number;
  escalation_rate: number;
  total_visitors: number;
}

export interface WeeklyReport {
  generated_at: string;
  period: { start: string; end: string };
  users: { total: number; new_this_week: number; growth_pct: number | null; active_30d: number };
  revenue: { estimated_mrr: number; paying_users: number; tier_breakdown: Record<string, number> };
  engagement: { messages_this_week: number; message_growth_pct: number | null; aria_flags_this_week: number };
  platform: { active_family_files: number; total_professionals: number };
  bugs: { open_sentry_issues: number };
}

export interface BugCategory {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  user_reported: number;
  frontend: number;
  backend: number;
  issues: Record<string, any[]>;
}

export interface SprintPlan {
  days: number;
  plan: Record<string, any[]>;
  total_items: number;
  deferred: any[];
  investigate: any[];
  summary: string;
  top_3: string[];
}

// ── Bug Hunt Cohort Types ───────────────────────────────────────────

export interface BugHuntCohort {
  id: string;
  name: string;
  description: string | null;
  target_feature: string;
  status: string;
  family_count: number;
  test_instructions: string | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  seed_config: Record<string, any> | null;
  summary_json: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  families_count?: number;
  bugs_count?: number;
  checklist_progress?: number;
}

export interface BugHuntFamily {
  id: string;
  cohort_id: string;
  family_file_id: string | null;
  parent_a_email: string;
  parent_a_password: string;
  parent_b_email: string;
  parent_b_password: string;
  parent_a_name: string;
  parent_b_name: string;
  children_names: string[];
  test_status: string;
  tester_notes: string | null;
  created_at: string;
  tester?: BugHuntTester | null;
  agreement_version?: string | null;
  subscription_tier?: string | null;
}

export interface BugHuntTester {
  id: string;
  cohort_id: string;
  family_id: string;
  tester_name: string;
  tester_email: string;
  access_token?: string;
  status: string;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface BugHuntChecklistItem {
  id: string;
  cohort_id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_completed: boolean;
  completed_by: string | null;
  tester_id: string | null;
  tester_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BugHuntNote {
  id: string;
  cohort_id: string;
  family_id: string | null;
  author_id: string | null;
  tester_id: string | null;
  tester_name: string | null;
  content: string;
  note_type: string;
  created_at: string;
}

export interface BugHuntBugReport {
  id: string;
  cohort_id: string;
  family_id: string | null;
  reported_by: string | null;
  tester_id: string | null;
  tester_name: string | null;
  title: string;
  description: string;
  severity: string;
  status: string;
  sentry_issue_id: string | null;
  steps_to_reproduce: string | null;
  screenshot_urls: string[];
  created_at: string;
}

export interface BugHuntFeedback {
  id: string;
  cohort_id: string;
  family_id: string | null;
  submitted_by: string | null;
  tester_id: string | null;
  tester_name: string | null;
  rating: number | null;
  category: string;
  content: string;
  feature_area: string | null;
  created_at: string;
}

export interface BugHuntDashboard {
  cohort: BugHuntCohort;
  families: BugHuntFamily[];
  checklist: BugHuntChecklistItem[];
  bug_reports: BugHuntBugReport[];
  feedback: BugHuntFeedback[];
  notes: BugHuntNote[];
  testers: BugHuntTester[];
  stats: {
    families_total: number;
    families_completed: number;
    checklist_total: number;
    checklist_completed: number;
    bugs_total: number;
    bugs_by_severity: Record<string, number>;
    feedback_total: number;
    avg_rating: number | null;
    testers_total: number;
    testers_active: number;
  };
}

export interface LeadList {
  id: string;
  name: string;
  lead_type: string;
  description: string | null;
  sendgrid_list_id: string | null;
  lead_count: number;
  created_at: string;
}

export interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  source: string;
  status: string;
  // Sales funnel (populated by PATCH /admin/leads/leads/{id}/stage)
  stage?: string | null;
  lost_reason?: string | null;
  closed_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  converted_user_id?: string | null;
  converted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Flexible JSON blob — currently holds stage_notes array
  metadata_json?: { stage_notes?: Array<{ at?: string; stage?: string; reason?: string; note?: string; by?: string }>; [key: string]: unknown } | null;
}

export interface EmailCampaign {
  id: string;
  name: string;
  lead_list_id: string | null;
  subject: string;
  html_content: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  stats_json: Record<string, any> | null;
  created_at: string;
}

export interface MonitoredEmail {
  id: string;
  gmail_message_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_preview: string;
  body_full: string;
  received_at: string;
  is_urgent: boolean;
  urgency_reason: string | null;
  category: string;
  ai_summary: string | null;
  ai_draft_response: string | null;
  draft_status: string;
  admin_notes: string | null;
}

export interface InboxStats {
  total: number;
  urgent: number;
  pending_drafts: number;
  by_category: Record<string, number>;
}

// --- API calls ---

export const adminAPI = {
  getDashboard: () => adminFetch<DashboardData>('/admin/dashboard'),

  searchUsers: (params: {
    q?: string;
    tier?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.tier) searchParams.set('tier', params.tier);
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);
    return adminFetch<UserSearchResult>(`/admin/users?${searchParams}`);
  },

  getUserDetail: (userId: string) =>
    adminFetch<AdminUserDetail>(`/admin/users/${userId}`),

  updateUserStatus: (userId: string, isActive: boolean, reason: string) =>
    adminFetch<{ id: string; is_active: boolean; updated_by: string; reason: string }>(
      `/admin/users/${userId}/status?is_active=${isActive}&reason=${encodeURIComponent(reason)}`,
      { method: 'PATCH' }
    ),

  getBillingOverview: () => adminFetch<BillingOverview>('/admin/billing/overview'),

  getAuditLog: (params: { action?: string; admin_email?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.action) searchParams.set('action', params.action);
    if (params.admin_email) searchParams.set('admin_email', params.admin_email);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return adminFetch<AuditLogResult>(`/admin/audit-log?${searchParams}`);
  },

  getPlatformAudit: (params: { days?: number; event_type?: string; user_email?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.days) searchParams.set('days', String(params.days));
    if (params.event_type) searchParams.set('event_type', params.event_type);
    if (params.user_email) searchParams.set('user_email', params.user_email);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return adminFetch<{ events: AuditEvent[]; total: number; limit: number; offset: number }>(`/admin/platform-audit?${searchParams}`);
  },

  getGrowthStats: (days: number = 30) =>
    adminFetch<GrowthStats>(`/admin/stats/growth?days=${days}`),

  getEngagementStats: (days: number = 30) =>
    adminFetch<EngagementStats>(`/admin/stats/engagement?days=${days}`),

  getReports: (params: { status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status_filter', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return adminFetch<ReportListResult>(`/admin/reports?${searchParams}`);
  },

  createReport: (reportType: string, dateRangeDays: number = 30, notes?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('report_type', reportType);
    searchParams.set('date_range_days', String(dateRangeDays));
    if (notes) searchParams.set('notes', notes);
    return adminFetch<ReportCreateResult>(`/admin/reports/request?${searchParams}`, { method: 'POST' });
  },

  downloadReport: (reportId: string, format: 'json' | 'csv' = 'json') =>
    adminFetchBlob(`/admin/reports/${reportId}/download?format=${format}`),

  getPlatformHealth: () => adminFetch<PlatformHealth>('/admin/health'),

  getUserSegments: () => adminFetch<UserSegments>('/admin/analytics/user-segments'),

  // Stripe sync operations
  syncStripeCustomers: () =>
    adminFetch<SyncResult>('/admin/stripe/sync-customers', { method: 'POST' }),

  syncStripeSubscriptions: () =>
    adminFetch<SyncResult>('/admin/stripe/sync-subscriptions', { method: 'POST' }),

  fullStripeSync: () =>
    adminFetch<any>('/admin/stripe/full-sync', { method: 'POST' }),

  stripeDiagnostic: () =>
    adminFetch<any>('/admin/stripe/diagnostic'),

  // Tier configuration
  getTierConfig: () => adminFetch<TierConfig>('/admin/config/tiers'),

  // Weekly Report
  getWeeklyReport: () => adminFetch<WeeklyReport>('/admin/weekly-report'),
  sendWeeklyReport: () => adminFetch<{ sent: boolean; report: WeeklyReport }>('/admin/weekly-report/send', { method: 'POST' }),

  // Bug Triage
  getCurrentBugs: (days = 7) => adminFetch<BugCategory>(`/admin/bugs/current?days=${days}`),
  runBugTriage: (days = 7) => adminFetch<any>(`/admin/bugs/triage?days=${days}`, { method: 'POST' }),
  createBugSprint: (days = 3) => adminFetch<{ sprint_id: string; plan: SprintPlan }>(`/admin/bugs/sprints?days=${days}`, { method: 'POST' }),
  listSprints: (limit = 10) => adminFetch<any[]>(`/admin/bugs/sprints?limit=${limit}`),
  updateSprintStatus: (id: string, status: string, body?: { resolution_notes?: Record<string, string>; completed_items?: string[] }) =>
    adminFetch<any>(`/admin/bugs/sprints/${id}?status=${status}`, {
      method: 'PATCH',
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),

  // ── Bug Hunt Cohorts ──────────────────────────────────────────────
  listBugHunts: (status?: string, limit = 50) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    sp.set('limit', String(limit));
    return adminFetch<BugHuntCohort[]>(`/admin/bug-hunts?${sp}`);
  },

  createBugHunt: (data: {
    name: string;
    description?: string;
    target_feature: string;
    family_count: number;
    test_instructions?: string;
  }) => adminFetch<BugHuntCohort>('/admin/bug-hunts', { method: 'POST', body: JSON.stringify(data) }),

  getBugHunt: (id: string) => adminFetch<BugHuntDashboard>(`/admin/bug-hunts/${id}`),

  generateBugHuntData: (id: string) =>
    adminFetch<{ status: string; families_created: number }>(`/admin/bug-hunts/${id}/generate`, { method: 'POST' }),

  updateBugHunt: (id: string, data: Partial<{ name: string; description: string; status: string; test_instructions: string }>) =>
    adminFetch<BugHuntCohort>(`/admin/bug-hunts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addBugHuntChecklistItem: (id: string, data: { title: string; description?: string }) =>
    adminFetch<BugHuntChecklistItem>(`/admin/bug-hunts/${id}/checklist`, { method: 'POST', body: JSON.stringify(data) }),

  toggleBugHuntChecklistItem: (id: string, itemId: string) =>
    adminFetch<BugHuntChecklistItem>(`/admin/bug-hunts/${id}/checklist/${itemId}`, { method: 'PATCH' }),

  deleteBugHuntChecklistItem: (id: string, itemId: string) =>
    adminFetch<void>(`/admin/bug-hunts/${id}/checklist/${itemId}`, { method: 'DELETE' }),

  addBugHuntNote: (id: string, data: { content: string; note_type?: string; family_id?: string }) =>
    adminFetch<BugHuntNote>(`/admin/bug-hunts/${id}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  addBugHuntBug: (id: string, data: {
    title: string; description: string; severity: string;
    family_id?: string; steps_to_reproduce?: string;
  }) => adminFetch<BugHuntBugReport>(`/admin/bug-hunts/${id}/bugs`, { method: 'POST', body: JSON.stringify(data) }),

  updateBugHuntBug: (id: string, bugId: string, data: { status: string }) =>
    adminFetch<BugHuntBugReport>(`/admin/bug-hunts/${id}/bugs/${bugId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addBugHuntFeedback: (id: string, data: {
    content: string; category: string; rating?: number;
    family_id?: string; feature_area?: string;
  }) => adminFetch<BugHuntFeedback>(`/admin/bug-hunts/${id}/feedback`, { method: 'POST', body: JSON.stringify(data) }),

  completeBugHunt: (id: string) =>
    adminFetch<BugHuntCohort>(`/admin/bug-hunts/${id}/complete`, { method: 'POST' }),

  generateBugHuntAIOverview: (id: string) =>
    adminFetch<Record<string, any>>(`/admin/bug-hunts/${id}/ai-overview`, { method: 'POST' }),

  deleteBugHunt: (id: string) =>
    adminFetch<{ deleted: boolean }>(`/admin/bug-hunts/${id}`, { method: 'DELETE' }),

  updateBugHuntFamilyStatus: (id: string, familyId: string, data: { test_status: string; tester_notes?: string }) =>
    adminFetch<BugHuntFamily>(`/admin/bug-hunts/${id}/families/${familyId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  assignBugHuntTester: (cohortId: string, familyId: string, data: { tester_name: string; tester_email: string }) =>
    adminFetch<BugHuntTester>(`/admin/bug-hunts/${cohortId}/families/${familyId}/assign-tester`, { method: 'POST', body: JSON.stringify(data) }),

  revokeBugHuntTester: (cohortId: string, testerId: string) =>
    adminFetch<{ id: string; status: string; revoked: boolean }>(`/admin/bug-hunts/${cohortId}/testers/${testerId}/revoke`, { method: 'POST' }),

  resendBugHuntTesterInvite: (cohortId: string, testerId: string) =>
    adminFetch<{ id: string; status: string; resent: boolean }>(`/admin/bug-hunts/${cohortId}/testers/${testerId}/resend`, { method: 'POST' }),

  sendBugHuntReminder: (cohortId: string, testerId: string) =>
    adminFetch<{ id: string; reminded: boolean }>(`/admin/bug-hunts/${cohortId}/testers/${testerId}/remind`, { method: 'POST' }),

  sendAllBugHuntInvitations: (cohortId: string) =>
    adminFetch<{ sent: number; failed: number; skipped: number }>(`/admin/bug-hunts/${cohortId}/send-all-invitations`, { method: 'POST' }),

  // SuperAdmin reliability — status probes
  getGa4Status: () => adminFetch<any>('/admin/ga4/status'),
  getInboxStatus: () => adminFetch<any>('/admin/inbox/status'),
  getLeadsStatus: () => adminFetch<any>('/admin/leads/status'),

  // Reddit
  getRedditStatus: () => adminFetch<any>('/admin/reddit/status'),
  getRedditConfig: () => adminFetch<any>('/admin/reddit/config'),
  saveRedditConfig: (config: { client_id: string; client_secret: string; username: string; password: string }) =>
    adminFetch<any>('/admin/reddit/config', { method: 'POST', body: JSON.stringify(config) }),
  getRedditPosts: (subreddit: string, sort = 'hot', limit = 25) =>
    adminFetch<any>(`/admin/reddit/subreddit/${subreddit}/posts?sort=${sort}&limit=${limit}`),
  searchReddit: (subreddit: string, query: string) =>
    adminFetch<any>(`/admin/reddit/subreddit/${subreddit}/search?q=${encodeURIComponent(query)}`),
  getRedditComments: (postId: string, subreddit: string) =>
    adminFetch<any>(`/admin/reddit/post/${postId}/comments?subreddit=${subreddit}`),
  postRedditComment: (parentId: string, text: string) =>
    adminFetch<any>('/admin/reddit/comment', { method: 'POST', body: JSON.stringify({ parent_id: parentId, text }) }),
  createRedditPost: (subreddit: string, title: string, text: string) =>
    adminFetch<any>('/admin/reddit/post', { method: 'POST', body: JSON.stringify({ subreddit, title, text }) }),
  getTrackedSubreddits: () => adminFetch<{ subreddits: string[] }>('/admin/reddit/tracked-subreddits'),
  updateTrackedSubreddits: (subreddits: string[]) =>
    adminFetch<any>('/admin/reddit/tracked-subreddits', { method: 'POST', body: JSON.stringify({ subreddits }) }),

  // Leads
  getLeadLists: () => adminFetch<LeadList[]>('/admin/leads/lists'),
  createLeadList: (data: { name: string; lead_type: string; description?: string }) =>
    adminFetch<LeadList>('/admin/leads/lists', { method: 'POST', body: JSON.stringify(data) }),
  getLeadListDetail: (id: string) => adminFetch<LeadList & { leads: Lead[] }>(`/admin/leads/lists/${id}`),
  deleteLeadList: (id: string) => adminFetch<void>(`/admin/leads/lists/${id}`, { method: 'DELETE' }),
  importLeadsCsv: (listId: string, file: File, source = 'import') => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getAuthToken();
    return fetch(`${API_URL}/admin/leads/lists/${listId}/import-csv?source=${encodeURIComponent(source)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    }).then(r => r.json());
  },
  addLead: (listId: string, data: Partial<Lead> & { source?: string }) =>
    adminFetch<Lead>(`/admin/leads/lists/${listId}/leads`, { method: 'POST', body: JSON.stringify(data) }),
  getLeads: (listId: string, limit = 50, offset = 0) =>
    adminFetch<{ leads: Lead[]; total: number }>(`/admin/leads/lists/${listId}/leads?limit=${limit}&offset=${offset}`),
  syncLeadsToSendGrid: (listId: string) =>
    adminFetch<any>(`/admin/leads/lists/${listId}/sync-sendgrid`, { method: 'POST' }),

  /**
   * Move a lead through the sales funnel. Stage is one of:
   *   new | contacted | qualified | negotiation | closed_won | closed_lost
   * When stage=closed_lost, lost_reason is required (price | feature_gap |
   * competitor | timing | unresponsive | other). Powers the /sales/win-loss
   * aggregation.
   */
  updateLeadStage: (
    leadId: string,
    data: { stage: string; lost_reason?: string; note?: string },
  ) =>
    adminFetch<Lead>(`/admin/leads/leads/${leadId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ── Impersonation ───────────────────────────────────────────────────
  /** Start impersonating a user. Returns a short-lived token + session id. */
  startImpersonation: (userId: string, reason?: string) =>
    adminFetch<{
      session_id: string;
      target_user_id: string;
      target_email: string;
      expires_in_minutes: number;
      access_token: string;
      started_at: string;
    }>(`/admin/users/${userId}/impersonate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  endImpersonation: (sessionId: string, endReason?: string) =>
    adminFetch<{ session_id: string; ended_at?: string; duration_seconds?: number; already_ended?: boolean }>(
      '/admin/impersonate/end',
      {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, end_reason: endReason }),
      },
    ),

  listImpersonationSessions: (params?: {
    page?: number;
    page_size?: number;
    target_user_id?: string;
    superadmin_id?: string;
    open_only?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.target_user_id) qs.set('target_user_id', params.target_user_id);
    if (params?.superadmin_id) qs.set('superadmin_id', params.superadmin_id);
    if (params?.open_only) qs.set('open_only', 'true');
    const query = qs.toString();
    return adminFetch<{
      total: number;
      page: number;
      page_size: number;
      sessions: Array<{
        id: string;
        superadmin_id: string;
        superadmin_email: string | null;
        target_user_id: string;
        target_email: string | null;
        started_at: string | null;
        ended_at: string | null;
        end_reason: string | null;
        duration_seconds: number | null;
        action_count: number;
        ip_address: string | null;
        reason: string | null;
      }>;
    }>(`/admin/impersonation/sessions${query ? `?${query}` : ''}`);
  },

  // ── Bulk user actions ───────────────────────────────────────────────
  bulkUserAction: (data: {
    user_ids: string[];
    action: 'status' | 'tier';
    params: Record<string, unknown>;
  }) =>
    adminFetch<{
      total_requested: number;
      succeeded: number;
      failed: number;
      succeeded_ids: string[];
      failures: Array<{ user_id: string; error: string }>;
    }>('/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── CSV exports ─────────────────────────────────────────────────────
  /**
   * Build the URL for a CSV export endpoint so components can trigger a
   * browser-native download (window.open) while letting adminFetch handle
   * auth via an Authorization header is not possible — use
   * triggerCsvDownload() instead which constructs the URL + auth header via
   * a fetch + blob.
   */
  csvExportUrl: (path: string, params?: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      }
    }
    const query = qs.toString();
    return `${path}${query ? `?${query}` : ''}`;
  },

  // ── Alert rules + runbooks (Phase C) ────────────────────────────────
  listAlertMetrics: () =>
    adminFetch<{
      metrics: Array<{ path: string; description: string; units: string }>;
      comparisons: string[];
    }>('/admin/alerts/metrics'),

  listAlertRules: () =>
    adminFetch<Array<{
      id: string;
      name: string;
      description: string | null;
      metric_path: string;
      comparison: string;
      threshold_value: number;
      check_interval_minutes: number;
      stability_factor: number;
      notify_emails: string[];
      notify_push: boolean;
      runbook_id: string | null;
      enabled: boolean;
      last_evaluated_at: string | null;
      last_value: number | null;
      current_state: string;
      created_at: string | null;
    }>>('/admin/alerts/rules'),

  createAlertRule: (data: {
    name: string;
    description?: string;
    metric_path: string;
    comparison: string;
    threshold_value: number;
    check_interval_minutes?: number;
    stability_factor?: number;
    notify_emails?: string[];
    notify_push?: boolean;
    runbook_id?: string | null;
    enabled?: boolean;
  }) =>
    adminFetch<any>('/admin/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAlertRule: (
    ruleId: string,
    data: Partial<{
      name: string;
      description: string | null;
      metric_path: string;
      comparison: string;
      threshold_value: number;
      check_interval_minutes: number;
      stability_factor: number;
      notify_emails: string[];
      notify_push: boolean;
      runbook_id: string | null;
      enabled: boolean;
    }>,
  ) =>
    adminFetch<any>(`/admin/alerts/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteAlertRule: (ruleId: string) =>
    adminFetch<{ deleted: boolean; id: string }>(`/admin/alerts/rules/${ruleId}`, {
      method: 'DELETE',
    }),

  forceEvaluateRule: (ruleId: string) =>
    adminFetch<{ rule: any; previous_state: string; transitioned: boolean }>(
      `/admin/alerts/rules/${ruleId}/evaluate`,
      { method: 'POST' },
    ),

  listAlertHistory: (params?: { rule_id?: string; days?: number; page?: number; page_size?: number; open_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.rule_id) qs.set('rule_id', params.rule_id);
    if (params?.days) qs.set('days', String(params.days));
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.open_only) qs.set('open_only', 'true');
    const query = qs.toString();
    return adminFetch<{
      total: number;
      page: number;
      page_size: number;
      items: Array<{
        id: string;
        rule_id: string;
        rule_name: string;
        metric_path: string;
        fired_at: string | null;
        fired_value: number;
        threshold_value: number;
        comparison: string;
        resolved_at: string | null;
        resolved_value: number | null;
        duration_seconds: number | null;
        notifications_sent: { push?: string[]; email?: string[]; errors?: string[] } | null;
      }>;
    }>(`/admin/alerts/history${query ? `?${query}` : ''}`);
  },

  // Runbooks
  listRunbooks: (category?: string) =>
    adminFetch<Array<{
      id: string;
      title: string;
      category: string;
      summary: string | null;
      steps: Array<{ title: string; body: string; expected_outcome?: string | null }>;
      notes: string | null;
      tags: string[];
      enabled: boolean;
      owner_id: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>>(`/admin/runbooks${category ? `?category=${encodeURIComponent(category)}` : ''}`),

  getRunbook: (id: string) =>
    adminFetch<any>(`/admin/runbooks/${id}`),

  createRunbook: (data: {
    title: string;
    category?: string;
    summary?: string;
    steps?: Array<{ title: string; body: string; expected_outcome?: string }>;
    notes?: string;
    tags?: string[];
    enabled?: boolean;
  }) =>
    adminFetch<any>('/admin/runbooks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRunbook: (id: string, data: Partial<{
    title: string;
    category: string;
    summary: string | null;
    steps: Array<{ title: string; body: string; expected_outcome?: string }>;
    notes: string | null;
    tags: string[];
    enabled: boolean;
  }>) =>
    adminFetch<any>(`/admin/runbooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteRunbook: (id: string) =>
    adminFetch<{ deleted: boolean; id: string }>(`/admin/runbooks/${id}`, {
      method: 'DELETE',
    }),

  // ── Geospatial (Wave 2 visual) ─────────────────────────────────────
  getGeoStats: (exchangeDays = 30, exchangeLimit = 1000) =>
    adminFetch<{
      users_by_state: Record<string, number>;
      users_unknown_state_count: number;
      total_users_geotagged: number;
      professionals_by_state: Record<string, number>;
      professionals_unknown_state_count: number;
      total_professionals_geotagged: number;
      exchange_points: Array<{ lat: number; lng: number; status: string; at: string | null }>;
      exchange_point_count: number;
      exchange_window_days: number;
      generated_at: string;
    }>(`/admin/stats/geo?exchange_days=${exchangeDays}&exchange_limit=${exchangeLimit}`),

  // ── Reddit / GTM Playbook state (Phase D3) ──────────────────────────
  /**
   * Read all playbook state blobs (checked tasks, drafts, outreach contacts,
   * activity log) for the current admin. Returns a dict keyed by blob name.
   * Missing keys are simply absent — caller falls back to localStorage.
   */
  getPlaybookState: () =>
    adminFetch<Record<string, any>>('/admin/reddit/playbook/state'),

  /**
   * Upsert one playbook state blob. `key` must be one of: playbook,
   * drafts, outreach, activity (enforced server-side).
   */
  savePlaybookState: (key: string, value: unknown) =>
    adminFetch<{ saved: boolean; key: string }>(
      `/admin/reddit/playbook/state/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value }),
      },
    ),

  // Campaigns
  getCampaigns: () => adminFetch<EmailCampaign[]>('/admin/leads/campaigns'),
  createCampaign: (data: { name: string; lead_list_id: string; subject: string; html_content?: string }) =>
    adminFetch<EmailCampaign>('/admin/leads/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  generateCampaignContent: (campaignId: string, data: { audience: string; product_focus: string; tone: string }) =>
    adminFetch<{ html_content: string; plain_content: string }>(`/admin/leads/campaigns/${campaignId}/generate-content`, { method: 'POST', body: JSON.stringify(data) }),
  sendCampaign: (campaignId: string) =>
    adminFetch<any>(`/admin/leads/campaigns/${campaignId}/send`, { method: 'POST' }),
  getCampaignStats: (campaignId: string) =>
    adminFetch<any>(`/admin/leads/campaigns/${campaignId}/stats`),

  // Pipeline & Attribution
  getLeadPipeline: () => adminFetch<{
    funnel: { total: number; contacted: number; responded: number; converted: number };
    by_source: Record<string, number>;
    conversion_rate: number;
    recent_conversions: { email: string; source: string; converted_at: string | null; list_id: string }[];
    top_lists: { id: string; name: string; lead_count: number; converted: number }[];
  }>('/admin/leads/pipeline'),
  matchLeadUsers: () => adminFetch<{ matched: number; total_unmatched: number }>('/admin/leads/match-users', { method: 'POST' }),

  // Landing Pages
  getLandingPages: () => adminFetch<any[]>('/admin/leads/landing-pages'),
  createLandingPage: (data: any) =>
    adminFetch<any>('/admin/leads/landing-pages', { method: 'POST', body: JSON.stringify(data) }),
  generateLandingPage: (data: { target_audience: string; key_message: string; tone?: string; cta_destination?: string }) =>
    adminFetch<any>('/admin/leads/landing-pages/generate', { method: 'POST', body: JSON.stringify(data) }),
  updateLandingPage: (id: string, data: any) =>
    adminFetch<any>(`/admin/leads/landing-pages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  publishLandingPage: (id: string) =>
    adminFetch<any>(`/admin/leads/landing-pages/${id}/publish`, { method: 'POST' }),
  deleteLandingPage: (id: string) =>
    adminFetch<any>(`/admin/leads/landing-pages/${id}`, { method: 'DELETE' }),

  // Inbox
  getOAuthUrl: () => adminFetch<{ url: string }>('/admin/inbox/oauth/url'),
  exchangeOAuthCode: (code: string) =>
    adminFetch<{ success: boolean }>(`/admin/inbox/oauth/callback?code=${code}`, { method: 'POST' }),

  // GA4 — shares the same Google callback URL as Gmail; the callback route
  // disambiguates on `state=ga4` and lands the user here with ?ga4_code=...
  exchangeGa4Code: (code: string) =>
    adminFetch<{ status: string; scopes?: string[] }>(
      `/admin/ga4/oauth/callback?code=${encodeURIComponent(code)}`,
      { method: 'POST' },
    ),
  getEmails: (params?: { category?: string; is_urgent?: boolean; draft_status?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.is_urgent !== undefined) sp.set('is_urgent', String(params.is_urgent));
    if (params?.draft_status) sp.set('draft_status', params.draft_status);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    return adminFetch<{ emails: MonitoredEmail[]; total: number }>(`/admin/inbox/emails?${sp}`);
  },
  getEmailDetail: (id: string) => adminFetch<MonitoredEmail>(`/admin/inbox/emails/${id}`),
  approveDraft: (id: string) => adminFetch<any>(`/admin/inbox/emails/${id}/approve-draft`, { method: 'POST' }),
  rejectDraft: (id: string) => adminFetch<any>(`/admin/inbox/emails/${id}/reject-draft`, { method: 'POST' }),
  sendReply: (id: string, body: string) =>
    adminFetch<any>(`/admin/inbox/emails/${id}/reply`, { method: 'POST', body: JSON.stringify({ response_body: body }) }),
  syncInbox: () => adminFetch<any>('/admin/inbox/sync', { method: 'POST' }),
  getDigests: () => adminFetch<any[]>('/admin/inbox/digests'),
  getInboxStats: () => adminFetch<InboxStats>('/admin/inbox/stats'),
  analyzeInbox: () => adminFetch<{ analysis: any; provider: string | null; email_count: number; error?: string }>('/admin/inbox/analyze', { method: 'POST' }),

  analyzeSelected: (emailIds: string[]) =>
    adminFetch<{ analysis: any; provider: string | null; email_count: number }>('/admin/inbox/analyze-selected', {
      method: 'POST',
      body: JSON.stringify({ email_ids: emailIds }),
    }),

  generateReply: (id: string, instructions?: string) =>
    adminFetch<{ draft_response: string; provider: string | null; thread_length: number }>(`/admin/inbox/emails/${id}/generate-reply`, {
      method: 'POST',
      body: JSON.stringify({ instructions: instructions || '' }),
    }),

  getInboxKPIs: () => adminFetch<{
    by_recipient: Record<string, number>;
    volume_trend: { date: string; count: number }[];
    draft_approval_rate: number;
    by_category: Record<string, number>;
    total: number;
    urgent: number;
  }>('/admin/inbox/kpis'),

  // Performance & AI Monitoring
  getPerformanceOverview: (days = 7) => adminFetch<{
    period_days: number;
    transactions: { name: string; count: number; p75_ms: number; p95_ms: number; failure_rate: number }[];
    ai_calls: { description: string; count: number; avg_duration_ms: number; total_tokens: number }[];
    slow_queries: { query: string; count: number; avg_ms: number; p95_ms: number }[];
    summary: { total_requests: number; total_ai_calls: number; total_tokens_used: number; avg_response_p75_ms: number; slow_queries_count: number };
    error?: string;
  }>(`/admin/performance/overview?days=${days}`),

  // System Status
  getSystemStatus: () => adminFetch<SystemStatusResponse>('/admin/system-status'),

  // ── Chatbot Admin ─────────────────────────────────────────────────
  getChatbotSessions: (params: {
    status?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  } = {}) => {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    if (params.search) sp.set('search', params.search);
    if (params.date_from) sp.set('date_from', params.date_from);
    if (params.date_to) sp.set('date_to', params.date_to);
    if (params.page) sp.set('page', String(params.page));
    if (params.per_page) sp.set('per_page', String(params.per_page));
    return adminFetch<ChatbotSessionsListResponse>(`/chatbot/admin/sessions?${sp}`);
  },

  getChatbotSession: (sessionId: string) =>
    adminFetch<ChatbotSessionDetail>(`/chatbot/admin/sessions/${sessionId}`),

  emailChatbotTranscript: (sessionId: string) =>
    adminFetch<{ success: boolean; message: string }>(
      `/chatbot/admin/sessions/${sessionId}/email-transcript`,
      { method: 'POST' }
    ),

  getChatbotStats: () => adminFetch<ChatbotAdminStats>('/chatbot/admin/stats'),

  getChatbotConfig: (key: string) =>
    adminFetch<{ key: string; value: string | null }>(`/chatbot/admin/config/${key}`),

  updateChatbotConfig: (key: string, value: string) =>
    adminFetch<{ success: boolean; key: string }>(
      `/chatbot/admin/config/${key}`,
      { method: 'PUT', body: JSON.stringify({ value }) }
    ),

  // ── BizOps Analytics ────────────────────────────────────────────────
  getCohortAnalysis: (months = 6) =>
    adminFetch<{ cohorts: CohortData[]; months: number }>(`/admin/analytics/cohorts?months=${months}`),

  getUnitEconomics: () =>
    adminFetch<UnitEconomics>('/admin/analytics/unit-economics'),

  getRetentionCurve: (days = 90) =>
    adminFetch<{ curve: { day: number; pct: number; count: number }[]; total_cohort_size: number }>(
      `/admin/analytics/retention-curve?days=${days}`
    ),

  getRevenueMetrics: () =>
    adminFetch<RevenueMetrics>('/admin/analytics/revenue-metrics'),

  getExecutiveSummary: () =>
    adminFetch<ExecutiveSummary>('/admin/analytics/executive-summary'),

  getAISummary: () =>
    adminFetch<{ summary: string[]; generated: boolean; metrics: Record<string, any>; generated_at: string }>(
      '/admin/analytics/ai-summary'
    ),

  // ── DevOps Hub ──────────────────────────────────────────────────────
  getDevOpsVelocity: (sprints = 5) =>
    adminFetch<any>(`/admin/devops/velocity?sprints=${sprints}`),

  getRepairTrends: (days = 30) =>
    adminFetch<any>(`/admin/devops/repair-trends?days=${days}`),

  getCodeQuality: () =>
    adminFetch<any>('/admin/devops/code-quality'),

  postAITriage: (bugs: any[]) =>
    adminFetch<any>('/admin/devops/ai-triage', { method: 'POST', body: JSON.stringify({ bugs }) }),

  getDeployments: (limit = 20) =>
    adminFetch<{ deployments: DeploymentData[] }>(`/admin/devops/deployments?limit=${limit}`),

  getSprints: () =>
    adminFetch<{ sprints: SprintData[] }>('/admin/devops/sprints'),

  createSprint: (data: { name: string; goal?: string; start_date?: string; end_date?: string }) =>
    adminFetch<SprintData>('/admin/devops/sprints', { method: 'POST', body: JSON.stringify(data) }),

  addSprintItem: (sprintId: string, data: any) =>
    adminFetch<any>(`/admin/devops/sprints/${sprintId}/items`, { method: 'POST', body: JSON.stringify(data) }),

  updateSprintItem: (sprintId: string, itemId: string, data: any) =>
    adminFetch<any>(`/admin/devops/sprints/${sprintId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  recordDeployment: (data: any) =>
    adminFetch<any>('/admin/devops/deployments', { method: 'POST', body: JSON.stringify(data) }),

  // ── Customer Success ────────────────────────────────────────────────
  getCSOverview: () =>
    adminFetch<CSOverview>('/admin/cs/overview'),

  getHealthScores: (params?: { risk?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.risk) sp.set('risk', params.risk);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    return adminFetch<{ scores: HealthScoreEntry[]; total: number }>(`/admin/cs/health-scores?${sp}`);
  },

  // NOTE: calculateHealthScores() stub removed — the backend endpoint
  // `POST /admin/cs/health-scores/calculate` was deleted in the SuperAdmin
  // reliability pass because it duplicated `GET /admin/cs/health-scores`
  // (scores are computed on-read). Re-add if a cache/backing-table ever
  // needs an explicit refresh hook.

  getChurnRisk: (threshold = 0.7) =>
    adminFetch<{ at_risk: HealthScoreEntry[] }>(`/admin/cs/churn-risk?threshold=${threshold}`),

  getSatisfaction: () =>
    adminFetch<SatisfactionData>('/admin/cs/satisfaction'),

  postCSAgent: (data: { user_id?: string; issue_description: string; context?: string }) =>
    adminFetch<any>('/admin/cs/ai-agent', { method: 'POST', body: JSON.stringify(data) }),

  getAccountHealth: (userId: string) =>
    adminFetch<any>(`/admin/cs/accounts/${userId}/health`),

  createIntervention: (data: { user_id: string; type: string; channel?: string; notes?: string; follow_up_date?: string }) =>
    adminFetch<any>('/admin/cs/interventions', { method: 'POST', body: JSON.stringify(data) }),

  getInterventions: (params?: { user_id?: string; type?: string; outcome?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params?.user_id) sp.set('user_id', params.user_id);
    if (params?.type) sp.set('type', params.type);
    if (params?.outcome) sp.set('outcome', params.outcome);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    return adminFetch<{ interventions: any[]; total: number }>(`/admin/cs/interventions?${sp}`);
  },

  updateIntervention: (id: string, data: any) =>
    adminFetch<any>(`/admin/cs/interventions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Sales Intelligence ──────────────────────────────────────────────
  getSalesPipeline: () =>
    adminFetch<{ stages: PipelineStage[]; total_pipeline_value: number }>('/admin/sales/pipeline'),

  getSalesConversions: (days = 30) =>
    adminFetch<any>(`/admin/sales/conversions?days=${days}`),

  getSalesForecast: (months = 3) =>
    adminFetch<any>(`/admin/sales/forecast?months=${months}`),

  getSalesCAC: (days = 90) =>
    adminFetch<any>(`/admin/sales/cac?period=${days}`),

  getSalesLTV: () =>
    adminFetch<any>('/admin/sales/ltv'),

  getSalesWinLoss: (days = 90) =>
    adminFetch<any>(`/admin/sales/win-loss?days=${days}`),

  postSalesAISuggestions: () =>
    adminFetch<any>('/admin/sales/ai-suggestions', { method: 'POST' }),

  // ── Marketing Analytics ─────────────────────────────────────────────
  getContentPerformance: () =>
    adminFetch<any>('/admin/marketing/content-performance'),

  getSEOInsights: () =>
    adminFetch<any>('/admin/marketing/seo-insights'),

  getCampaignAnalytics: (days = 90) =>
    adminFetch<any>(`/admin/marketing/campaign-analytics?days=${days}`),

  postMarketingAISuggestions: () =>
    adminFetch<any>('/admin/marketing/ai-suggestions', { method: 'POST' }),

  getSocialTracking: () =>
    adminFetch<any>('/admin/marketing/social-tracking'),

  getAttribution: () =>
    adminFetch<any>('/admin/marketing/attribution'),
};

// ── BizOps Types ──────────────────────────────────────────────────────

export interface CohortData {
  month: string;
  size: number;
  retention: number[];
}

export interface UnitEconomics {
  arpu: number;
  mrr: number;
  arr: number;
  paying_users: number;
  monthly_churn_rate: number;
  ltv: number;
  cac: number;
  ltv_cac_ratio: number;
  payback_months: number;
  tier_breakdown: Record<string, { count: number; price: number; revenue: number }>;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  mrr_growth_rate: number;
  at_risk_mrr: number;
  breakdown: Record<string, { count: number; revenue: number }>;
  mrr_trend: { date: string; mrr: number }[];
}

export interface ExecutiveSummary {
  total_users: number;
  dau: number;
  mau: number;
  dau_mau_ratio: number;
  activation_rate: number;
  paying_conversion: number;
  paying_users: number;
  new_users_7d: number;
}

export interface DeploymentData {
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

export interface SprintData {
  id: string;
  name: string;
  goal?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  planned_points: number;
  completed_points: number;
  items: SprintItemData[];
}

export interface SprintItemData {
  id: string;
  title: string;
  description?: string;
  severity?: string;
  platform?: string;
  status: string;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  story_points?: number;
}

export interface CSOverview {
  total_accounts: number;
  at_risk_count: number;
  avg_health_score: number;
  estimated_nps: number;
  active_interventions: number;
}

export interface HealthScoreEntry {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  overall_score: number;
  risk_level: string;
  last_active?: string;
  subscription_tier?: string;
  factors?: Record<string, number>;
}

export interface SatisfactionData {
  estimated_nps: number;
  promoters: number;
  passives: number;
  detractors: number;
  response_count: number;
}

export interface PipelineStage {
  name: string;
  count: number;
  value: number;
  conversion_from_prev_pct: number;
}

// System Status types
export interface ServiceStatus {
  name: string;
  slug: string;
  category: string;
  status: 'operational' | 'degraded' | 'down';
  latency_ms: number;
  detail: string;
  checked_at: string;
}

export interface SystemStatusResponse {
  overall: 'operational' | 'degraded' | 'down';
  checked_at: string;
  services: ServiceStatus[];
  total: number;
  operational: number;
  degraded: number;
  down: number;
}

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

// --- Types ---

export interface DashboardData {
  users: { total: number; active_30d: number; active_today: number; new_7d: number; new_24h: number };
  family_files: { active: number };
  professionals: { total: number };
  subscriptions: { tier_breakdown: Record<string, number>; estimated_mrr: number; past_due_count: number };
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

export interface BillingOverview {
  consumer_subscriptions: Record<string, { total: number; statuses: Record<string, number> }>;
  professional_subscriptions: Record<string, number>;
  past_due_count: number;
  trial_count: number;
  cancelled_30d: number;
  new_paid_30d: number;
  mrr_by_tier: Record<string, { count: number; price: number; mrr: number }>;
  total_mrr: number;
  stripe_live: StripeLiveData | null;
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

  // Stripe sync operations
  syncStripeCustomers: () =>
    adminFetch<SyncResult>('/admin/stripe/sync-customers', { method: 'POST' }),

  syncStripeSubscriptions: () =>
    adminFetch<SyncResult>('/admin/stripe/sync-subscriptions', { method: 'POST' }),

  // Tier configuration
  getTierConfig: () => adminFetch<TierConfig>('/admin/config/tiers'),

  // Weekly Report
  getWeeklyReport: () => adminFetch<WeeklyReport>('/admin/weekly-report'),
  sendWeeklyReport: () => adminFetch<{ sent: boolean; report: WeeklyReport }>('/admin/weekly-report/send', { method: 'POST' }),

  // Bug Triage
  getCurrentBugs: (days = 7) => adminFetch<BugCategory>(`/admin/bugs/current?days=${days}`),
  runBugTriage: (days = 7) => adminFetch<any>(`/admin/bugs/triage?days=${days}`, { method: 'POST' }),
  createSprint: (days = 3) => adminFetch<{ sprint_id: string; plan: SprintPlan }>(`/admin/bugs/sprints?days=${days}`, { method: 'POST' }),
  listSprints: (limit = 10) => adminFetch<any[]>(`/admin/bugs/sprints?limit=${limit}`),
  updateSprintStatus: (id: string, status: string) => adminFetch<any>(`/admin/bugs/sprints/${id}?status=${status}`, { method: 'PATCH' }),

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

  // Performance & AI Monitoring
  getPerformanceOverview: (days = 7) => adminFetch<{
    period_days: number;
    transactions: { name: string; count: number; p75_ms: number; p95_ms: number; failure_rate: number }[];
    ai_calls: { description: string; count: number; avg_duration_ms: number; total_tokens: number }[];
    slow_queries: { query: string; count: number; avg_ms: number; p95_ms: number }[];
    summary: { total_requests: number; total_ai_calls: number; total_tokens_used: number; avg_response_p75_ms: number; slow_queries_count: number };
    error?: string;
  }>(`/admin/performance/overview?days=${days}`),
};

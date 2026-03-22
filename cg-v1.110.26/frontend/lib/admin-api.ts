/**
 * SuperAdmin API Client
 *
 * All calls require an admin JWT token (user.is_admin === true).
 */

let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
const API_URL = apiUrl;

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Admin API error ${res.status}`);
  }

  return res.json();
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
  note: string;
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
};

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

// --- Types ---

export interface DashboardData {
  users: { total: number; active_30d: number; new_7d: number };
  family_files: { active: number };
  professionals: { total: number };
  subscriptions: { tier_breakdown: Record<string, number>; estimated_mrr: number };
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
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
  } | null;
  family_file_count: number;
}

export interface UserSearchResult {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface BillingOverview {
  consumer_subscriptions: Record<string, { total: number; statuses: Record<string, number> }>;
  professional_subscriptions: Record<string, number>;
  past_due_count: number;
  note: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
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

// --- API calls ---

export const adminAPI = {
  getDashboard: () => adminFetch<DashboardData>('/admin/dashboard'),

  searchUsers: (params: {
    q?: string;
    tier?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.tier) searchParams.set('tier', params.tier);
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
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

  getAuditLog: (params: { action?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.action) searchParams.set('action', params.action);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return adminFetch<AuditLogResult>(`/admin/audit-log?${searchParams}`);
  },

  getGrowthStats: (days: number = 30) =>
    adminFetch<GrowthStats>(`/admin/stats/growth?days=${days}`),
};

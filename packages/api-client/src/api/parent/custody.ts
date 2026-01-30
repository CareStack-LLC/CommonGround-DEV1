/**
 * Custody & Exchange API Client for Parents (Time Bridge)
 *
 * Parenting time tracking, custody exchanges, and Silent Drops.
 * Features:
 * - Current custody status tracking
 * - Exchange scheduling and management
 * - GPS verification (Silent Drops)
 * - Exchange history and compliance
 */

import { fetchWithParentAuth } from '../../core';

// ============================================================
// Types
// ============================================================

export type CustodyParent = 'parent_a' | 'parent_b';

export type ExchangeStatus =
  | 'scheduled'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'disputed'
  | 'cancelled';

export type HandoffOutcome =
  | 'completed'
  | 'missed'
  | 'one_party_present'
  | 'disputed'
  | 'pending';

export interface CustodyDayRecord {
  id: string;
  family_file_id: string;
  date: string;
  custody_parent: CustodyParent;
  schedule_source: 'agreement' | 'court_order' | 'manual' | 'exchange';
  child_ids: string[];
  notes?: string;
  is_holiday?: boolean;
  holiday_name?: string;
  created_at: string;
}

export interface CustodyExchange {
  id: string;
  family_file_id: string;
  from_parent: CustodyParent;
  to_parent: CustodyParent;
  scheduled_at: string;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  geofence_radius_meters: number;
  child_ids: string[];
  is_recurring: boolean;
  recurrence_pattern?: string;
  silent_handoff_enabled: boolean;
  qr_confirmation_required: boolean;
  check_in_window_before_minutes: number;
  check_in_window_after_minutes: number;
  status: ExchangeStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  children_names?: string[];
}

export interface ExchangeInstance {
  id: string;
  exchange_id: string;
  scheduled_at: string;
  window_start: string;
  window_end: string;
  from_parent_check_in_at?: string;
  from_parent_check_in_lat?: number;
  from_parent_check_in_lng?: number;
  from_parent_in_geofence?: boolean;
  from_parent_distance_meters?: number;
  to_parent_check_in_at?: string;
  to_parent_check_in_lat?: number;
  to_parent_check_in_lng?: number;
  to_parent_in_geofence?: boolean;
  to_parent_distance_meters?: number;
  qr_confirmed_at?: string;
  qr_confirmed_by?: string;
  handoff_outcome: HandoffOutcome;
  completed_at?: string;
  auto_closed: boolean;
  notes?: string;
  created_at: string;
}

export interface CustodySummary {
  family_file_id: string;
  current_custody_parent: CustodyParent;
  current_custody_since: string;
  next_exchange?: {
    id: string;
    scheduled_at: string;
    from_parent: CustodyParent;
    to_parent: CustodyParent;
    location_name?: string;
  };
  children: Array<{
    id: string;
    name: string;
    with_parent: CustodyParent;
  }>;
  this_week_days: {
    parent_a: number;
    parent_b: number;
  };
  this_month_days: {
    parent_a: number;
    parent_b: number;
  };
}

export interface SilentHandoffCheckIn {
  exchange_instance_id: string;
  latitude: number;
  longitude: number;
  device_accuracy_meters?: number;
}

export interface QRConfirmation {
  exchange_instance_id: string;
  qr_token: string;
}

// ============================================================
// Custody Status
// ============================================================

/**
 * Child-specific custody status from backend
 */
export interface ChildCustodyStatus {
  child_id: string;
  child_first_name: string;
  child_last_name?: string;
  with_current_user: boolean;
  current_parent_id: string;
  current_parent_name: string;
  next_action?: 'pickup' | 'dropoff';
  next_exchange_id?: string;
  next_exchange_time?: string;
  next_exchange_location?: string;
  hours_remaining?: number;
  time_with_current_parent_hours?: number;
  days_with_current_parent?: number;
  custody_started_at?: string;
  progress_percentage: number;
}

/**
 * Full custody status response from backend
 */
export interface CustodyStatusResponse {
  family_file_id: string;
  case_id?: string;
  current_user_id: string;
  coparent_id?: string;
  coparent_name?: string;
  children: ChildCustodyStatus[];
  agreement_active_days?: number;
}

/**
 * Get current custody status for the dashboard
 * Returns real-time custody data including:
 * - Which parent has each child
 * - Time remaining until next exchange
 * - Progress percentage
 * - Days since agreement active
 */
export async function getCustodyStatus(familyFileId: string): Promise<CustodyStatusResponse> {
  return fetchWithParentAuth<CustodyStatusResponse>(
    `/exchanges/family-file/${familyFileId}/custody-status`
  );
}

// Backend exchange response type (differs from our normalized CustodyExchange)
interface BackendExchange {
  id: string;
  case_id?: string;
  family_file_id?: string;
  scheduled_time?: string;
  scheduled_at?: string;
  next_occurrence?: string;
  location?: string;
  location_name?: string;
  from_parent_id?: string;
  to_parent_id?: string;
  from_parent?: CustodyParent;
  to_parent?: CustodyParent;
  viewer_role?: string;
  other_parent_name?: string;
  status?: string;
}

/**
 * Get current custody summary for a family
 * Constructs summary from available endpoints since backend doesn't have dedicated custody summary
 */
export async function getCustodySummary(familyFileId: string): Promise<CustodySummary> {
  // Get exchanges and family data to construct summary
  const [exchanges, familyData] = await Promise.all([
    fetchWithParentAuth<BackendExchange[]>(`/exchanges/case/${familyFileId}`).catch(() => []),
    fetchWithParentAuth<{ items: Array<{ id: string; first_name: string; last_name: string }> }>(
      `/family-files/${familyFileId}/children`
    ).catch(() => ({ items: [] })),
  ]);

  // Find next exchange - backend uses scheduled_time or next_occurrence
  const now = new Date();
  const exchangeList = Array.isArray(exchanges) ? exchanges : [];
  const upcomingExchanges = exchangeList
    .filter(ex => {
      const scheduledDate = ex.next_occurrence || ex.scheduled_time || ex.scheduled_at;
      return scheduledDate && new Date(scheduledDate) > now;
    })
    .sort((a, b) => {
      const dateA = a.next_occurrence || a.scheduled_time || a.scheduled_at || '';
      const dateB = b.next_occurrence || b.scheduled_time || b.scheduled_at || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

  const nextExchange = upcomingExchanges[0];
  const children = familyData?.items || [];

  // Determine viewer's parent role from exchange data
  const viewerRole = nextExchange?.viewer_role;
  const isDropoff = viewerRole === 'dropoff';

  // Calculate week/month days (approximate since we don't have daily records)
  const weekDays = { parent_a: 4, parent_b: 3 }; // Default approximate split
  const monthDays = { parent_a: 15, parent_b: 15 };

  return {
    family_file_id: familyFileId,
    current_custody_parent: 'parent_a', // Default
    current_custody_since: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    next_exchange: nextExchange ? {
      id: nextExchange.id,
      scheduled_at: nextExchange.next_occurrence || nextExchange.scheduled_time || nextExchange.scheduled_at || '',
      from_parent: isDropoff ? 'parent_a' : 'parent_b',
      to_parent: isDropoff ? 'parent_b' : 'parent_a',
      location_name: nextExchange.location || nextExchange.location_name,
    } : undefined,
    children: children.map(c => ({
      id: c.id,
      name: `${c.first_name}${c.last_name ? ' ' + c.last_name : ''}`,
      with_parent: 'parent_a' as CustodyParent,
    })),
    this_week_days: weekDays,
    this_month_days: monthDays,
  };
}

/**
 * Get custody records for a date range
 */
export async function getCustodyRecords(
  familyFileId: string,
  startDate: string,
  endDate: string
): Promise<{ items: CustodyDayRecord[]; total: number }> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  return fetchWithParentAuth(`/custody-time/family-file/${familyFileId}/records?${params}`);
}

/**
 * Override custody for a specific date (manual adjustment)
 */
export async function overrideCustody(data: {
  family_file_id: string;
  date: string;
  custody_parent: CustodyParent;
  child_ids: string[];
  reason: string;
}): Promise<CustodyDayRecord> {
  return fetchWithParentAuth('/exchanges/custody/override', {
    method: 'POST',
    body: data,
  });
}

// ============================================================
// Exchange Management
// ============================================================

/**
 * Create a new custody exchange
 */
export async function createExchange(data: {
  family_file_id: string;
  from_parent: CustodyParent;
  to_parent: CustodyParent;
  scheduled_at: string;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  geofence_radius_meters?: number;
  child_ids: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  silent_handoff_enabled?: boolean;
  qr_confirmation_required?: boolean;
  check_in_window_before_minutes?: number;
  check_in_window_after_minutes?: number;
  notes?: string;
}): Promise<CustodyExchange> {
  return fetchWithParentAuth('/exchanges', {
    method: 'POST',
    body: data,
  });
}

// Backend response type for list exchanges
interface BackendExchangeResponse {
  id: string;
  case_id?: string;
  family_file_id?: string;
  scheduled_time?: string;
  scheduled_at?: string;
  next_occurrence?: string;
  location?: string;
  location_name?: string;
  from_parent_id?: string;
  to_parent_id?: string;
  from_parent?: CustodyParent;
  to_parent?: CustodyParent;
  child_ids?: string[];
  is_recurring?: boolean;
  recurrence_pattern?: string;
  silent_handoff_enabled?: boolean;
  qr_confirmation_required?: boolean;
  check_in_window_before_minutes?: number;
  check_in_window_after_minutes?: number;
  geofence_radius_meters?: number;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  children_names?: string[];
  viewer_role?: string;
  other_parent_name?: string;
}

// Normalize backend exchange response to our CustodyExchange type
function normalizeExchange(backend: BackendExchangeResponse): CustodyExchange {
  return {
    id: backend.id,
    family_file_id: backend.family_file_id || backend.case_id || '',
    // Use scheduled_time, next_occurrence, or scheduled_at - prioritize scheduled_time
    scheduled_at: backend.scheduled_time || backend.next_occurrence || backend.scheduled_at || '',
    location_name: backend.location_name || backend.location,
    location_address: backend.location_address,
    location_lat: backend.location_lat,
    location_lng: backend.location_lng,
    from_parent: backend.from_parent || (backend.viewer_role === 'dropoff' ? 'parent_a' : 'parent_b'),
    to_parent: backend.to_parent || (backend.viewer_role === 'dropoff' ? 'parent_b' : 'parent_a'),
    child_ids: backend.child_ids || [],
    is_recurring: backend.is_recurring || false,
    recurrence_pattern: backend.recurrence_pattern,
    silent_handoff_enabled: backend.silent_handoff_enabled || false,
    qr_confirmation_required: backend.qr_confirmation_required || false,
    check_in_window_before_minutes: backend.check_in_window_before_minutes || 30,
    check_in_window_after_minutes: backend.check_in_window_after_minutes || 30,
    geofence_radius_meters: backend.geofence_radius_meters || 100,
    status: (backend.status as ExchangeStatus) || 'scheduled',
    notes: backend.notes,
    created_at: backend.created_at || new Date().toISOString(),
    updated_at: backend.updated_at || new Date().toISOString(),
    children_names: backend.children_names,
  };
}

/**
 * Get all exchanges for a family
 */
export async function getExchanges(
  familyFileId: string,
  filters?: {
    status?: ExchangeStatus;
    upcoming_only?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<CustodyExchange[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.upcoming_only) params.set('upcoming_only', 'true');
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';

  // Backend returns array directly, not { items: [...] }
  const response = await fetchWithParentAuth<BackendExchangeResponse[]>(
    `/exchanges/case/${familyFileId}${query}`
  );

  // Normalize the response to our expected format
  const exchanges = Array.isArray(response) ? response : [];
  return exchanges.map(normalizeExchange);
}

/**
 * Get a specific exchange
 */
export async function getExchange(exchangeId: string): Promise<CustodyExchange> {
  const response = await fetchWithParentAuth<BackendExchangeResponse>(
    `/exchanges/${exchangeId}`
  );
  return normalizeExchange(response);
}

/**
 * Update an exchange
 */
export async function updateExchange(
  exchangeId: string,
  data: {
    scheduled_at?: string;
    location_name?: string;
    location_address?: string;
    location_lat?: number;
    location_lng?: number;
    notes?: string;
  }
): Promise<CustodyExchange> {
  return fetchWithParentAuth(`/exchanges/${exchangeId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Cancel an exchange
 */
export async function cancelExchange(
  exchangeId: string,
  reason: string
): Promise<CustodyExchange> {
  return fetchWithParentAuth(`/exchanges/instances/${exchangeId}/cancel`, {
    method: 'POST',
    body: { notes: reason },
  });
}

// ============================================================
// Exchange Instances (for tracking actual exchanges)
// ============================================================

/**
 * Get exchange instances (history)
 */
export async function getExchangeInstances(
  exchangeId: string,
  filters?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ items: ExchangeInstance[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/exchanges/${exchangeId}/instances${query}`);
}

/**
 * Get upcoming exchange instance
 */
export async function getUpcomingInstance(
  exchangeId: string
): Promise<ExchangeInstance | null> {
  return fetchWithParentAuth(`/exchanges/case/${exchangeId}/upcoming`);
}

// ============================================================
// Silent Drops (GPS Verification)
// ============================================================

/**
 * Check in at exchange location (Silent Handoff)
 */
export async function checkInAtExchange(
  data: SilentHandoffCheckIn
): Promise<{
  success: boolean;
  in_geofence: boolean;
  distance_meters: number;
  message: string;
}> {
  return fetchWithParentAuth('/exchanges/silent-handoff/check-in', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get QR token for confirmation
 */
export async function getQRToken(
  exchangeInstanceId: string
): Promise<{
  token: string;
  expires_at: string;
}> {
  return fetchWithParentAuth(`/exchanges/instances/${exchangeInstanceId}/qr-token`);
}

/**
 * Confirm exchange via QR code
 */
export async function confirmWithQR(
  data: QRConfirmation
): Promise<{
  success: boolean;
  handoff_outcome: HandoffOutcome;
  message: string;
}> {
  return fetchWithParentAuth('/exchanges/silent-handoff/confirm-qr', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get exchange window status
 */
export async function getWindowStatus(
  exchangeInstanceId: string
): Promise<{
  is_open: boolean;
  window_start: string;
  window_end: string;
  from_parent_checked_in: boolean;
  to_parent_checked_in: boolean;
  time_remaining_seconds?: number;
}> {
  return fetchWithParentAuth(`/exchanges/instances/${exchangeInstanceId}/status`);
}

// ============================================================
// Compliance & History
// ============================================================

/**
 * Get exchange compliance stats
 */
export async function getComplianceStats(
  familyFileId: string,
  period?: 'month' | 'quarter' | 'year'
): Promise<{
  total_exchanges: number;
  completed_exchanges: number;
  missed_exchanges: number;
  disputed_exchanges: number;
  on_time_rate: number;
  parent_a_compliance: number;
  parent_b_compliance: number;
}> {
  const query = period ? `?period=${period}` : '';
  return fetchWithParentAuth(`/custody-time/family-file/${familyFileId}/compliance${query}`);
}

/**
 * Get exchange history
 */
export async function getExchangeHistory(
  familyFileId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    outcome?: HandoffOutcome;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: ExchangeInstance[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  if (filters?.outcome) params.set('outcome', filters.outcome);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/exchanges/case/${familyFileId}/history${query}`);
}

// ============================================================
// Geocoding
// ============================================================

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formatted_address: string;
}> {
  return fetchWithParentAuth('/exchanges/geocode', {
    method: 'POST',
    body: { address },
  });
}

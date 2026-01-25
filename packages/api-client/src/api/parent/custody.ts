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
 * Get current custody summary for a family
 */
export async function getCustodySummary(familyFileId: string): Promise<CustodySummary> {
  return fetchWithParentAuth(`/custody/summary/${familyFileId}`);
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
  return fetchWithParentAuth(`/custody/records/${familyFileId}?${params}`);
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
  return fetchWithParentAuth('/custody/override', {
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
  return fetchWithParentAuth('/custody/exchanges', {
    method: 'POST',
    body: data,
  });
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
): Promise<{ items: CustodyExchange[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.upcoming_only) params.set('upcoming_only', 'true');
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/custody/exchanges/family/${familyFileId}${query}`);
}

/**
 * Get a specific exchange
 */
export async function getExchange(exchangeId: string): Promise<CustodyExchange> {
  return fetchWithParentAuth(`/custody/exchanges/${exchangeId}`);
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
  return fetchWithParentAuth(`/custody/exchanges/${exchangeId}`, {
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
  return fetchWithParentAuth(`/custody/exchanges/${exchangeId}/cancel`, {
    method: 'POST',
    body: { reason },
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
  return fetchWithParentAuth(`/custody/exchanges/${exchangeId}/instances${query}`);
}

/**
 * Get upcoming exchange instance
 */
export async function getUpcomingInstance(
  exchangeId: string
): Promise<ExchangeInstance | null> {
  return fetchWithParentAuth(`/custody/exchanges/${exchangeId}/upcoming`);
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
  return fetchWithParentAuth('/custody/silent-handoff/check-in', {
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
  return fetchWithParentAuth(`/custody/silent-handoff/${exchangeInstanceId}/qr-token`);
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
  return fetchWithParentAuth('/custody/silent-handoff/confirm-qr', {
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
  return fetchWithParentAuth(`/custody/silent-handoff/${exchangeInstanceId}/status`);
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
  return fetchWithParentAuth(`/custody/compliance/${familyFileId}${query}`);
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
  return fetchWithParentAuth(`/custody/history/${familyFileId}${query}`);
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
  return fetchWithParentAuth('/custody/geocode', {
    method: 'POST',
    body: { address },
  });
}

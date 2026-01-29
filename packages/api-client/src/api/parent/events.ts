/**
 * Events API Client for Parents
 *
 * Schedule event management with categories and RSVP.
 * Features:
 * - Create/update/delete events
 * - Event categories (medical, school, sports, exchange)
 * - RSVP/attendance tracking
 * - Conflict checking with time blocks
 * - GPS check-in for events
 */

import { fetchWithParentAuth } from '../../core';

// ============================================================
// Types
// ============================================================

export type EventVisibility = 'private' | 'co_parent';

export type EventCategory =
  | 'medical'
  | 'school'
  | 'sports'
  | 'exchange'
  | 'extracurricular'
  | 'therapy'
  | 'social'
  | 'travel'
  | 'other';

export type RSVPStatus = 'going' | 'not_going' | 'maybe' | 'no_response';

export type InvitedRole = 'required' | 'optional' | 'fyi';

export interface AttendanceInvite {
  parent_id: string;
  invited_role: InvitedRole;
}

export interface CategoryData {
  // Medical
  provider_name?: string;
  appointment_type?: string;
  insurance_info?: string;

  // School
  school_name?: string;
  teacher_name?: string;
  grade?: string;

  // Sports
  team_name?: string;
  sport_type?: string;
  coach_name?: string;
  uniform_required?: boolean;

  // General
  notes?: string;
  contact_phone?: string;
  cost?: number;
}

export interface ScheduleEvent {
  id: string;
  family_file_id: string;
  collection_id?: string;
  creator_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day: boolean;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  location_shared: boolean;
  visibility: EventVisibility;
  event_category?: EventCategory;
  category_data?: CategoryData;
  child_ids: string[];
  status: 'scheduled' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;

  // Computed/joined fields
  children_names?: string[];
  creator_name?: string;
  my_rsvp_status?: RSVPStatus;
  attendance_summary?: {
    going: number;
    not_going: number;
    maybe: number;
    no_response: number;
  };
}

export interface EventAttendance {
  id: string;
  event_id: string;
  parent_id: string;
  invited_role: InvitedRole;
  rsvp_status: RSVPStatus;
  rsvp_note?: string;
  rsvp_at?: string;
  parent_name?: string;
}

export interface EventCheckIn {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
  check_in_method: 'gps' | 'manual';
  in_geofence?: boolean;
  distance_from_location?: number;
  latitude?: number;
  longitude?: number;
  device_accuracy?: number;
}

export interface ConflictCheckResult {
  has_conflict: boolean;
  conflicts: Array<{
    type: 'event' | 'time_block' | 'exchange';
    message: string;
    start_time: string;
    end_time: string;
  }>;
  warnings: string[];
}

export interface MyTimeCollection {
  id: string;
  family_file_id: string;
  child_id: string;
  name: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  collection_id: string;
  day_of_week: number; // 0-6, Sunday = 0
  start_time: string; // HH:MM format
  end_time: string;
  is_available: boolean;
  notes?: string;
}

// ============================================================
// Event Management
// ============================================================

/**
 * Create a new schedule event
 */
export async function createEvent(data: {
  family_file_id: string;
  collection_id?: string;
  title: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  description?: string;
  location?: string;
  location_shared?: boolean;
  visibility?: EventVisibility;
  event_category?: EventCategory;
  category_data?: CategoryData;
  child_ids?: string[];
  attendance_invites?: AttendanceInvite[];
}): Promise<ScheduleEvent> {
  return fetchWithParentAuth('/events/', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get an event by ID
 */
export async function getEvent(eventId: string): Promise<ScheduleEvent> {
  return fetchWithParentAuth(`/events/${eventId}`);
}

/**
 * List events for a family file
 */
export async function listEvents(
  familyFileId: string,
  filters?: {
    start_date?: string;
    end_date?: string;
    category?: EventCategory;
    child_id?: string;
  }
): Promise<ScheduleEvent[]> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.set('start_date', filters.start_date);
  if (filters?.end_date) params.set('end_date', filters.end_date);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.child_id) params.set('child_id', filters.child_id);
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/events/cases/${familyFileId}${query}`);
}

/**
 * Update an event
 */
export async function updateEvent(
  eventId: string,
  data: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    location_shared?: boolean;
    event_category?: EventCategory;
    category_data?: CategoryData;
  }
): Promise<ScheduleEvent> {
  return fetchWithParentAuth(`/events/${eventId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Delete (cancel) an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  return fetchWithParentAuth(`/events/${eventId}`, {
    method: 'DELETE',
  });
}

// ============================================================
// RSVP / Attendance
// ============================================================

/**
 * Update RSVP status for an event
 */
export async function updateRSVP(
  eventId: string,
  data: {
    rsvp_status: RSVPStatus;
    rsvp_note?: string;
  }
): Promise<EventAttendance> {
  return fetchWithParentAuth(`/events/${eventId}/rsvp`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Get attendance records for an event
 */
export async function getEventAttendance(
  eventId: string
): Promise<EventAttendance[]> {
  return fetchWithParentAuth(`/events/${eventId}/attendance`);
}

// ============================================================
// Conflict Checking
// ============================================================

/**
 * Check if proposed event time conflicts with other commitments
 */
export async function checkConflicts(
  familyFileId: string,
  startTime: string,
  endTime: string
): Promise<ConflictCheckResult> {
  const params = new URLSearchParams({
    case_id: familyFileId,
    start_time: startTime,
    end_time: endTime,
  });
  return fetchWithParentAuth(`/events/check-conflicts?${params}`, {
    method: 'POST',
  });
}

// ============================================================
// GPS Check-In
// ============================================================

/**
 * Check in to an event with GPS verification
 */
export async function checkInWithGPS(
  eventId: string,
  data: {
    latitude: number;
    longitude: number;
    device_accuracy?: number;
  }
): Promise<EventCheckIn> {
  const params = new URLSearchParams({
    latitude: data.latitude.toString(),
    longitude: data.longitude.toString(),
    device_accuracy: (data.device_accuracy || 0).toString(),
  });
  return fetchWithParentAuth(`/events/${eventId}/check-in/gps?${params}`, {
    method: 'POST',
  });
}

// ============================================================
// My Time Collections
// ============================================================

/**
 * Get collections for a child
 */
export async function getCollections(
  childId: string
): Promise<MyTimeCollection[]> {
  return fetchWithParentAuth(`/my-time/children/${childId}/collections`);
}

/**
 * Create a new collection
 */
export async function createCollection(data: {
  family_file_id: string;
  child_id: string;
  name: string;
  color?: string;
}): Promise<MyTimeCollection> {
  return fetchWithParentAuth('/my-time/collections', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a collection
 */
export async function updateCollection(
  collectionId: string,
  data: {
    name?: string;
    color?: string;
  }
): Promise<MyTimeCollection> {
  return fetchWithParentAuth(`/my-time/collections/${collectionId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  return fetchWithParentAuth(`/my-time/collections/${collectionId}`, {
    method: 'DELETE',
  });
}

// ============================================================
// Time Blocks
// ============================================================

/**
 * Get time blocks for a collection
 */
export async function getTimeBlocks(
  collectionId: string
): Promise<TimeBlock[]> {
  return fetchWithParentAuth(`/my-time/collections/${collectionId}/blocks`);
}

/**
 * Create a time block
 */
export async function createTimeBlock(data: {
  collection_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available?: boolean;
  notes?: string;
}): Promise<TimeBlock> {
  return fetchWithParentAuth('/my-time/blocks', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a time block
 */
export async function updateTimeBlock(
  blockId: string,
  data: {
    start_time?: string;
    end_time?: string;
    is_available?: boolean;
    notes?: string;
  }
): Promise<TimeBlock> {
  return fetchWithParentAuth(`/my-time/blocks/${blockId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Delete a time block
 */
export async function deleteTimeBlock(blockId: string): Promise<void> {
  return fetchWithParentAuth(`/my-time/blocks/${blockId}`, {
    method: 'DELETE',
  });
}

// ============================================================
// Calendar Combined View
// ============================================================

/**
 * Get combined calendar data (events + exchanges + busy periods)
 */
export async function getCombinedCalendar(
  familyFileId: string,
  startDate: string,
  endDate: string
): Promise<{
  events: ScheduleEvent[];
  exchanges: Array<{
    id: string;
    scheduled_at: string;
    from_parent: string;
    to_parent: string;
    location_name?: string;
    status: string;
  }>;
  busy_periods: Array<{
    start: string;
    end: string;
    owner: 'me' | 'coparent';
    type: 'time_block' | 'event';
  }>;
}> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  return fetchWithParentAuth(`/calendar/combined/${familyFileId}?${params}`);
}

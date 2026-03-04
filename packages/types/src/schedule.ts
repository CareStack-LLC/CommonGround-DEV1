/**
 * Schedule and Calendar types for CommonGround
 */

export interface ScheduleEvent {
  id: string;
  family_file_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  recurring?: boolean;
  recurrence_rule?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EventType =
  | 'custody_exchange'
  | 'medical'
  | 'school'
  | 'sports'
  | 'extracurricular'
  | 'court'
  | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  event_type: EventType;
  color?: string;
  location?: string;
  description?: string;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  start_date: string;
  end_date: string;
}

export interface CustodyExchange {
  id: string;
  family_file_id: string;
  title: string;
  exchange_type: ExchangeType;
  // Schedule
  day_of_week: number; // 0-6
  exchange_time: string; // "18:00"
  is_recurring: boolean;
  recurrence_rule?: string;
  // Location
  location_name: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  // Parties
  dropoff_parent_id: string;
  pickup_parent_id: string;
  // Settings
  check_in_required: boolean;
  check_in_window_minutes: number;
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ExchangeType = 'regular' | 'holiday' | 'special' | 'makeup';

export interface CustodyExchangeInstance {
  id: string;
  exchange_id: string;
  scheduled_date: string;
  scheduled_time: string;
  // Check-ins
  dropoff_check_in?: ExchangeCheckIn;
  pickup_check_in?: ExchangeCheckIn;
  // Status
  status: ExchangeInstanceStatus;
  notes?: string;
  // Child info
  child_ids?: string[];
  created_at: string;
}

export type ExchangeInstanceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'cancelled'
  | 'disputed';

export interface ExchangeCheckIn {
  id: string;
  instance_id: string;
  parent_id: string;
  check_in_type: 'dropoff' | 'pickup';
  check_in_time: string;
  location_lat?: number;
  location_lng?: number;
  location_accuracy?: number;
  photo_url?: string;
  notes?: string;
}

export interface CreateCustodyExchangeRequest {
  title: string;
  exchange_type?: ExchangeType;
  day_of_week: number;
  exchange_time: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  location_name: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  dropoff_parent_id: string;
  pickup_parent_id: string;
  check_in_required?: boolean;
  check_in_window_minutes?: number;
  child_ids?: string[];
}

export interface UpdateCustodyExchangeRequest {
  title?: string;
  exchange_type?: ExchangeType;
  day_of_week?: number;
  exchange_time?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  check_in_required?: boolean;
  check_in_window_minutes?: number;
  is_active?: boolean;
}

export interface ComplianceMetrics {
  total_exchanges: number;
  completed_on_time: number;
  completed_late: number;
  missed: number;
  compliance_rate: number;
  average_delay_minutes?: number;
}

export interface TimeBlock {
  id: string;
  collection_id: string;
  family_file_id: string;
  name: string;
  color: string;
  parent_type: 'parent_a' | 'parent_b';
  // Schedule
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  effective_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface MyTimeCollection {
  id: string;
  family_file_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreateTimeBlockRequest {
  collection_id: string;
  name: string;
  color?: string;
  parent_type: 'parent_a' | 'parent_b';
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  effective_date?: string;
  end_date?: string;
}

export interface UpdateTimeBlockRequest {
  name?: string;
  color?: string;
  parent_type?: 'parent_a' | 'parent_b';
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  effective_date?: string;
  end_date?: string;
}

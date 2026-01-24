/**
 * KidComs types for CommonGround
 *
 * KidComs enables children to have video calls, watch content together,
 * play games, and communicate with their approved circle contacts.
 */

export type SessionType = 'video_call' | 'theater' | 'arcade' | 'whiteboard' | 'mixed';
export type SessionStatus = 'scheduled' | 'waiting' | 'ringing' | 'active' | 'completed' | 'cancelled' | 'rejected' | 'missed';
export type ParticipantType = 'child' | 'parent' | 'circle_contact';

export interface KidComsSettings {
  id: string;
  family_file_id: string;
  // Circle approval settings
  circle_approval_mode: 'both_parents' | 'either_parent' | 'parent_a' | 'parent_b';
  // Availability schedule
  availability_schedule?: Record<string, { start: string; end: string }>;
  enforce_availability: boolean;
  // Notifications
  require_parent_notification: boolean;
  notify_on_session_start: boolean;
  notify_on_session_end: boolean;
  notify_on_aria_flag: boolean;
  // Feature toggles
  allowed_features: {
    video: boolean;
    chat: boolean;
    theater: boolean;
    arcade: boolean;
    whiteboard: boolean;
  };
  // Session limits
  max_session_duration_minutes: number;
  max_daily_sessions: number;
  max_participants_per_session: number;
  // Parental controls
  require_parent_in_call: boolean;
  allow_child_to_initiate: boolean;
  record_sessions: boolean;
  created_at: string;
  updated_at: string;
}

export interface KidComsSettingsUpdate {
  circle_approval_mode?: string;
  availability_schedule?: Record<string, { start: string; end: string }>;
  enforce_availability?: boolean;
  require_parent_notification?: boolean;
  notify_on_session_start?: boolean;
  notify_on_session_end?: boolean;
  notify_on_aria_flag?: boolean;
  allowed_features?: {
    video?: boolean;
    chat?: boolean;
    theater?: boolean;
    arcade?: boolean;
    whiteboard?: boolean;
  };
  max_session_duration_minutes?: number;
  max_daily_sessions?: number;
  max_participants_per_session?: number;
  require_parent_in_call?: boolean;
  allow_child_to_initiate?: boolean;
  record_sessions?: boolean;
}

export interface SessionParticipant {
  id: string;
  type: ParticipantType;
  name: string;
  joined_at?: string;
  left_at?: string;
}

export interface KidComsSession {
  id: string;
  family_file_id: string;
  child_id: string;
  circle_contact_id?: string;
  session_type: SessionType;
  title?: string;
  status: SessionStatus;
  // Daily.co room info
  daily_room_name: string;
  daily_room_url: string;
  // Participants
  participants: SessionParticipant[];
  initiated_by_id: string;
  initiated_by_type: ParticipantType;
  // Timing
  scheduled_for?: string;
  ringing_started_at?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  // Features used
  features_used: string[];
  // ARIA stats
  total_messages: number;
  flagged_messages: number;
  // Recording (new fields for server-side recording)
  recording_enabled?: boolean;
  recording_status?: RecordingStatus;
  recording_url?: string;
  recording_s3_key?: string;
  recording_duration_seconds?: number;
  // Transcript
  transcript_status?: RecordingStatus;
  transcript_url?: string;
  transcript_s3_key?: string;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type RecordingStatus = 'pending' | 'recording' | 'processing' | 'ready' | 'failed';

export interface KidComsSessionCreate {
  child_id: string;
  circle_contact_id?: string;
  session_type?: SessionType;
  title?: string;
  scheduled_for?: string;
}

export interface KidComsMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: ParticipantType;
  sender_name: string;
  content: string;
  original_content?: string;
  // ARIA analysis
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_category?: string;
  aria_reason?: string;
  aria_score?: number;
  // Status
  is_delivered: boolean;
  is_hidden: boolean;
  sent_at: string;
}

export interface KidComsSessionList {
  items: KidComsSession[];
  total: number;
}

export interface KidComsMessageList {
  items: KidComsMessage[];
  total: number;
}

export interface JoinSessionResponse {
  session: KidComsSession;
  token: string;
  room_url: string;
}

export interface ChildSessionCreate {
  circle_contact_id: string;
  session_type?: SessionType;
}

export interface CircleContactSessionCreate {
  child_id: string;
  session_type?: SessionType;
}

export interface KidComsRoom {
  id: string;
  family_file_id: string;
  room_number: number;
  room_type: 'parent_a' | 'parent_b' | 'circle';
  room_name?: string;
  assigned_to_id?: string;
  daily_room_name?: string;
  daily_room_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KidComsRoomList {
  items: KidComsRoom[];
  total: number;
}

export interface ChildUser {
  id: string;
  child_id: string;
  family_file_id: string;
  username: string;
  avatar_id?: string;
  last_login?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChildUserList {
  items: ChildUser[];
  total: number;
}

export interface ChildAvatar {
  id: string;
  name: string;
  image_url: string;
}

export interface ChildLoginResponse {
  access_token: string;
  token_type: string;
  child_user: ChildUser;
  child: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string;
  };
  family_file_id: string;
}

export interface CommunicationLog {
  id: string;
  room_id?: string;
  session_id?: string;
  family_file_id: string;
  child_id: string;
  contact_type: string;
  contact_id?: string;
  contact_name?: string;
  communication_type: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  aria_flags?: Record<string, unknown>;
  total_messages: number;
  flagged_messages: number;
  recording_url?: string;
  created_at: string;
}

export interface IncomingCall {
  session_id: string;
  caller_id: string;
  caller_type: ParticipantType;
  caller_name: string;
  caller_photo_url?: string;
  child_id: string;
  child_name: string;
  started_at: string;
  room_url: string;
}

export interface IncomingCallList {
  calls: IncomingCall[];
}

export interface CallJoinResponse {
  session: KidComsSession;
  token: string;
  room_url: string;
}

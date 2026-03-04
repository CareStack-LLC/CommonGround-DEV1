/**
 * Recording and Transcription types for CommonGround
 *
 * Used for server-side recording via Daily.co and audit trail.
 */

export type RecordingStatus = 'pending' | 'recording' | 'processing' | 'ready' | 'failed';
export type RecordingSessionType = 'parent_call' | 'kidcoms';
export type AccessType = 'view' | 'download' | 'export' | 'share';
export type ExportFormat = 'pdf' | 'mp4' | 'vtt' | 'evidence_bundle';

export interface Recording {
  id: string;
  session_id: string;
  session_type: RecordingSessionType;
  family_file_id: string;
  // Recording data
  recording_url?: string;
  recording_s3_key?: string;
  recording_status: RecordingStatus;
  recording_duration_seconds?: number;
  recording_file_size_bytes?: number;
  recording_format: string;
  // Transcript data
  transcript_url?: string;
  transcript_s3_key?: string;
  transcript_status: RecordingStatus;
  transcript_word_count?: number;
  transcript_language: string;
  // Metadata
  started_at?: string;
  ended_at?: string;
  participants: RecordingParticipant[];
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface RecordingParticipant {
  id: string;
  name: string;
  type: 'parent' | 'child' | 'circle_contact';
  joined_at: string;
  left_at?: string;
}

export interface RecordingAccessLog {
  id: string;
  session_id: string;
  session_type: RecordingSessionType;
  accessed_by_id: string;
  accessed_by_name?: string;
  access_type: AccessType;
  ip_address?: string;
  user_agent?: string;
  export_format?: ExportFormat;
  export_reason?: string;
  created_at: string;
}

export interface RecordingResponse {
  recording: Recording;
  stream_url: string;
  expires_in: number;
}

export interface TranscriptResponse {
  session_id: string;
  session_type: RecordingSessionType;
  transcript_url: string;
  format: 'vtt' | 'json';
  word_count: number;
  duration_seconds: number;
  speakers: TranscriptSpeaker[];
}

export interface TranscriptSpeaker {
  id: string;
  name: string;
  word_count: number;
  speaking_time_seconds: number;
}

export interface TranscriptChunk {
  id: string;
  session_id: string;
  speaker_id: string;
  speaker_name: string;
  content: string;
  confidence: number;
  start_time: number;
  end_time: number;
  timestamp: string;
  // ARIA analysis
  analyzed: boolean;
  flagged: boolean;
  toxicity_score?: number;
}

export interface RecordingExportRequest {
  session_id: string;
  session_type: RecordingSessionType;
  format: ExportFormat;
  reason?: string;
  include_transcript?: boolean;
  include_aria_flags?: boolean;
}

export interface RecordingExportResponse {
  export_id: string;
  download_url: string;
  expires_at: string;
  format: ExportFormat;
}

export interface RecordingListResponse {
  items: Recording[];
  total: number;
}

export interface DailyWebhookPayload {
  type: DailyWebhookEvent;
  room_name: string;
  timestamp: string;
  // Recording events
  recording_id?: string;
  s3_key?: string;
  download_link?: string;
  duration?: number;
  size?: number;
  // Error events
  error_msg?: string;
}

export type DailyWebhookEvent =
  | 'recording.started'
  | 'recording.stopped'
  | 'recording.ready-to-download'
  | 'recording.error'
  | 'transcript.started'
  | 'transcript.stopped'
  | 'transcript.ready-to-download'
  | 'transcript.error';

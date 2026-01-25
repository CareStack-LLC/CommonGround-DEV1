/**
 * Recordings API endpoints
 *
 * Provides access to call recordings, transcriptions, audit trails,
 * and evidence export for court-admissible documentation.
 */

import { fetchWithParentAuth } from '../../core';

// =============================================================================
// Types
// =============================================================================

export type RecordingType = 'video_call' | 'audio_call' | 'screen_share';
export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'deleted';
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Recording {
  id: string;
  family_file_id: string;
  recording_type: RecordingType;
  status: RecordingStatus;
  duration_seconds?: number;
  file_size_bytes?: number;
  format?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  has_transcription: boolean;
  transcription_status?: TranscriptionStatus;
  is_protected: boolean;
  file_hash?: string;
  integrity_status?: string;
}

export interface RecordingDetail extends Recording {
  download_url?: string;
  download_url_expires_at?: string;
}

export interface TranscriptionChunk {
  id: string;
  speaker_name?: string;
  speaker_label: string;
  content: string;
  start_time: number;
  end_time: number;
  confidence?: number;
  is_flagged: boolean;
  flag_reason?: string;
}

export interface Transcription {
  id: string;
  recording_id: string;
  status: TranscriptionStatus;
  language?: string;
  duration_seconds?: number;
  word_count?: number;
  speaker_count?: number;
  full_text?: string;
  chunks: TranscriptionChunk[];
}

export interface RecordingsListResponse {
  recordings: Recording[];
  total: number;
  limit: number;
  offset: number;
}

// =============================================================================
// Audit & Compliance Types
// =============================================================================

export interface AccessLogEntry {
  id: string;
  recording_id: string;
  user_id: string;
  user_email?: string;
  user_role: string;
  action: string;
  action_detail?: string;
  accessed_at: string;
  ip_address?: string;
  device_type?: string;
  success: boolean;
  error_message?: string;
  sequence_number: number;
  content_hash: string;
  previous_log_hash?: string;
}

export interface AccessHistoryResponse {
  recording_id: string;
  access_count: number;
  entries: AccessLogEntry[];
}

export interface ChainVerificationResponse {
  recording_id: string;
  verified: boolean;
  total_entries: number;
  verified_entries: number;
  first_access?: string;
  last_access?: string;
  broken_links: Array<{
    sequence: number;
    expected_hash: string;
    actual_hash: string;
  }>;
}

export interface IntegrityVerificationResponse {
  recording_id: string;
  verified: boolean;
  status: 'verified' | 'failed' | 'unavailable' | 'no_hash' | 'error';
  stored_hash?: string;
  computed_hash?: string;
  file_size?: number;
  expected_size?: number;
  message: string;
  verified_at?: string;
}

export interface LegalHold {
  recording_id: string;
  is_protected: boolean;
  set_by?: string;
  set_at?: string;
  reason?: string;
  case_number?: string;
}

export interface ComplianceReport {
  recording_id: string;
  generated_at: string;
  recording: {
    id: string;
    type: string;
    duration: number;
    recorded_at?: string;
    file_hash?: string;
    integrity_status?: string;
  };
  chain_of_custody: ChainVerificationResponse;
  legal_hold: LegalHold;
  access_summary: {
    total_access_events: number;
    unique_users: number;
    downloads: number;
    views: number;
  };
  compliance_status: 'compliant' | 'warning' | 'non_compliant';
  issues: string[];
}

// =============================================================================
// Evidence Export Types
// =============================================================================

export interface EvidenceExportRequest {
  case_number?: string;
  court_name?: string;
  court_order_reference?: string;
  discovery_request_id?: string;
  include_transcription?: boolean;
}

export interface EvidenceExportResponse {
  success: boolean;
  export_id: string;
  certificate_number: string;
  package_url: string;
  package_hash: string;
  package_size: number;
  recording_hash: string;
  transcription_included: boolean;
  transcription_hash?: string;
  generated_at: string;
  expires_at: string;
  files_included: string[];
}

export interface ExportCertificate {
  certificate_number: string;
  export_id: string;
  recording_id: string;
  recording_hash: string;
  exported_at: string;
  exported_by_user_id: string;
  case_number?: string;
  court_name?: string;
  package_hash: string;
  chain_verified: boolean;
}

// =============================================================================
// Recording List & Details
// =============================================================================

/**
 * Get list of recordings for a family file
 */
export async function getRecordings(
  familyFileId: string,
  options: {
    limit?: number;
    offset?: number;
    recording_type?: RecordingType;
    status?: RecordingStatus;
  } = {}
): Promise<RecordingsListResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.recording_type) params.set('recording_type', options.recording_type);
  if (options.status) params.set('status', options.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithParentAuth<RecordingsListResponse>(
    `/recordings/family/${familyFileId}${query}`,
    { method: 'GET' }
  );
}

/**
 * Get recording details with download URL
 */
export async function getRecording(recordingId: string): Promise<RecordingDetail> {
  return fetchWithParentAuth<RecordingDetail>(`/recordings/${recordingId}`, {
    method: 'GET',
  });
}

/**
 * Refresh download URL for a recording
 */
export async function refreshDownloadUrl(
  recordingId: string
): Promise<{ download_url: string; expires_at: string }> {
  return fetchWithParentAuth<{ download_url: string; expires_at: string }>(
    `/recordings/${recordingId}/refresh-url`,
    { method: 'POST' }
  );
}

// =============================================================================
// Transcription
// =============================================================================

/**
 * Get transcription for a recording
 */
export async function getTranscription(recordingId: string): Promise<Transcription> {
  return fetchWithParentAuth<Transcription>(
    `/recordings/${recordingId}/transcription`,
    { method: 'GET' }
  );
}

// =============================================================================
// Audit & Chain of Custody
// =============================================================================

/**
 * Get access history for a recording
 */
export async function getAccessHistory(
  recordingId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AccessHistoryResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithParentAuth<AccessHistoryResponse>(
    `/recordings/${recordingId}/access-history${query}`,
    { method: 'GET' }
  );
}

/**
 * Verify chain of custody integrity
 */
export async function verifyChain(recordingId: string): Promise<ChainVerificationResponse> {
  return fetchWithParentAuth<ChainVerificationResponse>(
    `/recordings/${recordingId}/verify-chain`,
    { method: 'GET' }
  );
}

/**
 * Verify file integrity
 */
export async function verifyIntegrity(recordingId: string): Promise<IntegrityVerificationResponse> {
  return fetchWithParentAuth<IntegrityVerificationResponse>(
    `/recordings/${recordingId}/verify-integrity`,
    { method: 'POST' }
  );
}

/**
 * Get auto-verify integrity status
 */
export async function getIntegrityStatus(recordingId: string): Promise<IntegrityVerificationResponse> {
  return fetchWithParentAuth<IntegrityVerificationResponse>(
    `/recordings/${recordingId}/verify-integrity-auto`,
    { method: 'GET' }
  );
}

// =============================================================================
// Legal Hold
// =============================================================================

/**
 * Get legal hold status
 */
export async function getLegalHold(recordingId: string): Promise<LegalHold> {
  return fetchWithParentAuth<LegalHold>(`/recordings/${recordingId}/legal-hold`, {
    method: 'GET',
  });
}

/**
 * Set legal hold on a recording
 */
export async function setLegalHold(
  recordingId: string,
  data: { reason: string; case_number?: string }
): Promise<LegalHold> {
  return fetchWithParentAuth<LegalHold>(`/recordings/${recordingId}/legal-hold`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Release legal hold on a recording
 */
export async function releaseLegalHold(
  recordingId: string,
  data: { reason: string }
): Promise<LegalHold> {
  return fetchWithParentAuth<LegalHold>(`/recordings/${recordingId}/legal-hold`, {
    method: 'DELETE',
    body: data,
  });
}

// =============================================================================
// Compliance & Reports
// =============================================================================

/**
 * Generate compliance report for a recording
 */
export async function getComplianceReport(recordingId: string): Promise<ComplianceReport> {
  return fetchWithParentAuth<ComplianceReport>(
    `/recordings/${recordingId}/compliance-report`,
    { method: 'GET' }
  );
}

// =============================================================================
// Evidence Export
// =============================================================================

/**
 * Generate court-ready evidence package
 */
export async function exportEvidence(
  recordingId: string,
  request: EvidenceExportRequest = {}
): Promise<EvidenceExportResponse> {
  return fetchWithParentAuth<EvidenceExportResponse>(
    `/recordings/${recordingId}/export-evidence`,
    {
      method: 'POST',
      body: request,
    }
  );
}

/**
 * Get export certificate by certificate number
 */
export async function getExportCertificate(
  certificateNumber: string
): Promise<ExportCertificate> {
  return fetchWithParentAuth<ExportCertificate>(
    `/recordings/certificate/${certificateNumber}`,
    { method: 'GET' }
  );
}

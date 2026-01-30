/**
 * Parent exports API - Court-ready documentation packages
 */

import { fetchWithParentAuth } from '../../core';

// Enums matching backend
export enum PackageType {
  INVESTIGATION = 'investigation',
  COURT = 'court',
}

export enum ClaimType {
  SCHEDULE_VIOLATION = 'schedule_violation',
  FINANCIAL_NON_COMPLIANCE = 'financial_non_compliance',
  COMMUNICATION_CONCERN = 'communication_concern',
  SAFETY_CONCERN = 'safety_concern',
  OTHER = 'other',
}

export enum RedactionLevel {
  NONE = 'none',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
}

export enum SectionType {
  AGREEMENT_OVERVIEW = 'agreement_overview',
  COMPLIANCE_SUMMARY = 'compliance_summary',
  PARENTING_TIME = 'parenting_time',
  FINANCIAL_COMPLIANCE = 'financial_compliance',
  COMMUNICATION_COMPLIANCE = 'communication_compliance',
  INTERVENTION_LOG = 'intervention_log',
  PARENT_IMPACT = 'parent_impact',
  CHAIN_OF_CUSTODY = 'chain_of_custody',
  EXCHANGE_GPS_VERIFICATION = 'exchange_gps_verification',
  ITEM_TRACKING = 'item_tracking',
}

export enum ExportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DOWNLOADED = 'downloaded',
}

// Request types
export interface ExportRequest {
  case_id: string;
  package_type: PackageType;
  date_start: string; // ISO date string YYYY-MM-DD
  date_end?: string; // ISO date string YYYY-MM-DD
  claim_type?: ClaimType;
  claim_description?: string;
  redaction_level?: RedactionLevel;
  sections?: SectionType[];
  message_content_redacted?: boolean;
}

// Response types
export interface ExportSection {
  id: string;
  section_type: string;
  section_order: number;
  section_title: string;
  evidence_count: number;
  page_start?: number;
  page_end?: number;
  generation_time_ms?: number;
}

export interface CaseExport {
  id: string;
  case_id: string;
  export_number: string;
  package_type: string;
  claim_type?: string;
  claim_description?: string;
  date_range_start: string;
  date_range_end: string;
  sections_included: string[];
  redaction_level: string;
  message_content_redacted: boolean;
  file_url?: string;
  file_size_bytes?: number;
  page_count?: number;
  content_hash?: string;
  chain_hash?: string;
  watermark_text?: string;
  verification_url?: string;
  evidence_counts?: Record<string, number>;
  status: ExportStatus;
  error_message?: string;
  download_count: number;
  last_downloaded_at?: string;
  generated_at?: string;
  generation_time_seconds?: number;
  expires_at?: string;
  is_permanent: boolean;
  created_at: string;
  sections?: ExportSection[];
}

export interface ExportListResponse {
  exports: CaseExport[];
  total: number;
}

export interface ExportVerification {
  export_number: string;
  is_valid: boolean;
  is_expired: boolean;
  content_hash?: string;
  chain_hash?: string;
  package_type: string;
  date_range_start: string;
  date_range_end: string;
  page_count?: number;
  generated_at?: string;
  generator_type: string;
  verification_timestamp: string;
  message: string;
}

export interface ExportDownloadResponse {
  export_id: string;
  export_number: string;
  file_url: string;
  file_size_bytes?: number;
  content_hash: string;
  expires_in_seconds?: number;
}

// API Functions

/**
 * Create a new case export
 */
export async function createExport(request: ExportRequest): Promise<CaseExport> {
  return fetchWithParentAuth<CaseExport>('/exports/', {
    method: 'POST',
    body: request,
  });
}

/**
 * List exports for a case
 */
export async function listExports(
  caseId: string,
  options?: {
    status?: ExportStatus;
    limit?: number;
    offset?: number;
  }
): Promise<ExportListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());

  const query = params.toString();
  const url = `/exports/case/${caseId}${query ? `?${query}` : ''}`;

  return fetchWithParentAuth<ExportListResponse>(url);
}

/**
 * Get export details
 */
export async function getExport(exportId: string, includeDetails = true): Promise<CaseExport> {
  return fetchWithParentAuth<CaseExport>(
    `/exports/${exportId}${includeDetails ? '?include_sections=true' : ''}`
  );
}

/**
 * Download export PDF
 */
export async function downloadExport(exportId: string): Promise<ExportDownloadResponse> {
  return fetchWithParentAuth<ExportDownloadResponse>(`/exports/${exportId}/download`);
}

/**
 * Delete an export
 */
export async function deleteExport(exportId: string): Promise<void> {
  await fetchWithParentAuth(`/exports/${exportId}`, {
    method: 'DELETE',
  });
}

/**
 * Verify export authenticity (public endpoint - no auth required)
 */
export async function verifyExport(exportNumber: string): Promise<ExportVerification> {
  // This is a public endpoint, but we use the same base URL
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com';
  const response = await fetch(`${baseUrl}/api/v1/exports/verify/${exportNumber}`);
  if (!response.ok) {
    throw new Error('Failed to verify export');
  }
  return response.json() as Promise<ExportVerification>;
}

// Helper functions

/**
 * Get human-readable section name
 */
export function getSectionDisplayName(sectionType: SectionType | string): string {
  const names: Record<string, string> = {
    [SectionType.AGREEMENT_OVERVIEW]: 'Agreement Overview',
    [SectionType.COMPLIANCE_SUMMARY]: 'Compliance Summary',
    [SectionType.PARENTING_TIME]: 'Parenting Time',
    [SectionType.FINANCIAL_COMPLIANCE]: 'Financial Compliance',
    [SectionType.COMMUNICATION_COMPLIANCE]: 'Communication Compliance',
    [SectionType.INTERVENTION_LOG]: 'ARIA Intervention Log',
    [SectionType.PARENT_IMPACT]: 'Parent Impact',
    [SectionType.CHAIN_OF_CUSTODY]: 'Chain of Custody',
    [SectionType.EXCHANGE_GPS_VERIFICATION]: 'Exchange GPS Verification',
    [SectionType.ITEM_TRACKING]: 'Item Tracking',
  };
  return names[sectionType] || sectionType;
}

/**
 * Get section description
 */
export function getSectionDescription(sectionType: SectionType | string): string {
  const descriptions: Record<string, string> = {
    [SectionType.AGREEMENT_OVERVIEW]: 'Summary of custody agreements and modifications',
    [SectionType.COMPLIANCE_SUMMARY]: 'Overall compliance metrics and trends',
    [SectionType.PARENTING_TIME]: 'Custody schedule compliance and exchange records',
    [SectionType.FINANCIAL_COMPLIANCE]: 'Payment history and financial obligations',
    [SectionType.COMMUNICATION_COMPLIANCE]: 'Message frequency, response times, and tone analysis',
    [SectionType.INTERVENTION_LOG]: 'ARIA mediation suggestions and user responses',
    [SectionType.PARENT_IMPACT]: 'Effects of parenting decisions on children',
    [SectionType.CHAIN_OF_CUSTODY]: 'Data integrity verification and access audit trail',
    [SectionType.EXCHANGE_GPS_VERIFICATION]: 'GPS coordinates and geofence compliance for exchanges',
    [SectionType.ITEM_TRACKING]: 'Shared item exchange history',
  };
  return descriptions[sectionType] || '';
}

/**
 * Get all available sections
 */
export function getAllSections(): SectionType[] {
  return Object.values(SectionType);
}

/**
 * Get default sections for package type
 */
export function getDefaultSections(packageType: PackageType): SectionType[] {
  if (packageType === PackageType.INVESTIGATION) {
    // Investigation packages focus on specific concerns
    return [
      SectionType.COMPLIANCE_SUMMARY,
      SectionType.PARENTING_TIME,
      SectionType.COMMUNICATION_COMPLIANCE,
      SectionType.INTERVENTION_LOG,
      SectionType.PARENT_IMPACT,
    ];
  }
  // Court packages include everything
  return getAllSections();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get status display info
 */
export function getStatusDisplay(status: ExportStatus): { label: string; color: string } {
  const displays: Record<ExportStatus, { label: string; color: string }> = {
    [ExportStatus.GENERATING]: { label: 'Generating...', color: '#F59E0B' },
    [ExportStatus.COMPLETED]: { label: 'Ready', color: '#10B981' },
    [ExportStatus.FAILED]: { label: 'Failed', color: '#EF4444' },
    [ExportStatus.DOWNLOADED]: { label: 'Downloaded', color: '#6366F1' },
  };
  return displays[status] || { label: status, color: '#6B7280' };
}

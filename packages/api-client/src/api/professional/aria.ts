/**
 * Professional ARIA API
 *
 * ARIA (AI Relationship Intelligence Assistant) controls for professionals
 */

import { fetchWithParentAuth } from '../../core';

export interface ARIASettings {
  aria_enabled: boolean;
  aria_provider: 'claude' | 'openai' | 'regex';
  sensitivity_level: 'low' | 'medium' | 'high';
  auto_intervene: boolean;
  intervention_threshold: number; // 0.0 - 1.0
  cool_down_minutes: number;
  court_locked: boolean; // If court has locked ARIA settings
}

export interface ARIASettingsUpdate {
  aria_enabled?: boolean;
  aria_provider?: 'claude' | 'openai' | 'regex';
  sensitivity_level?: 'low' | 'medium' | 'high';
  auto_intervene?: boolean;
  intervention_threshold?: number;
  cool_down_minutes?: number;
}

export interface ParentARIAMetrics {
  total_messages: number;
  flagged_messages: number;
  flag_rate: number;
  suggestions_accepted: number;
  suggestions_modified: number;
  suggestions_rejected: number;
  acceptance_rate: number;
  average_toxicity: number;
  trend: 'improving' | 'stable' | 'worsening';
  compliance_score: 'excellent' | 'good' | 'fair' | 'needs_improvement';
}

export interface ARIAMetrics {
  parent_a: ParentARIAMetrics;
  parent_b: ParentARIAMetrics;
  overall_health: 'excellent' | 'good' | 'fair' | 'concerning';
  trend: 'improving' | 'stable' | 'declining';
}

export interface ARIAIntervention {
  id: string;
  message_id: string;
  timestamp: string;
  sender_name: string;
  sender_type: 'parent_a' | 'parent_b';
  toxicity_score: number;
  severity: 'low' | 'medium' | 'high';
  categories: string[];
  original_content_preview?: string; // First 100 chars, redacted
  suggested_content_preview?: string;
  user_action: 'accepted' | 'modified' | 'rejected' | 'held';
  intervention_level: number;
}

export interface ARIAInterventionList {
  items: ARIAIntervention[];
  total: number;
}

/**
 * Get ARIA settings for a case
 */
export async function getARIASettings(familyFileId: string): Promise<ARIASettings> {
  return fetchWithParentAuth<ARIASettings>(`/professional/cases/${familyFileId}/aria/settings`);
}

/**
 * Update ARIA settings for a case
 * Requires can_control_aria permission on case assignment
 */
export async function updateARIASettings(
  familyFileId: string,
  data: ARIASettingsUpdate
): Promise<ARIASettings> {
  return fetchWithParentAuth<ARIASettings>(`/professional/cases/${familyFileId}/aria/settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get ARIA metrics for a case
 */
export async function getARIAMetrics(
  familyFileId: string,
  params?: {
    period_days?: number;
  }
): Promise<ARIAMetrics> {
  const searchParams = new URLSearchParams();
  if (params?.period_days) searchParams.set('period_days', params.period_days.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<ARIAMetrics>(
    `/professional/cases/${familyFileId}/aria/metrics${query ? `?${query}` : ''}`
  );
}

/**
 * Get ARIA interventions for a case
 */
export async function getARIAInterventions(
  familyFileId: string,
  params?: {
    sender_type?: 'parent_a' | 'parent_b';
    severity?: 'low' | 'medium' | 'high';
    user_action?: 'accepted' | 'modified' | 'rejected' | 'held';
    limit?: number;
    offset?: number;
  }
): Promise<ARIAInterventionList> {
  const searchParams = new URLSearchParams();
  if (params?.sender_type) searchParams.set('sender_type', params.sender_type);
  if (params?.severity) searchParams.set('severity', params.severity);
  if (params?.user_action) searchParams.set('user_action', params.user_action);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<ARIAInterventionList>(
    `/professional/cases/${familyFileId}/aria/interventions${query ? `?${query}` : ''}`
  );
}

/**
 * Get single intervention details
 */
export async function getIntervention(interventionId: string): Promise<ARIAIntervention> {
  return fetchWithParentAuth<ARIAIntervention>(`/professional/aria/interventions/${interventionId}`);
}

/**
 * Export ARIA report for court
 */
export async function exportARIAReport(
  familyFileId: string,
  params: {
    period_days?: number;
    include_interventions?: boolean;
    include_metrics?: boolean;
    format?: 'pdf' | 'json';
  }
): Promise<{ download_url: string; expires_at: string }> {
  return fetchWithParentAuth(`/professional/cases/${familyFileId}/aria/export`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

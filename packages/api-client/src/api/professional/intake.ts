/**
 * Professional Intake API
 *
 * Handles ARIA Paralegal intake session management for legal professionals
 */

import { fetchWithParentAuth } from '../../core';

// =============================================================================
// Types
// =============================================================================

export type IntakeStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

export interface IntakeSessionCreate {
  case_id: string;
  family_file_id: string;
  parent_id: string;
  target_forms?: string[];
  custom_questions?: string[];
  expires_in_days?: number;
}

export interface IntakeSessionListItem {
  id: string;
  session_number: string;
  case_id: string;
  parent_id: string;
  target_forms?: string[];
  status: IntakeStatus;
  message_count: number;
  parent_confirmed: boolean;
  professional_reviewed: boolean;
  clarification_requested: boolean;
  access_link_expires_at: string;
  created_at: string;
}

export interface IntakeSessionDetail {
  id: string;
  session_number: string;
  case_id: string;
  family_file_id: string;
  professional_id: string;
  parent_id: string;
  intake_link: string;
  access_link_expires_at: string;
  access_link_used_at?: string;
  target_forms?: string[];
  custom_questions?: string[];
  status: IntakeStatus;
  started_at?: string;
  completed_at?: string;
  message_count: number;
  parent_confirmed: boolean;
  parent_confirmed_at?: string;
  professional_reviewed: boolean;
  professional_reviewed_at?: string;
  clarification_requested: boolean;
  clarification_request?: string;
  clarification_response?: string;
  aria_summary?: string;
  extracted_data?: Record<string, any>;
  draft_form_url?: string;
  created_at: string;
  updated_at: string;
}

export interface IntakeSessionCreatedResponse {
  id: string;
  session_number: string;
  intake_link: string;
  access_token: string;
  expires_at: string;
  target_forms?: string[];
  status: IntakeStatus;
  message: string;
}

export interface IntakeTranscript {
  session_number: string;
  messages: Array<{
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
  message_count: number;
  started_at?: string;
  completed_at?: string;
}

export interface IntakeSummary {
  session_number: string;
  aria_summary?: string;
  extracted_data?: Record<string, any>;
  target_forms?: string[];
  message_count: number;
  parent_confirmed: boolean;
}

export interface IntakeOutputs {
  session_number: string;
  status: IntakeStatus;
  parent_confirmed: boolean;
  parent_confirmed_at?: string;
  aria_summary?: string;
  extracted_data?: Record<string, any>;
  messages: Array<{
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
  message_count: number;
  draft_form_url?: string;
  draft_form_generated_at?: string;
  started_at?: string;
  completed_at?: string;
  target_forms?: string[];
}

export interface IntakeQuestion {
  id: string;
  professional_id: string;
  question_text: string;
  question_category?: string;
  expected_response_type: 'text' | 'date' | 'boolean' | 'choice' | 'number';
  choices?: string[];
  is_template: boolean;
  is_required: boolean;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

export interface IntakeQuestionCreate {
  question_text: string;
  question_category?: string;
  expected_response_type?: 'text' | 'date' | 'boolean' | 'choice' | 'number';
  choices?: string[];
  is_template?: boolean;
  is_required?: boolean;
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Create a new intake session
 */
export async function createSession(
  data: IntakeSessionCreate
): Promise<IntakeSessionCreatedResponse> {
  return fetchWithParentAuth<IntakeSessionCreatedResponse>('/intake/sessions', {
    method: 'POST',
    body: data,
  });
}

/**
 * List intake sessions for professional's cases
 */
export async function listSessions(options?: {
  case_id?: string;
  status?: IntakeStatus;
}): Promise<{ items: IntakeSessionListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.case_id) params.append('case_id', options.case_id);
  if (options?.status) params.append('status_filter', options.status);

  const query = params.toString();
  return fetchWithParentAuth<{ items: IntakeSessionListItem[]; total: number }>(
    `/intake/sessions${query ? `?${query}` : ''}`
  );
}

/**
 * Get detailed intake session information
 */
export async function getSession(sessionId: string): Promise<IntakeSessionDetail> {
  return fetchWithParentAuth<IntakeSessionDetail>(`/intake/sessions/${sessionId}`);
}

/**
 * Get intake session transcript
 */
export async function getTranscript(sessionId: string): Promise<IntakeTranscript> {
  return fetchWithParentAuth<IntakeTranscript>(`/intake/sessions/${sessionId}/transcript`);
}

/**
 * Get ARIA summary of the intake
 */
export async function getSummary(sessionId: string): Promise<IntakeSummary> {
  return fetchWithParentAuth<IntakeSummary>(`/intake/sessions/${sessionId}/summary`);
}

/**
 * Get all outputs from completed intake
 */
export async function getOutputs(sessionId: string): Promise<IntakeOutputs> {
  return fetchWithParentAuth<IntakeOutputs>(`/intake/sessions/${sessionId}/outputs`);
}

/**
 * Request additional information from parent
 */
export async function requestClarification(
  sessionId: string,
  clarificationRequest: string
): Promise<{
  session_number: string;
  clarification_requested: boolean;
  clarification_request: string;
  message: string;
}> {
  return fetchWithParentAuth(`/intake/sessions/${sessionId}/request-clarification`, {
    method: 'POST',
    body: { clarification_request: clarificationRequest },
  });
}

/**
 * Mark intake session as reviewed
 */
export async function markReviewed(
  sessionId: string,
  notes?: string
): Promise<{
  session_number: string;
  professional_reviewed: boolean;
  professional_reviewed_at: string;
  message: string;
}> {
  const params = notes ? `?notes=${encodeURIComponent(notes)}` : '';
  return fetchWithParentAuth(`/intake/sessions/${sessionId}/reviewed${params}`, {
    method: 'PATCH',
  });
}

// =============================================================================
// Question Templates
// =============================================================================

/**
 * Create a custom intake question
 */
export async function createQuestion(
  data: IntakeQuestionCreate
): Promise<{
  id: string;
  question_text: string;
  question_category?: string;
  is_template: boolean;
  message: string;
}> {
  return fetchWithParentAuth('/intake/questions', {
    method: 'POST',
    body: data,
  });
}

/**
 * List custom intake questions
 */
export async function listQuestions(options?: {
  templates_only?: boolean;
}): Promise<{ items: IntakeQuestion[]; total: number }> {
  const params = options?.templates_only ? '?templates_only=true' : '';
  return fetchWithParentAuth<{ items: IntakeQuestion[]; total: number }>(
    `/intake/questions${params}`
  );
}

/**
 * Delete an intake question
 */
export async function deleteQuestion(questionId: string): Promise<{ message: string }> {
  return fetchWithParentAuth<{ message: string }>(`/intake/questions/${questionId}`, {
    method: 'DELETE',
  });
}

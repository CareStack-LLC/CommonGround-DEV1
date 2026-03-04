/**
 * Professional Cases API
 *
 * Case assignment and access management for professionals
 */

import { fetchWithParentAuth } from '../../core';

export type AssignmentRole = 'lead_attorney' | 'associate_attorney' | 'mediator' | 'parenting_coordinator' | 'paralegal' | 'gal';
export type AssignmentStatus = 'active' | 'pending' | 'completed' | 'withdrawn' | 'terminated';
export type AccessRequestStatus = 'pending' | 'approved' | 'declined' | 'expired';

export interface CaseAssignment {
  id: string;
  professional_id: string;
  firm_id: string;
  family_file_id: string;
  case_id?: string;
  assignment_role: AssignmentRole;
  representing?: string; // parent_a, parent_b, both, court
  access_scopes: string[];
  can_control_aria: boolean;
  aria_preferences?: Record<string, unknown>;
  can_message_client: boolean;
  status: AssignmentStatus;
  assigned_at: string;
  assigned_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Related info
  professional_name?: string;
  firm_name?: string;
  family_file_title?: string;
  family_file_number?: string;
}

export interface CaseAssignmentWithDetails extends CaseAssignment {
  parent_a_name?: string;
  parent_b_name?: string;
  children_count?: number;
  agreement_count?: number;
  unread_messages?: number;
  last_activity_at?: string;
}

export interface CaseSummaryCard {
  id: string;
  family_file_id: string;
  family_file_number: string;
  title: string;
  parent_a_name?: string;
  parent_b_name?: string;
  assignment_role: AssignmentRole;
  representing?: string;
  status: AssignmentStatus;
  children_count: number;
  unread_messages: number;
  pending_actions: number;
  last_activity_at?: string;
  next_event?: UpcomingEvent;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  family_file_id?: string;
  family_file_title?: string;
  location?: string;
  is_mandatory: boolean;
}

export interface AccessRequest {
  id: string;
  family_file_id: string;
  professional_id?: string;
  professional_email?: string;
  firm_id?: string;
  requested_by: string;
  requested_by_user_id: string;
  requested_role: AssignmentRole;
  requested_scopes: string[];
  representing?: string;
  status: AccessRequestStatus;
  parent_a_approved: boolean;
  parent_b_approved: boolean;
  parent_a_approved_at?: string;
  parent_b_approved_at?: string;
  approved_at?: string;
  declined_at?: string;
  decline_reason?: string;
  case_assignment_id?: string;
  expires_at: string;
  message?: string;
  created_at: string;
  updated_at: string;
  // Related info
  family_file_title?: string;
  professional_name?: string;
  firm_name?: string;
  requester_name?: string;
}

export interface CaseListResponse {
  items: CaseSummaryCard[];
  total: number;
  active_count: number;
}

/**
 * Get professional's assigned cases
 */
export async function getCases(params?: {
  status?: AssignmentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<CaseListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<CaseListResponse>(`/professional/cases${query ? `?${query}` : ''}`);
}

/**
 * Get case assignment details
 */
export async function getCaseAssignment(assignmentId: string): Promise<CaseAssignmentWithDetails> {
  return fetchWithParentAuth<CaseAssignmentWithDetails>(`/professional/cases/${assignmentId}`);
}

/**
 * Get case details by family file ID
 */
export async function getCaseByFamilyFile(familyFileId: string): Promise<CaseAssignmentWithDetails> {
  return fetchWithParentAuth<CaseAssignmentWithDetails>(`/professional/cases/family-file/${familyFileId}`);
}

/**
 * Request access to a case (professional-initiated)
 */
export async function requestAccess(data: {
  family_file_id: string;
  requested_role?: AssignmentRole;
  requested_scopes?: string[];
  representing?: string;
  message?: string;
}): Promise<AccessRequest> {
  return fetchWithParentAuth<AccessRequest>('/professional/access-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get pending access requests (for professionals)
 */
export async function getPendingRequests(): Promise<AccessRequest[]> {
  return fetchWithParentAuth<AccessRequest[]>('/professional/access-requests/pending');
}

/**
 * Get incoming invitations (from parents)
 */
export async function getIncomingInvitations(): Promise<AccessRequest[]> {
  return fetchWithParentAuth<AccessRequest[]>('/professional/invitations');
}

/**
 * Accept case invitation
 */
export async function acceptCaseInvitation(requestId: string): Promise<CaseAssignment> {
  return fetchWithParentAuth<CaseAssignment>(`/professional/invitations/${requestId}/accept`, {
    method: 'POST',
  });
}

/**
 * Decline case invitation
 */
export async function declineCaseInvitation(requestId: string, reason?: string): Promise<void> {
  await fetchWithParentAuth(`/professional/invitations/${requestId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Withdraw from a case
 */
export async function withdrawFromCase(assignmentId: string, reason?: string): Promise<void> {
  await fetchWithParentAuth(`/professional/cases/${assignmentId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Update case assignment
 */
export async function updateAssignment(
  assignmentId: string,
  data: {
    assignment_role?: AssignmentRole;
    representing?: string;
    access_scopes?: string[];
    can_control_aria?: boolean;
    aria_preferences?: Record<string, unknown>;
    can_message_client?: boolean;
    internal_notes?: string;
  }
): Promise<CaseAssignment> {
  return fetchWithParentAuth<CaseAssignment>(`/professional/cases/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

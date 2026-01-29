/**
 * Professional Firms API
 *
 * Law firm management for professionals
 */

import { fetchWithParentAuth, fetchPublic } from '../../core';
import type { FirmRole, FirmMembership } from './profile';

export type FirmType = 'law_firm' | 'mediation_center' | 'solo_practitioner' | 'legal_aid' | 'court_services';

export interface Firm {
  id: string;
  name: string;
  slug: string;
  firm_type: FirmType;
  email: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state: string;
  zip_code?: string;
  logo_url?: string;
  primary_color?: string;
  is_public: boolean;
  settings?: Record<string, unknown>;
  subscription_tier: string;
  subscription_status: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface FirmCreate {
  name: string;
  firm_type?: FirmType;
  email: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_public?: boolean;
  settings?: Record<string, unknown>;
}

export interface FirmUpdate {
  name?: string;
  firm_type?: FirmType;
  email?: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;
  primary_color?: string;
  is_public?: boolean;
  settings?: Record<string, unknown>;
}

export interface FirmWithMembers extends Firm {
  members: FirmMembership[];
}

export interface FirmPublicInfo {
  id: string;
  name: string;
  slug: string;
  firm_type: FirmType;
  city?: string;
  state?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  primary_color?: string;
  practice_areas: string[];
  professional_count: number;
  description?: string;
}

export interface FirmDirectoryResponse {
  items: FirmPublicInfo[];
  total: number;
}

export interface MemberInvite {
  email: string;
  role?: FirmRole;
  custom_permissions?: Record<string, boolean>;
}

/**
 * Create a new firm
 */
export async function createFirm(data: FirmCreate): Promise<Firm> {
  return fetchWithParentAuth<Firm>('/professional/firms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get firm details
 */
export async function getFirm(firmId: string): Promise<FirmWithMembers> {
  return fetchWithParentAuth<FirmWithMembers>(`/professional/firms/${firmId}`);
}

/**
 * Update firm details
 */
export async function updateFirm(firmId: string, data: FirmUpdate): Promise<Firm> {
  return fetchWithParentAuth<Firm>(`/professional/firms/${firmId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get professional's firm memberships
 */
export async function getMyFirms(): Promise<FirmMembership[]> {
  return fetchWithParentAuth<FirmMembership[]>('/professional/firms/memberships');
}

/**
 * Invite a member to firm
 */
export async function inviteMember(firmId: string, data: MemberInvite): Promise<FirmMembership> {
  return fetchWithParentAuth<FirmMembership>(`/professional/firms/${firmId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update member role
 */
export async function updateMember(
  firmId: string,
  membershipId: string,
  data: { role?: FirmRole; custom_permissions?: Record<string, boolean> }
): Promise<FirmMembership> {
  return fetchWithParentAuth<FirmMembership>(`/professional/firms/${firmId}/members/${membershipId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Remove member from firm
 */
export async function removeMember(firmId: string, membershipId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/firms/${firmId}/members/${membershipId}`, {
    method: 'DELETE',
  });
}

/**
 * Accept firm invitation
 */
export async function acceptInvitation(invitationId: string): Promise<FirmMembership> {
  return fetchWithParentAuth<FirmMembership>(`/professional/invitations/${invitationId}/accept`, {
    method: 'POST',
  });
}

/**
 * Decline firm invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/invitations/${invitationId}/decline`, {
    method: 'POST',
  });
}

/**
 * Search firm directory (public)
 */
export async function searchDirectory(params: {
  query?: string;
  state?: string;
  firm_type?: FirmType;
  practice_areas?: string[];
  limit?: number;
  offset?: number;
}): Promise<FirmDirectoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set('query', params.query);
  if (params.state) searchParams.set('state', params.state);
  if (params.firm_type) searchParams.set('firm_type', params.firm_type);
  if (params.practice_areas) searchParams.set('practice_areas', params.practice_areas.join(','));
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  return fetchPublic<FirmDirectoryResponse>(`/professional/directory?${searchParams.toString()}`);
}

/**
 * Get public firm info by slug
 */
export async function getFirmBySlug(slug: string): Promise<FirmPublicInfo> {
  return fetchPublic<FirmPublicInfo>(`/professional/directory/${slug}`);
}

/**
 * Circle (trusted contacts) API for parents
 */

import type {
  CircleContact,
  CirclePermission,
  PaginatedResponse,
} from '@commonground/types';
import { fetchWithParentAuth } from '../../core';

/**
 * Get all circle contacts for a family file
 */
export async function getCircleContacts(
  familyFileId: string
): Promise<CircleContact[]> {
  const response = await fetchWithParentAuth<PaginatedResponse<CircleContact>>(
    `/family-files/${familyFileId}/circle`
  );
  return response.items;
}

/**
 * Get a specific circle contact by ID
 */
export async function getCircleContact(
  familyFileId: string,
  contactId: string
): Promise<CircleContact> {
  return fetchWithParentAuth<CircleContact>(
    `/family-files/${familyFileId}/circle/${contactId}`
  );
}

/**
 * Invite a new circle contact
 */
export async function inviteCircleContact(
  familyFileId: string,
  data: {
    email: string;
    first_name: string;
    last_name?: string;
    relationship: string;
    permissions: CirclePermission[];
    children_ids?: string[];
  }
): Promise<CircleContact> {
  return fetchWithParentAuth<CircleContact>(
    `/family-files/${familyFileId}/circle`,
    {
      method: 'POST',
      body: data,
    }
  );
}

/**
 * Update a circle contact
 */
export async function updateCircleContact(
  familyFileId: string,
  contactId: string,
  data: Partial<CircleContact>
): Promise<CircleContact> {
  return fetchWithParentAuth<CircleContact>(
    `/family-files/${familyFileId}/circle/${contactId}`,
    {
      method: 'PATCH',
      body: data,
    }
  );
}

/**
 * Remove a circle contact
 */
export async function removeCircleContact(
  familyFileId: string,
  contactId: string
): Promise<void> {
  await fetchWithParentAuth(
    `/family-files/${familyFileId}/circle/${contactId}`,
    { method: 'DELETE' }
  );
}

/**
 * Update circle contact permissions
 */
export async function updateCirclePermissions(
  familyFileId: string,
  contactId: string,
  permissions: CirclePermission[]
): Promise<CircleContact> {
  return fetchWithParentAuth<CircleContact>(
    `/family-files/${familyFileId}/circle/${contactId}/permissions`,
    {
      method: 'PUT',
      body: { permissions },
    }
  );
}

/**
 * Update which children a circle contact can interact with
 */
export async function updateCircleChildren(
  familyFileId: string,
  contactId: string,
  childrenIds: string[]
): Promise<CircleContact> {
  return fetchWithParentAuth<CircleContact>(
    `/family-files/${familyFileId}/circle/${contactId}/children`,
    {
      method: 'PUT',
      body: { children_ids: childrenIds },
    }
  );
}

/**
 * Resend invitation to a circle contact
 */
export async function resendCircleInvitation(
  familyFileId: string,
  contactId: string
): Promise<void> {
  await fetchWithParentAuth(
    `/family-files/${familyFileId}/circle/${contactId}/resend-invitation`,
    { method: 'POST' }
  );
}

/**
 * Generate access code for circle contact (for My Circle app)
 */
export async function generateCircleAccessCode(
  familyFileId: string,
  contactId: string
): Promise<{ access_code: string; expires_at: string }> {
  return fetchWithParentAuth<{ access_code: string; expires_at: string }>(
    `/family-files/${familyFileId}/circle/${contactId}/access-code`,
    { method: 'POST' }
  );
}

/**
 * Family File API for parents
 */

import type { FamilyFile, PaginatedResponse } from '@commonground/types';
import { fetchWithParentAuth } from '../../core';

/**
 * Get all family files for the current user
 */
export async function getFamilyFiles(): Promise<FamilyFile[]> {
  const response = await fetchWithParentAuth<PaginatedResponse<FamilyFile>>(
    '/family-files'
  );
  return response.items;
}

/**
 * Get a specific family file by ID
 */
export async function getFamilyFile(id: string): Promise<FamilyFile> {
  return fetchWithParentAuth<FamilyFile>(`/family-files/${id}`);
}

/**
 * Create a new family file
 */
export async function createFamilyFile(data: {
  name: string;
  co_parent_email?: string;
}): Promise<FamilyFile> {
  return fetchWithParentAuth<FamilyFile>('/family-files', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a family file
 */
export async function updateFamilyFile(
  id: string,
  data: Partial<FamilyFile>
): Promise<FamilyFile> {
  return fetchWithParentAuth<FamilyFile>(`/family-files/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

/**
 * Invite co-parent to family file
 */
export async function inviteCoParent(
  familyFileId: string,
  email: string
): Promise<void> {
  await fetchWithParentAuth(`/family-files/${familyFileId}/invite`, {
    method: 'POST',
    body: { email },
  });
}

/**
 * Accept co-parent invitation
 */
export async function acceptInvitation(token: string): Promise<FamilyFile> {
  return fetchWithParentAuth<FamilyFile>('/family-files/accept-invitation', {
    method: 'POST',
    body: { token },
  });
}

/**
 * Get family file settings
 */
export async function getFamilyFileSettings(
  id: string
): Promise<FamilyFile['settings']> {
  const familyFile = await getFamilyFile(id);
  return familyFile.settings;
}

/**
 * Update family file settings
 */
export async function updateFamilyFileSettings(
  id: string,
  settings: Partial<FamilyFile['settings']>
): Promise<FamilyFile> {
  return fetchWithParentAuth<FamilyFile>(`/family-files/${id}/settings`, {
    method: 'PATCH',
    body: settings,
  });
}

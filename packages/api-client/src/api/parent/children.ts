/**
 * Children API for parents
 */

import type { Child, ChildProfile, PaginatedResponse } from '@commonground/types';
import { fetchWithParentAuth, uploadFile } from '../../core';

/**
 * Get all children for a family file
 */
export async function getChildren(familyFileId: string): Promise<Child[]> {
  const response = await fetchWithParentAuth<PaginatedResponse<Child>>(
    `/family-files/${familyFileId}/children`
  );
  return response.items;
}

/**
 * Get a specific child by ID
 */
export async function getChild(familyFileId: string, childId: string): Promise<Child> {
  return fetchWithParentAuth<Child>(
    `/family-files/${familyFileId}/children/${childId}`
  );
}

/**
 * Create a new child profile
 */
export async function createChild(
  familyFileId: string,
  data: {
    first_name: string;
    last_name?: string;
    date_of_birth: string;
    avatar_url?: string;
  }
): Promise<Child> {
  return fetchWithParentAuth<Child>(`/family-files/${familyFileId}/children`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a child profile
 */
export async function updateChild(
  familyFileId: string,
  childId: string,
  data: Partial<Child>
): Promise<Child> {
  return fetchWithParentAuth<Child>(
    `/family-files/${familyFileId}/children/${childId}`,
    {
      method: 'PATCH',
      body: data,
    }
  );
}

/**
 * Delete a child profile
 */
export async function deleteChild(
  familyFileId: string,
  childId: string
): Promise<void> {
  await fetchWithParentAuth(`/family-files/${familyFileId}/children/${childId}`, {
    method: 'DELETE',
  });
}

/**
 * Upload child avatar
 */
export async function uploadChildAvatar(
  familyFileId: string,
  childId: string,
  file: File | Blob
): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return uploadFile<{ avatar_url: string }>(
    `/family-files/${familyFileId}/children/${childId}/avatar`,
    formData
  );
}

/**
 * Generate child access code for Kidscom app login
 */
export async function generateChildAccessCode(
  familyFileId: string,
  childId: string
): Promise<{ access_code: string; expires_at: string }> {
  return fetchWithParentAuth<{ access_code: string; expires_at: string }>(
    `/family-files/${familyFileId}/children/${childId}/access-code`,
    { method: 'POST' }
  );
}

/**
 * Get child's Kidscom settings
 */
export async function getChildSettings(
  familyFileId: string,
  childId: string
): Promise<ChildProfile['settings']> {
  const child = await getChild(familyFileId, childId);
  return child.settings;
}

/**
 * Update child's Kidscom settings
 */
export async function updateChildSettings(
  familyFileId: string,
  childId: string,
  settings: Partial<ChildProfile['settings']>
): Promise<Child> {
  return fetchWithParentAuth<Child>(
    `/family-files/${familyFileId}/children/${childId}/settings`,
    {
      method: 'PATCH',
      body: settings,
    }
  );
}

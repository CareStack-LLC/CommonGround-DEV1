/**
 * Children API for My Circle app (circle contacts)
 */

import type { Child, ChildProfile } from '@commonground/types';
import { fetchWithCircleAuth } from '../../core';

/**
 * Get children this circle contact can interact with
 */
export async function getAccessibleChildren(): Promise<Child[]> {
  const response = await fetchWithCircleAuth<{ items: Child[] }>(
    '/circle/children'
  );
  return response.items;
}

/**
 * Get a specific child's public profile
 */
export async function getChildProfile(childId: string): Promise<{
  id: string;
  first_name: string;
  avatar_url?: string;
  age: number;
}> {
  return fetchWithCircleAuth(`/circle/children/${childId}`);
}

/**
 * Check if a child is available for a call
 */
export async function checkChildAvailability(childId: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  return fetchWithCircleAuth(`/circle/children/${childId}/availability`);
}

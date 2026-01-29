/**
 * Push Notification API functions
 *
 * Handles registration of Expo push tokens with the backend.
 */

import { fetchAPI } from '../../core/fetch';

export interface PushTokenRegister {
  token: string;
  platform: 'ios' | 'android';
  device_id?: string;
}

export interface PushTokenResponse {
  id: string;
  token: string;
  platform: string;
  is_active: boolean;
}

/**
 * Register an Expo push token for the current user
 */
export async function registerPushToken(
  data: PushTokenRegister
): Promise<PushTokenResponse> {
  return fetchAPI<PushTokenResponse>('/push/mobile/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Unregister a push token
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await fetchAPI('/push/mobile/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

/**
 * List active push tokens for the current user
 */
export async function listPushTokens(): Promise<{
  count: number;
  tokens: Array<{
    id: string;
    platform: string;
    created_at: string;
  }>;
}> {
  return fetchAPI('/push/mobile/tokens');
}

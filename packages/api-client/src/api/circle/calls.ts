/**
 * Calls API for My Circle app (circle contacts)
 */

import type { KidComsSession } from '@commonground/types';
import { fetchWithCircleAuth } from '../../core';

/**
 * Request a call with a child
 */
export async function requestCall(childId: string): Promise<KidComsSession> {
  return fetchWithCircleAuth<KidComsSession>('/circle/calls/request', {
    method: 'POST',
    body: { child_id: childId },
  });
}

/**
 * Join an active session
 */
export async function joinSession(sessionId: string): Promise<{
  session: KidComsSession;
  daily_token: string;
  room_url: string;
}> {
  return fetchWithCircleAuth<{
    session: KidComsSession;
    daily_token: string;
    room_url: string;
  }>(`/circle/calls/${sessionId}/join`, { method: 'POST' });
}

/**
 * Leave current session
 */
export async function leaveSession(sessionId: string): Promise<void> {
  await fetchWithCircleAuth(`/circle/calls/${sessionId}/leave`, {
    method: 'POST',
  });
}

/**
 * Get call history
 */
export async function getCallHistory(
  limit?: number
): Promise<KidComsSession[]> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await fetchWithCircleAuth<{ items: KidComsSession[] }>(
    `/circle/calls/history${params}`
  );
  return response.items;
}

/**
 * Get active session (if any)
 */
export async function getActiveSession(): Promise<KidComsSession | null> {
  try {
    return await fetchWithCircleAuth<KidComsSession>('/circle/calls/active');
  } catch {
    return null;
  }
}

/**
 * Send a message during session (text or emoji)
 */
export async function sendMessage(
  sessionId: string,
  message: {
    type: 'text' | 'emoji';
    content: string;
  }
): Promise<void> {
  await fetchWithCircleAuth(`/circle/calls/${sessionId}/message`, {
    method: 'POST',
    body: message,
  });
}

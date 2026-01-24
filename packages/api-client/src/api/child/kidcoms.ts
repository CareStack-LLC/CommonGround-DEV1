/**
 * Kidscom API for child app
 */

import type {
  KidComsSession,
  KidComsSessionStatus,
  Recording,
} from '@commonground/types';
import { fetchWithChildAuth } from '../../core';

/**
 * Get active Kidscom session (if any)
 */
export async function getActiveSession(): Promise<KidComsSession | null> {
  try {
    return await fetchWithChildAuth<KidComsSession>('/kidcoms/session/active');
  } catch {
    return null;
  }
}

/**
 * Request a call with a parent
 */
export async function requestParentCall(parentId: string): Promise<KidComsSession> {
  return fetchWithChildAuth<KidComsSession>('/kidcoms/request-call', {
    method: 'POST',
    body: { parent_id: parentId },
  });
}

/**
 * Request a call with a circle contact
 */
export async function requestCircleCall(contactId: string): Promise<KidComsSession> {
  return fetchWithChildAuth<KidComsSession>('/kidcoms/request-call', {
    method: 'POST',
    body: { circle_contact_id: contactId },
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
  return fetchWithChildAuth<{
    session: KidComsSession;
    daily_token: string;
    room_url: string;
  }>(`/kidcoms/session/${sessionId}/join`, { method: 'POST' });
}

/**
 * Leave current session
 */
export async function leaveSession(sessionId: string): Promise<void> {
  await fetchWithChildAuth(`/kidcoms/session/${sessionId}/leave`, {
    method: 'POST',
  });
}

/**
 * Get available contacts (parents and circle members)
 */
export async function getAvailableContacts(): Promise<{
  parents: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    is_online: boolean;
  }>;
  circle: Array<{
    id: string;
    name: string;
    relationship: string;
    avatar_url?: string;
    is_online: boolean;
  }>;
}> {
  return fetchWithChildAuth('/kidcoms/contacts');
}

/**
 * Send a theater mode message (predefined or emoji)
 */
export async function sendTheaterMessage(
  sessionId: string,
  message: {
    type: 'predefined' | 'emoji' | 'drawing';
    content: string;
  }
): Promise<void> {
  await fetchWithChildAuth(`/kidcoms/session/${sessionId}/message`, {
    method: 'POST',
    body: message,
  });
}

/**
 * Get session history
 */
export async function getSessionHistory(
  limit?: number
): Promise<KidComsSession[]> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await fetchWithChildAuth<{ items: KidComsSession[] }>(
    `/kidcoms/history${params}`
  );
  return response.items;
}

/**
 * Get games available in Kidscom
 */
export async function getAvailableGames(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    icon_url: string;
    min_players: number;
    max_players: number;
  }>
> {
  return fetchWithChildAuth('/kidcoms/games');
}

/**
 * Start a game in session
 */
export async function startGame(
  sessionId: string,
  gameId: string
): Promise<{
  game_session_id: string;
  game_url: string;
}> {
  return fetchWithChildAuth(`/kidcoms/session/${sessionId}/game`, {
    method: 'POST',
    body: { game_id: gameId },
  });
}

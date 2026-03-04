/**
 * Circle Watch Together API
 * Watch videos with connected children via video call
 */

import { fetchWithCircleAuth } from '../../core';

export interface WatchTogetherContent {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  content_url: string;
  duration_seconds: number;
  category: string;
  age_rating: string;
}

export interface WatchTogetherSession {
  id: string;
  child_id: string;
  child_name: string;
  contact_id: string;
  contact_name: string;
  content: WatchTogetherContent;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  video_room_url?: string;
  video_token?: string;
  current_position_seconds: number;
  is_playing: boolean;
  created_at: string;
}

export interface WatchTogetherInvitation {
  id: string;
  session_id: string;
  child_id: string;
  child_name: string;
  content: WatchTogetherContent;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

/**
 * Get available content for Watch Together
 */
export async function getContent(options?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<{ items: WatchTogetherContent[] }> {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.search) params.set('search', options.search);
  if (options?.limit) params.set('limit', options.limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithCircleAuth(`/circle/watch-together/content${query}`);
}

/**
 * Create a Watch Together session
 */
export async function createSession(
  childId: string,
  contentId: string
): Promise<WatchTogetherSession> {
  return fetchWithCircleAuth('/circle/watch-together/sessions', {
    method: 'POST',
    body: {
      child_id: childId,
      content_id: contentId,
    },
  });
}

/**
 * Get active session
 */
export async function getActiveSession(): Promise<WatchTogetherSession | null> {
  try {
    return await fetchWithCircleAuth('/circle/watch-together/sessions/active');
  } catch {
    return null;
  }
}

/**
 * Get pending invitations from children
 */
export async function getPendingInvitations(): Promise<{
  items: WatchTogetherInvitation[];
}> {
  return fetchWithCircleAuth('/circle/watch-together/invitations');
}

/**
 * Accept a Watch Together invitation
 */
export async function acceptInvitation(
  invitationId: string
): Promise<WatchTogetherSession> {
  return fetchWithCircleAuth(
    `/circle/watch-together/invitations/${invitationId}/accept`,
    { method: 'POST' }
  );
}

/**
 * Decline a Watch Together invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  await fetchWithCircleAuth(
    `/circle/watch-together/invitations/${invitationId}/decline`,
    { method: 'POST' }
  );
}

/**
 * Join an active session
 */
export async function joinSession(sessionId: string): Promise<{
  session: WatchTogetherSession;
  video_token: string;
  room_url: string;
}> {
  return fetchWithCircleAuth(`/circle/watch-together/sessions/${sessionId}/join`, {
    method: 'POST',
  });
}

/**
 * Update playback state
 */
export async function updatePlaybackState(
  sessionId: string,
  state: {
    position_seconds: number;
    is_playing: boolean;
  }
): Promise<void> {
  await fetchWithCircleAuth(`/circle/watch-together/sessions/${sessionId}/state`, {
    method: 'PUT',
    body: state,
  });
}

/**
 * Send a reaction during Watch Together
 */
export async function sendReaction(
  sessionId: string,
  reaction: string
): Promise<void> {
  await fetchWithCircleAuth(
    `/circle/watch-together/sessions/${sessionId}/reaction`,
    {
      method: 'POST',
      body: { reaction },
    }
  );
}

/**
 * End a Watch Together session
 */
export async function endSession(sessionId: string): Promise<void> {
  await fetchWithCircleAuth(`/circle/watch-together/sessions/${sessionId}/end`, {
    method: 'POST',
  });
}

/**
 * Get Watch Together history
 */
export async function getHistory(limit?: number): Promise<{
  items: WatchTogetherSession[];
}> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchWithCircleAuth(`/circle/watch-together/history${params}`);
}

/**
 * Theater Mode API for child app
 *
 * Manages video content, watch history, and Watch Together sessions.
 */

import { fetchWithChildAuth } from '../../core';

// Content types
export type ContentCategory =
  | 'animals'
  | 'science'
  | 'music'
  | 'stories'
  | 'educational'
  | 'fun';

export type ContentType = 'video' | 'story' | 'audiobook' | 'activity';

export interface TheaterContent {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  content_url: string;
  content_type: ContentType;
  category: ContentCategory;
  duration_seconds: number;
  age_rating: string;
  is_approved: boolean;
  created_at: string;
}

export interface WatchProgress {
  content_id: string;
  progress_seconds: number;
  completed: boolean;
  last_watched: string;
}

export interface WatchTogetherSession {
  id: string;
  content_id: string;
  content: TheaterContent;
  host_id: string;
  participant_ids: string[];
  current_position_seconds: number;
  is_playing: boolean;
  created_at: string;
  video_call_room_url?: string;
}

export interface ContentFilters {
  allowed_categories: ContentCategory[];
  max_age_rating: string;
  daily_time_limit_minutes: number;
  time_remaining_minutes: number;
}

/**
 * Get available theater content
 */
export async function getContent(options?: {
  category?: ContentCategory;
  type?: ContentType;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: TheaterContent[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.category) params.append('category', options.category);
  if (options?.type) params.append('type', options.type);
  if (options?.search) params.append('search', options.search);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const queryString = params.toString();
  const url = `/theater/content${queryString ? `?${queryString}` : ''}`;

  return fetchWithChildAuth<{ items: TheaterContent[]; total: number }>(url);
}

/**
 * Get a specific piece of content
 */
export async function getContentById(contentId: string): Promise<TheaterContent> {
  return fetchWithChildAuth<TheaterContent>(`/theater/content/${contentId}`);
}

/**
 * Get watch progress for a specific content
 */
export async function getWatchProgress(contentId: string): Promise<WatchProgress | null> {
  try {
    return await fetchWithChildAuth<WatchProgress>(
      `/theater/content/${contentId}/progress`
    );
  } catch {
    return null;
  }
}

/**
 * Update watch progress
 */
export async function updateWatchProgress(
  contentId: string,
  progressSeconds: number,
  completed?: boolean
): Promise<WatchProgress> {
  return fetchWithChildAuth<WatchProgress>(
    `/theater/content/${contentId}/progress`,
    {
      method: 'PUT',
      body: JSON.stringify({
        progress_seconds: progressSeconds,
        completed: completed || false,
      }),
    }
  );
}

/**
 * Get watch history
 */
export async function getWatchHistory(
  limit?: number
): Promise<Array<WatchProgress & { content: TheaterContent }>> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await fetchWithChildAuth<{
    items: Array<WatchProgress & { content: TheaterContent }>;
  }>(`/theater/history${params}`);
  return response.items;
}

/**
 * Get content filters (parent controls)
 */
export async function getContentFilters(): Promise<ContentFilters> {
  return fetchWithChildAuth<ContentFilters>('/theater/filters');
}

/**
 * Create a Watch Together session
 */
export async function createWatchTogetherSession(
  contentId: string,
  contactId: string
): Promise<WatchTogetherSession> {
  return fetchWithChildAuth<WatchTogetherSession>('/theater/watch-together', {
    method: 'POST',
    body: JSON.stringify({
      content_id: contentId,
      invite_contact_id: contactId,
    }),
  });
}

/**
 * Join a Watch Together session
 */
export async function joinWatchTogetherSession(
  sessionId: string
): Promise<WatchTogetherSession & { daily_token: string }> {
  return fetchWithChildAuth<WatchTogetherSession & { daily_token: string }>(
    `/theater/watch-together/${sessionId}/join`,
    { method: 'POST' }
  );
}

/**
 * Update Watch Together playback state
 */
export async function updateWatchTogetherState(
  sessionId: string,
  state: {
    position_seconds: number;
    is_playing: boolean;
  }
): Promise<void> {
  await fetchWithChildAuth(`/theater/watch-together/${sessionId}/state`, {
    method: 'PUT',
    body: JSON.stringify(state),
  });
}

/**
 * Leave Watch Together session
 */
export async function leaveWatchTogetherSession(sessionId: string): Promise<void> {
  await fetchWithChildAuth(`/theater/watch-together/${sessionId}/leave`, {
    method: 'POST',
  });
}

/**
 * Get recommended content based on watch history
 */
export async function getRecommendations(
  limit?: number
): Promise<TheaterContent[]> {
  const params = limit ? `?limit=${limit}` : '';
  const response = await fetchWithChildAuth<{ items: TheaterContent[] }>(
    `/theater/recommendations${params}`
  );
  return response.items;
}

/**
 * Report content as inappropriate
 */
export async function reportContent(
  contentId: string,
  reason: string
): Promise<void> {
  await fetchWithChildAuth(`/theater/content/${contentId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

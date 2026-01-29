/**
 * Kidscom API for child app
 */

import type { KidComsSession } from '@commonground/types';
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

// ============================================================================
// Chat API
// ============================================================================

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: 'child' | 'parent' | 'circle_contact';
  sender_name: string;
  content: string;
  message_type: 'text' | 'sticker' | 'drawing';
  sticker_id?: string;
  // ARIA analysis
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_category?: string;
  aria_reason?: string;
  // Status
  is_delivered: boolean;
  is_read: boolean;
  sent_at: string;
}

export interface Sticker {
  id: string;
  pack_id: string;
  name: string;
  image_url: string;
  category: 'emotions' | 'greetings' | 'love' | 'fun' | 'animals';
}

export interface StickerPack {
  id: string;
  name: string;
  description: string;
  preview_url: string;
  stickers: Sticker[];
  is_unlocked: boolean;
}

export interface ChatConversation {
  id: string;
  contact_id: string;
  contact_type: 'parent' | 'circle_contact';
  contact_name: string;
  contact_avatar_url?: string;
  last_message?: ChatMessage;
  unread_count: number;
  updated_at: string;
}

/**
 * Get chat conversations
 */
export async function getConversations(): Promise<{
  items: ChatConversation[];
  total: number;
}> {
  return fetchWithChildAuth('/kidcoms/chat/conversations');
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  contactId: string,
  options?: {
    limit?: number;
    before?: string;
  }
): Promise<{
  items: ChatMessage[];
  has_more: boolean;
}> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.before) params.set('before', options.before);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithChildAuth(`/kidcoms/chat/${contactId}/messages${query}`);
}

/**
 * Send a chat message
 */
export async function sendMessage(
  contactId: string,
  message: {
    content: string;
    message_type: 'text' | 'sticker' | 'drawing';
    sticker_id?: string;
  }
): Promise<ChatMessage> {
  return fetchWithChildAuth(`/kidcoms/chat/${contactId}/send`, {
    method: 'POST',
    body: message,
  });
}

/**
 * Mark messages as read
 */
export async function markMessagesRead(contactId: string): Promise<void> {
  await fetchWithChildAuth(`/kidcoms/chat/${contactId}/read`, {
    method: 'POST',
  });
}

/**
 * Get available sticker packs
 */
export async function getStickerPacks(): Promise<{
  items: StickerPack[];
}> {
  return fetchWithChildAuth('/kidcoms/stickers/packs');
}

/**
 * Get stickers in a pack
 */
export async function getStickers(packId: string): Promise<{
  items: Sticker[];
}> {
  return fetchWithChildAuth(`/kidcoms/stickers/packs/${packId}`);
}

// ============================================================================
// Library API
// ============================================================================

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  type: 'book' | 'story' | 'activity' | 'educational';
  thumbnail_url: string;
  content_url?: string;
  category: string;
  age_rating: string;
  duration_minutes?: number;
  is_favorite: boolean;
  progress_percent?: number;
  created_at: string;
}

export interface LibraryCategory {
  id: string;
  name: string;
  icon: string;
  item_count: number;
}

/**
 * Get library content
 */
export async function getLibraryContent(options?: {
  type?: string;
  category?: string;
  favorites_only?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  items: LibraryItem[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.category) params.set('category', options.category);
  if (options?.favorites_only) params.set('favorites_only', 'true');
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithChildAuth(`/kidcoms/library${query}`);
}

/**
 * Get library categories
 */
export async function getLibraryCategories(): Promise<{
  items: LibraryCategory[];
}> {
  return fetchWithChildAuth('/kidcoms/library/categories');
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(itemId: string): Promise<{
  is_favorite: boolean;
}> {
  return fetchWithChildAuth(`/kidcoms/library/${itemId}/favorite`, {
    method: 'POST',
  });
}

/**
 * Update reading/activity progress
 */
export async function updateProgress(
  itemId: string,
  progress_percent: number
): Promise<void> {
  await fetchWithChildAuth(`/kidcoms/library/${itemId}/progress`, {
    method: 'POST',
    body: { progress_percent },
  });
}

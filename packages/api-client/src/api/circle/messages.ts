/**
 * Circle Messages API
 * Messaging between circle contacts and children
 */

import { fetchWithCircleAuth } from '../../core';

export interface CircleMessage {
  id: string;
  child_id: string;
  child_name: string;
  sender_id: string;
  sender_type: 'circle_contact' | 'child';
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'sticker' | 'voice';
  image_url?: string;
  sticker_id?: string;
  voice_url?: string;
  voice_duration_seconds?: number;
  is_from_me: boolean;
  is_read: boolean;
  created_at: string;
}

export interface CircleConversation {
  child_id: string;
  child_name: string;
  child_avatar_url?: string;
  last_message?: CircleMessage;
  unread_count: number;
  is_online: boolean;
}

export interface CircleStickerPack {
  id: string;
  name: string;
  stickers: CircleSticker[];
}

export interface CircleSticker {
  id: string;
  pack_id: string;
  emoji: string;
  image_url?: string;
}

export interface MessageList {
  items: CircleMessage[];
  total: number;
  has_more: boolean;
}

/**
 * Get all conversations with connected children
 */
export async function getConversations(): Promise<{
  items: CircleConversation[];
}> {
  return fetchWithCircleAuth('/circle/messages/conversations');
}

/**
 * Get messages for a specific child
 */
export async function getMessages(
  childId: string,
  options?: {
    limit?: number;
    before?: string;
  }
): Promise<MessageList> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.before) params.set('before', options.before);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithCircleAuth(`/circle/messages/child/${childId}${query}`);
}

/**
 * Send a text message to a child
 */
export async function sendMessage(
  childId: string,
  content: string
): Promise<CircleMessage> {
  return fetchWithCircleAuth('/circle/messages', {
    method: 'POST',
    body: {
      child_id: childId,
      content,
      message_type: 'text',
    },
  });
}

/**
 * Send a sticker to a child
 */
export async function sendSticker(
  childId: string,
  stickerId: string
): Promise<CircleMessage> {
  return fetchWithCircleAuth('/circle/messages', {
    method: 'POST',
    body: {
      child_id: childId,
      sticker_id: stickerId,
      message_type: 'sticker',
    },
  });
}

/**
 * Send an image message
 */
export async function sendImage(
  childId: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  caption?: string
): Promise<CircleMessage> {
  return fetchWithCircleAuth('/circle/messages/image', {
    method: 'POST',
    body: {
      child_id: childId,
      image_data: imageBase64,
      mime_type: mimeType,
      caption,
    },
  });
}

/**
 * Send a voice message
 */
export async function sendVoice(
  childId: string,
  audioBase64: string,
  durationSeconds: number
): Promise<CircleMessage> {
  return fetchWithCircleAuth('/circle/messages/voice', {
    method: 'POST',
    body: {
      child_id: childId,
      audio_data: audioBase64,
      duration_seconds: durationSeconds,
    },
  });
}

/**
 * Mark messages as read
 */
export async function markAsRead(childId: string): Promise<void> {
  await fetchWithCircleAuth(`/circle/messages/child/${childId}/read`, {
    method: 'POST',
  });
}

/**
 * Get available sticker packs
 */
export async function getStickerPacks(): Promise<{
  items: CircleStickerPack[];
}> {
  return fetchWithCircleAuth('/circle/messages/stickers');
}

/**
 * Delete a message (only your own, within time limit)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await fetchWithCircleAuth(`/circle/messages/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Get unread message count across all children
 */
export async function getUnreadCount(): Promise<{
  total: number;
  by_child: { child_id: string; count: number }[];
}> {
  return fetchWithCircleAuth('/circle/messages/unread');
}

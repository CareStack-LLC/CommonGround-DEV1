/**
 * Circle Memories API
 * Photo sharing between circle contacts and children
 */

import { fetchWithCircleAuth } from '../../core';

export interface Memory {
  id: string;
  child_id: string;
  child_name: string;
  sender_id: string;
  sender_type: 'circle_contact' | 'child';
  sender_name: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_from_me: boolean;
  liked_by: string[];
  comments_count: number;
  created_at: string;
}

export interface MemoryComment {
  id: string;
  memory_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface MemoryList {
  items: Memory[];
  total: number;
  has_more: boolean;
}

/**
 * Get memories for connected children
 */
export async function getMemories(options?: {
  child_id?: string;
  filter?: 'all' | 'sent' | 'received';
  limit?: number;
  offset?: number;
}): Promise<MemoryList> {
  const params = new URLSearchParams();
  if (options?.child_id) params.set('child_id', options.child_id);
  if (options?.filter) params.set('filter', options.filter);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchWithCircleAuth(`/circle/memories${query}`);
}

/**
 * Get a single memory by ID
 */
export async function getMemory(memoryId: string): Promise<Memory> {
  return fetchWithCircleAuth(`/circle/memories/${memoryId}`);
}

/**
 * Share a photo memory with a child
 */
export async function shareMemory(data: {
  child_id: string;
  image_url: string;
  caption?: string;
}): Promise<Memory> {
  return fetchWithCircleAuth('/circle/memories', {
    method: 'POST',
    body: data,
  });
}

/**
 * Upload memory image
 */
export async function uploadMemoryImage(
  childId: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ url: string; thumbnail_url: string }> {
  return fetchWithCircleAuth('/circle/memories/upload', {
    method: 'POST',
    body: {
      child_id: childId,
      image_data: imageBase64,
      mime_type: mimeType,
    },
  });
}

/**
 * Like/unlike a memory
 */
export async function toggleMemoryLike(memoryId: string): Promise<{
  liked: boolean;
  likes_count: number;
}> {
  return fetchWithCircleAuth(`/circle/memories/${memoryId}/like`, {
    method: 'POST',
  });
}

/**
 * Get comments for a memory
 */
export async function getMemoryComments(memoryId: string): Promise<{
  items: MemoryComment[];
}> {
  return fetchWithCircleAuth(`/circle/memories/${memoryId}/comments`);
}

/**
 * Add a comment to a memory
 */
export async function addMemoryComment(
  memoryId: string,
  content: string
): Promise<MemoryComment> {
  return fetchWithCircleAuth(`/circle/memories/${memoryId}/comments`, {
    method: 'POST',
    body: { content },
  });
}

/**
 * Delete a memory (only your own)
 */
export async function deleteMemory(memoryId: string): Promise<void> {
  await fetchWithCircleAuth(`/circle/memories/${memoryId}`, {
    method: 'DELETE',
  });
}

/**
 * Download/save a memory image
 */
export async function downloadMemory(memoryId: string): Promise<{
  download_url: string;
}> {
  return fetchWithCircleAuth(`/circle/memories/${memoryId}/download`);
}

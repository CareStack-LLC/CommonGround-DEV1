/**
 * Professional Messaging API
 *
 * Attorney-client secure messaging
 */

import { fetchWithParentAuth } from '../../core';

export interface ProfessionalMessage {
  id: string;
  family_file_id: string;
  case_assignment_id: string;
  sender_id: string;
  sender_type: 'professional' | 'parent';
  recipient_id: string;
  subject?: string;
  content: string;
  thread_id?: string;
  reply_to_id?: string;
  is_read: boolean;
  read_at?: string;
  attachments?: MessageAttachment[];
  sent_at: string;
  created_at: string;
  // Related info
  sender_name?: string;
  recipient_name?: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  url: string;
}

export interface MessageThread {
  thread_id: string;
  family_file_id: string;
  case_assignment_id: string;
  subject?: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  participants: string[];
  messages: ProfessionalMessage[];
  // Additional info
  parent_name?: string;
  family_file_title?: string;
}

export interface MessageCreate {
  recipient_id: string;
  subject?: string;
  content: string;
  thread_id?: string;
  reply_to_id?: string;
  attachments?: { filename: string; content_base64: string }[];
}

export interface MessageListResponse {
  items: ProfessionalMessage[];
  total: number;
  unread_count: number;
}

export interface ThreadListResponse {
  items: MessageThread[];
  total: number;
}

/**
 * Get messages for a case
 */
export async function getCaseMessages(
  familyFileId: string,
  params?: {
    limit?: number;
    offset?: number;
    thread_id?: string;
  }
): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.thread_id) searchParams.set('thread_id', params.thread_id);

  const query = searchParams.toString();
  return fetchWithParentAuth<MessageListResponse>(
    `/professional/cases/${familyFileId}/messages${query ? `?${query}` : ''}`
  );
}

/**
 * Get message threads for a case
 */
export async function getCaseThreads(familyFileId: string): Promise<ThreadListResponse> {
  return fetchWithParentAuth<ThreadListResponse>(`/professional/cases/${familyFileId}/threads`);
}

/**
 * Send a message to a client
 */
export async function sendMessage(familyFileId: string, data: MessageCreate): Promise<ProfessionalMessage> {
  return fetchWithParentAuth<ProfessionalMessage>(`/professional/cases/${familyFileId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all unread messages across cases
 */
export async function getUnreadMessages(params?: {
  limit?: number;
}): Promise<MessageListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchWithParentAuth<MessageListResponse>(`/professional/messages/unread${query ? `?${query}` : ''}`);
}

/**
 * Mark message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/messages/${messageId}/read`, {
    method: 'POST',
  });
}

/**
 * Mark all messages in thread as read
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/threads/${threadId}/read`, {
    method: 'POST',
  });
}

/**
 * Get total unread count
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  return fetchWithParentAuth<{ count: number }>('/professional/messages/unread-count');
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await fetchWithParentAuth(`/professional/messages/${messageId}`, {
    method: 'DELETE',
  });
}

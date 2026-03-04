/**
 * Messages API endpoints with ARIA integration
 *
 * Provides messaging between co-parents with:
 * - ARIA toxicity analysis before sending
 * - Message thread management
 * - Read receipts
 * - Flagged message handling
 */

import { fetchWithParentAuth } from '../../core';

// =============================================================================
// Types
// =============================================================================

export type ToxicityLevel = 'none' | 'low' | 'medium' | 'high' | 'severe';

export type ToxicityCategory =
  | 'profanity'
  | 'insult'
  | 'hostility'
  | 'sarcasm'
  | 'blame'
  | 'dismissive'
  | 'threatening'
  | 'manipulation'
  | 'passive_aggressive'
  | 'all_caps'
  | 'custody_weaponization'
  | 'financial_coercion'
  | 'hate_speech'
  | 'sexual_harassment';

export interface ARIAAnalysis {
  original_message: string;
  toxicity_level: ToxicityLevel;
  toxicity_score: number; // 0.0 to 1.0
  categories: ToxicityCategory[];
  triggers: string[];
  explanation: string;
  suggestion?: string;
  is_flagged: boolean;
  block_send: boolean;
}

export interface Message {
  id: string;
  family_file_id: string;
  thread_id?: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  // ARIA analysis results
  is_flagged: boolean;
  toxicity_level?: ToxicityLevel;
  toxicity_categories?: ToxicityCategory[];
  intervention_shown: boolean;
  original_content?: string; // If message was modified after ARIA suggestion
}

export interface MessageThread {
  id: string;
  family_file_id: string;
  participant_ids: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessagesListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

export interface ThreadsListResponse {
  threads: MessageThread[];
  total: number;
}

export interface SendMessageRequest {
  recipient_id: string;
  content: string;
  thread_id?: string;
  skip_aria_check?: boolean; // Force send without ARIA (not recommended)
}

export interface SendMessageResponse {
  message: Message;
  aria_analysis?: ARIAAnalysis;
  was_modified: boolean;
}

// =============================================================================
// ARIA Analysis
// =============================================================================

/**
 * Analyze a message with ARIA before sending
 *
 * This allows the user to preview the analysis and modify
 * their message before actually sending it.
 */
export async function analyzeMessage(content: string): Promise<ARIAAnalysis> {
  return fetchWithParentAuth<ARIAAnalysis>('/messages/analyze', {
    method: 'POST',
    body: { content },
  });
}

// =============================================================================
// Message Operations
// =============================================================================

/**
 * Get messages for a family file
 */
export async function getMessages(
  familyFileId: string,
  options: {
    limit?: number;
    offset?: number;
    thread_id?: string;
  } = {}
): Promise<MessagesListResponse> {
  const params = new URLSearchParams();
  params.set('family_file_id', familyFileId);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());
  if (options.thread_id) params.set('thread_id', options.thread_id);

  return fetchWithParentAuth<MessagesListResponse>(`/messages?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Get message threads
 */
export async function getThreads(familyFileId: string): Promise<ThreadsListResponse> {
  return fetchWithParentAuth<ThreadsListResponse>(
    `/messages/threads?family_file_id=${familyFileId}`,
    { method: 'GET' }
  );
}

/**
 * Send a message
 *
 * The message will be analyzed by ARIA before sending.
 * If ARIA detects high toxicity, the message may be blocked.
 */
export async function sendMessage(
  familyFileId: string,
  request: SendMessageRequest
): Promise<SendMessageResponse> {
  return fetchWithParentAuth<SendMessageResponse>('/messages', {
    method: 'POST',
    body: {
      family_file_id: familyFileId,
      ...request,
    },
  });
}

/**
 * Mark a message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  return fetchWithParentAuth<void>(`/messages/${messageId}/read`, {
    method: 'POST',
  });
}

/**
 * Get a single message
 */
export async function getMessage(messageId: string): Promise<Message> {
  return fetchWithParentAuth<Message>(`/messages/${messageId}`, {
    method: 'GET',
  });
}

/**
 * Get flagged messages for a family file
 */
export async function getFlaggedMessages(
  familyFileId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<MessagesListResponse> {
  const params = new URLSearchParams();
  params.set('family_file_id', familyFileId);
  params.set('flagged', 'true');
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  return fetchWithParentAuth<MessagesListResponse>(`/messages?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Record that an ARIA intervention was shown to the user
 */
export async function recordIntervention(
  messageId: string,
  action: 'shown' | 'accepted' | 'dismissed'
): Promise<void> {
  return fetchWithParentAuth<void>(`/messages/${messageId}/intervention`, {
    method: 'POST',
    body: { action },
  });
}

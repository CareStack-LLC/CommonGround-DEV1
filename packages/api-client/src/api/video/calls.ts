/**
 * Video calling API endpoints
 * Shared across parent, child, and circle apps
 */

import { fetchWithParentAuth, fetchWithChildAuth, fetchWithCircleAuth, AuthType, fetchAPI } from '../../core';

// Types
export interface DailyRoomConfig {
  room_url: string;
  room_name: string;
  token: string;
  expires_at: string;
}

export interface CallSession {
  id: string;
  room_url: string;
  room_name: string;
  status: 'pending' | 'active' | 'ended';
  caller_id: string;
  caller_type: 'parent' | 'child' | 'circle';
  caller_name: string;
  recipient_id: string;
  recipient_type: 'parent' | 'child' | 'circle';
  recipient_name: string;
  family_file_id: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface InitiateCallRequest {
  recipient_id: string;
  recipient_type: 'parent' | 'child' | 'circle';
  family_file_id: string;
}

export interface CallResponse {
  session: CallSession;
  room_config: DailyRoomConfig;
}

export interface JoinCallRequest {
  session_id: string;
}

export interface EndCallRequest {
  session_id: string;
  reason?: 'completed' | 'declined' | 'no_answer' | 'error';
}

export interface IncomingCall {
  session_id: string;
  caller_name: string;
  caller_type: 'parent' | 'child' | 'circle';
  caller_avatar_url?: string;
  room_url: string;
}

export interface CallParticipant {
  id: string;
  name: string;
  type: 'parent' | 'child' | 'circle';
  avatar_url?: string;
  is_video_on: boolean;
  is_audio_on: boolean;
  joined_at: string;
}

// Helper to get the right fetch function based on auth type
function getFetchForAuth(authType: AuthType) {
  switch (authType) {
    case 'parent':
      return fetchWithParentAuth;
    case 'child':
      return fetchWithChildAuth;
    case 'circle':
      return fetchWithCircleAuth;
    default:
      return fetchWithParentAuth;
  }
}

/**
 * Initiate a video call
 */
export async function initiateCall(
  request: InitiateCallRequest,
  authType: AuthType = 'parent'
): Promise<CallResponse> {
  return fetchAPI<CallResponse>('/video/calls/initiate', {
    method: 'POST',
    body: request,
    authType,
  });
}

/**
 * Join an existing call session
 */
export async function joinCall(
  sessionId: string,
  authType: AuthType = 'parent'
): Promise<CallResponse> {
  return fetchAPI<CallResponse>(`/video/calls/${sessionId}/join`, {
    method: 'POST',
    authType,
  });
}

/**
 * End a call session
 */
export async function endCall(
  sessionId: string,
  reason: EndCallRequest['reason'] = 'completed',
  authType: AuthType = 'parent'
): Promise<void> {
  return fetchAPI<void>(`/video/calls/${sessionId}/end`, {
    method: 'POST',
    body: { reason },
    authType,
  });
}

/**
 * Decline an incoming call
 */
export async function declineCall(
  sessionId: string,
  authType: AuthType = 'parent'
): Promise<void> {
  return fetchAPI<void>(`/video/calls/${sessionId}/decline`, {
    method: 'POST',
    authType,
  });
}

/**
 * Get call session details
 */
export async function getCallSession(
  sessionId: string,
  authType: AuthType = 'parent'
): Promise<CallSession> {
  return fetchAPI<CallSession>(`/video/calls/${sessionId}`, {
    method: 'GET',
    authType,
  });
}

/**
 * Get call history
 */
export async function getCallHistory(
  limit: number = 20,
  offset: number = 0,
  authType: AuthType = 'parent'
): Promise<{ calls: CallSession[]; total: number }> {
  return fetchAPI<{ calls: CallSession[]; total: number }>(
    `/video/calls/history?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      authType,
    }
  );
}

/**
 * Get active call participants
 */
export async function getCallParticipants(
  sessionId: string,
  authType: AuthType = 'parent'
): Promise<CallParticipant[]> {
  return fetchAPI<CallParticipant[]>(`/video/calls/${sessionId}/participants`, {
    method: 'GET',
    authType,
  });
}

/**
 * Request recording for a call (parent only)
 */
export async function startRecording(sessionId: string): Promise<{ recording_id: string }> {
  return fetchWithParentAuth<{ recording_id: string }>(
    `/video/calls/${sessionId}/recording/start`,
    { method: 'POST' }
  );
}

/**
 * Stop recording for a call (parent only)
 */
export async function stopRecording(sessionId: string): Promise<void> {
  return fetchWithParentAuth<void>(`/video/calls/${sessionId}/recording/stop`, {
    method: 'POST',
  });
}

/**
 * Get Daily.co room token for reconnection
 */
export async function refreshRoomToken(
  sessionId: string,
  authType: AuthType = 'parent'
): Promise<DailyRoomConfig> {
  return fetchAPI<DailyRoomConfig>(`/video/calls/${sessionId}/token`, {
    method: 'POST',
    authType,
  });
}

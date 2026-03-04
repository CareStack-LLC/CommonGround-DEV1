/**
 * API client configuration for Parent App
 */

import { configure, createNativeStorage, parent, video } from '@commonground/api-client';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Use correct production API URL - DO NOT include /api/v1 suffix (it's added by the API client)
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com';
const TOKEN_KEY = 'auth_token';

let isConfigured = false;

export function configureAPI() {
  if (isConfigured) return;

  configure({
    baseUrl: API_URL,
    onUnauthorized: () => {
      // Redirect to login when token is invalid
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      console.error('API Error:', error.message);
    },
  } as any);

  isConfigured = true;
}

// Re-export API modules for convenience
export { parent, video };

// Helper to get auth token
async function getParentToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// Helper to make authenticated requests
async function parentRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getParentToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com';
  const url = `${baseUrl}/api/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Video API adapter for DailyCallProvider using parent-calls and kidcoms endpoints
export const videoAPIAdapter = {
  initiateCall: async (
    request: { recipient_id: string; recipient_type: string; family_file_id: string },
    _authType: 'parent' | 'child' | 'circle'
  ) => {
    // Use parent-calls endpoint for parent-initiated calls
    const data = await parentRequest<{
      session_id: string;
      room_url: string;
      room_name: string;
      token: string;
      caller_name?: string;
      recipient_name?: string;
      expires_at?: string;
    }>('/parent-calls/', {
      method: 'POST',
      body: JSON.stringify({
        family_file_id: request.family_file_id,
        recipient_id: request.recipient_id,
        recipient_type: request.recipient_type,
        call_type: 'video',
      }),
    });

    // Map response to expected format
    return {
      session: {
        id: data.session_id,
        room_url: data.room_url,
        room_name: data.room_name,
        status: 'pending' as const,
        caller_id: 'parent',
        caller_type: 'parent' as const,
        caller_name: data.caller_name || 'Parent',
        recipient_id: request.recipient_id,
        recipient_type: request.recipient_type as 'parent' | 'child' | 'circle',
        recipient_name: data.recipient_name || 'Child',
        family_file_id: request.family_file_id,
      },
      room_config: {
        room_url: data.room_url,
        room_name: data.room_name,
        token: data.token,
        expires_at: data.expires_at || new Date(Date.now() + 3600000).toISOString(),
      },
    };
  },

  joinCall: async (sessionId: string, _authType: 'parent' | 'child' | 'circle') => {
    const data = await parentRequest<{
      session_id: string;
      room_url: string;
      room_name: string;
      token: string;
    }>(`/parent-calls/${sessionId}/join`, {
      method: 'POST',
    });

    return {
      session: {
        id: data.session_id,
        room_url: data.room_url,
        room_name: data.room_name,
        status: 'active',
        caller_id: '',
        caller_type: 'child',
        caller_name: '',
        recipient_id: '',
        recipient_type: 'parent',
        recipient_name: '',
        family_file_id: '',
      },
      room_config: {
        room_url: data.room_url,
        token: data.token,
      },
    };
  },

  endCall: async (sessionId: string, reason: string, _authType: 'parent' | 'child' | 'circle') => {
    await parentRequest<void>(`/parent-calls/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  declineCall: async (sessionId: string, _authType: 'parent' | 'child' | 'circle') => {
    await parentRequest<void>(`/parent-calls/${sessionId}/decline`, {
      method: 'POST',
    });
  },

  startRecording: async (sessionId: string) => {
    // Use parent-calls recording endpoint
    const data = await parentRequest<{ recording_id: string }>(
      `/parent-calls/${sessionId}/upload-recording`,
      { method: 'POST' }
    );
    return { recording_id: data.recording_id || sessionId };
  },

  stopRecording: async (_sessionId: string) => {
    // Recording stop is handled by ending the upload
  },
};

// Incoming call API for parents
export const incomingCallAPI = {
  // Check for incoming calls from children
  checkIncomingCalls: async (familyFileId: string) => {
    return parentRequest<{
      calls: Array<{
        session_id: string;
        caller_id: string;
        caller_name: string;
        caller_type: 'child' | 'circle';
        room_url: string;
        created_at: string;
      }>;
    }>(`/kidcoms/sessions/active/${familyFileId}`, {
      method: 'GET',
    });
  },

  // Accept an incoming call
  acceptCall: async (sessionId: string) => {
    return parentRequest<{
      room_url: string;
      token: string;
    }>(`/kidcoms/sessions/${sessionId}/accept`, {
      method: 'POST',
    });
  },

  // Reject an incoming call
  rejectCall: async (sessionId: string) => {
    return parentRequest<void>(`/kidcoms/sessions/${sessionId}/reject`, {
      method: 'POST',
    });
  },
};

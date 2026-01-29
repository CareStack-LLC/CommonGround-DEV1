/**
 * API client configuration for Kidscom (Child) App
 */

import { configure, createNativeStorage, child, video } from '@commonground/api-client';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com/api/v1';
const TOKEN_KEY = 'kidscom_auth_token';

let isConfigured = false;

export function configureAPI() {
  if (isConfigured) return;

  configure({
    apiUrl: API_URL,
    storage: createNativeStorage(),
    onUnauthorized: () => {
      // Redirect to login when token is invalid
      router.replace('/login');
    },
    onError: (error) => {
      console.error('API Error:', error.message);
    },
  });

  isConfigured = true;
}

// Re-export API modules for convenience
export { child, video };

// Helper to get auth token
async function getChildToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// Helper to make authenticated requests to KidComs API
async function kidcomsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getChildToken();
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Video API adapter for DailyCallProvider using KidComs API
export const videoAPIAdapter = {
  initiateCall: async (
    request: { recipient_id: string; recipient_type: string; family_file_id: string },
    _authType: 'parent' | 'child' | 'circle'
  ) => {
    // Use KidComs session creation endpoint for child
    const data = await kidcomsRequest<{
      session_id: string;
      room_url: string;
      room_name: string;
      token: string;
      expires_at?: string;
    }>('/kidcoms/sessions/child/create', {
      method: 'POST',
      body: JSON.stringify({
        circle_contact_id: request.recipient_id,
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
        caller_id: 'child',
        caller_type: 'child' as const,
        caller_name: 'Child',
        recipient_id: request.recipient_id,
        recipient_type: request.recipient_type as 'parent' | 'child' | 'circle',
        recipient_name: 'Contact',
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
    const data = await kidcomsRequest<{
      session_id: string;
      room_url: string;
      room_name: string;
      token: string;
    }>(`/kidcoms/sessions/child/${sessionId}/join`, {
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

  endCall: async (sessionId: string, _reason: string, _authType: 'parent' | 'child' | 'circle') => {
    await kidcomsRequest<void>(`/kidcoms/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  },

  declineCall: async (sessionId: string, _authType: 'parent' | 'child' | 'circle') => {
    await kidcomsRequest<void>(`/kidcoms/sessions/${sessionId}/decline`, {
      method: 'POST',
    });
  },

  startRecording: async (sessionId: string) => {
    // Recording not supported for child calls
    console.log('Recording not supported for child calls', sessionId);
    return { recording_id: '' };
  },

  stopRecording: async (_sessionId: string) => {
    // Recording not supported for child calls
  },
};

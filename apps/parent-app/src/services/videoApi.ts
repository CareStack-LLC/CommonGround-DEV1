/**
 * Video API Service
 * Wraps parent-calls endpoints for Daily.co video calling
 */

import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com';

export interface CallSessionCreate {
  family_file_id: string;
  call_type: 'video' | 'audio';
  aria_sensitivity_level?: 'strict' | 'moderate' | 'relaxed' | 'off';
}

export interface CallSessionJoinResponse {
  session: {
    id: string;
    family_file_id: string;
    parent_a_id: string;
    parent_b_id: string | null;
    status: string;
    call_type: string;
    daily_room_name: string;
    started_at: string | null;
    ended_at: string | null;
    recording_enabled: boolean;
    aria_active: boolean;
    aria_sensitivity_level: string;
  };
  room_config: {
    room_url: string;
    token: string;
    expires_at: string;
  };
}

async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('auth_token');
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/**
 * Initiate a new call
 */
export async function initiateCall(
  request: CallSessionCreate,
  _authType: 'parent' | 'child' | 'circle' = 'parent'
): Promise<CallSessionJoinResponse> {
  const response = await fetchWithAuth('/api/v1/parent-calls/', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to initiate call' }));
    throw new Error(error.detail || 'Failed to initiate call');
  }

  return response.json() as Promise<CallSessionJoinResponse>;
}

/**
 * Join an existing call
 */
export async function joinCall(
  sessionId: string,
  _authType: 'parent' | 'child' | 'circle' = 'parent',
  userName?: string
): Promise<CallSessionJoinResponse> {
  const response = await fetchWithAuth(`/api/v1/parent-calls/${sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify({ user_name: userName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to join call' }));
    throw new Error(error.detail || 'Failed to join call');
  }

  return response.json() as Promise<CallSessionJoinResponse>;
}

/**
 * Decline an incoming call
 */
export async function declineCall(
  sessionId: string,
  _authType: 'parent' | 'child' | 'circle' = 'parent'
): Promise<void> {
  const response = await fetchWithAuth(`/api/v1/parent-calls/${sessionId}/decline`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to decline call' }));
    throw new Error(error.detail || 'Failed to decline call');
  }
}

/**
 * End a call
 */
export async function endCall(
  sessionId: string,
  _reason: string = 'completed',
  _authType: 'parent' | 'child' | 'circle' = 'parent'
): Promise<{ duration_seconds: number }> {
  const response = await fetchWithAuth(`/api/v1/parent-calls/${sessionId}/end`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to end call' }));
    throw new Error(error.detail || 'Failed to end call');
  }

  return response.json();
}

/**
 * Start recording (not supported via API directly, handled by Daily.co)
 */
export async function startRecording(_sessionId: string): Promise<{ recording_id: string }> {
  console.warn('Recording is managed by Daily.co, not via this API');
  return { recording_id: '' };
}

/**
 * Stop recording (not supported via API directly, handled by Daily.co)
 */
export async function stopRecording(_sessionId: string): Promise<void> {
  console.warn('Recording is managed by Daily.co, not via this API');
}

/**
 * Video API object that matches the interface expected by DailyCallProvider
 */
export const videoAPI = {
  initiateCall: async (
    request: {
      recipient_id: string;
      recipient_type: 'parent' | 'child' | 'circle';
      family_file_id: string;
    },
    authType: 'parent' | 'child' | 'circle'
  ) => {
    // The parent-calls endpoint uses family_file_id and figures out the recipient
    const result = await initiateCall(
      {
        family_file_id: request.family_file_id,
        call_type: 'video', // Default to video, can be overridden
      },
      authType
    );

    // Transform response to match expected format
    return {
      session: {
        id: result.session.id,
        room_url: result.room_config.room_url,
        room_name: result.session.daily_room_name,
        status: result.session.status,
        caller_id: result.session.parent_a_id,
        caller_type: 'parent' as const,
        caller_name: '', // Will be populated by frontend
        recipient_id: result.session.parent_b_id || '',
        recipient_type: 'parent' as const,
        recipient_name: '', // Will be populated by frontend
        family_file_id: result.session.family_file_id,
      },
      room_config: {
        room_url: result.room_config.room_url,
        room_name: result.session.daily_room_name,
        token: result.room_config.token,
        expires_at: result.room_config.expires_at,
      },
    };
  },

  joinCall: async (sessionId: string, authType: 'parent' | 'child' | 'circle') => {
    const result = await joinCall(sessionId, authType);
    return {
      session: {
        id: result.session.id,
        room_name: result.session.daily_room_name,
        caller_id: result.session.parent_a_id,
        caller_type: 'parent' as const,
        caller_name: '',
        recipient_id: result.session.parent_b_id || '',
        recipient_type: 'parent' as const,
        recipient_name: '',
        family_file_id: result.session.family_file_id,
      },
      room_config: {
        room_url: result.room_config.room_url,
        token: result.room_config.token,
      },
    };
  },

  endCall,
  declineCall,
  startRecording,
  stopRecording,
};

export default videoAPI;

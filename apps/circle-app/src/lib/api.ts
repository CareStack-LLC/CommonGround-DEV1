/**
 * API client configuration for My Circle App
 */

import { configure, createNativeStorage, circle, video } from '@commonground/api-client';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

let isConfigured = false;

export function configureAPI() {
  if (isConfigured) return;

  configure({
    apiUrl: API_URL,
    storage: createNativeStorage(),
    onUnauthorized: () => {
      // Redirect to login when token is invalid
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      console.error('API Error:', error.message);
    },
  });

  isConfigured = true;
}

// Re-export API modules for convenience
export { circle, video };

// Video API adapter for DailyCallProvider (circle auth type)
export const videoAPIAdapter = {
  initiateCall: (
    request: { recipient_id: string; recipient_type: string; family_file_id: string },
    _authType: 'parent' | 'child' | 'circle'
  ) => video.initiateCall(request as any, 'circle'),

  joinCall: (sessionId: string, _authType: 'parent' | 'child' | 'circle') =>
    video.joinCall(sessionId, 'circle'),

  endCall: (sessionId: string, reason: string, _authType: 'parent' | 'child' | 'circle') =>
    video.endCall(sessionId, reason as any, 'circle'),

  declineCall: (sessionId: string, _authType: 'parent' | 'child' | 'circle') =>
    video.declineCall(sessionId, 'circle'),

  // Circle members cannot start recording - only parents can
  startRecording: (_sessionId: string) => Promise.reject(new Error('Only parents can record')),

  stopRecording: (_sessionId: string) => Promise.reject(new Error('Only parents can record')),
};

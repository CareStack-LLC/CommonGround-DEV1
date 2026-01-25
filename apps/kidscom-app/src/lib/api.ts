/**
 * API client configuration for Kidscom (Child) App
 */

import { configure, createNativeStorage, child, video } from '@commonground/api-client';
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

// Video API adapter for DailyCallProvider (child auth type)
export const videoAPIAdapter = {
  initiateCall: (
    request: { recipient_id: string; recipient_type: string; family_file_id: string },
    _authType: 'parent' | 'child' | 'circle'
  ) => video.initiateCall(request as any, 'child'),

  joinCall: (sessionId: string, _authType: 'parent' | 'child' | 'circle') =>
    video.joinCall(sessionId, 'child'),

  endCall: (sessionId: string, reason: string, _authType: 'parent' | 'child' | 'circle') =>
    video.endCall(sessionId, reason as any, 'child'),

  declineCall: (sessionId: string, _authType: 'parent' | 'child' | 'circle') =>
    video.declineCall(sessionId, 'child'),

  startRecording: (sessionId: string) => video.startRecording(sessionId),

  stopRecording: (sessionId: string) => video.stopRecording(sessionId),
};

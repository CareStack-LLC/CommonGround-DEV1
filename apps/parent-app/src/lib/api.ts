/**
 * API client configuration for Parent App
 */

import { configure, createNativeStorage, parent, video } from '@commonground/api-client';
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
export { parent, video };

// Video API adapter for DailyCallProvider
export const videoAPIAdapter = {
  initiateCall: (
    request: { recipient_id: string; recipient_type: string; family_file_id: string },
    authType: 'parent' | 'child' | 'circle'
  ) => video.initiateCall(request as any, authType),

  joinCall: (sessionId: string, authType: 'parent' | 'child' | 'circle') =>
    video.joinCall(sessionId, authType),

  endCall: (sessionId: string, reason: string, authType: 'parent' | 'child' | 'circle') =>
    video.endCall(sessionId, reason as any, authType),

  declineCall: (sessionId: string, authType: 'parent' | 'child' | 'circle') =>
    video.declineCall(sessionId, authType),

  startRecording: (sessionId: string) => video.startRecording(sessionId),

  stopRecording: (sessionId: string) => video.stopRecording(sessionId),
};

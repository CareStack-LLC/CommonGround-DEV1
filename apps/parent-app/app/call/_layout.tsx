/**
 * Call Layout
 * Wraps call screens with DailyCallProvider for video calling
 */

import { Stack } from 'expo-router';
import { DailyCallProvider } from '@commonground/daily-video';
import { videoAPI } from '../../src/services/videoApi';

export default function CallLayout() {
  return (
    <DailyCallProvider
      userType="parent"
      videoAPI={videoAPI}
      onCallEnded={(sessionId) => {
        console.log('[Call] Call ended:', sessionId);
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </DailyCallProvider>
  );
}

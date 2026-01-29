/**
 * Cases Stack Layout
 */

import { Stack } from 'expo-router';

export default function CasesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/timeline" />
      <Stack.Screen name="[id]/messages" />
      <Stack.Screen name="[id]/aria" />
      <Stack.Screen name="[id]/compliance" />
    </Stack>
  );
}

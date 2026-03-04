/**
 * Theater Stack Layout
 * Navigation for theater mode screens
 */

import { Stack } from "expo-router";

export default function TheaterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="player" />
      <Stack.Screen name="watch-together" />
    </Stack>
  );
}

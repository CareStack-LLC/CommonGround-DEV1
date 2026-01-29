/**
 * Watch Together Layout
 */

import { Stack } from "expo-router";

export default function WatchTogetherLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="session" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}

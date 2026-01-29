/**
 * Arcade Games Layout
 */

import { Stack } from "expo-router";

export default function ArcadeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="memory" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="tic-tac-toe" />
      <Stack.Screen name="puzzle" />
    </Stack>
  );
}

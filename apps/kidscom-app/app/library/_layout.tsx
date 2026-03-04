/**
 * Library Stack Layout
 * Navigation for library content screens
 */

import { Stack } from "expo-router";

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="reader" />
      <Stack.Screen name="activity" />
      <Stack.Screen
        name="read-together"
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}

/**
 * Custody Stack Layout
 * Navigation for custody tracking and override screens
 */

import { Stack } from "expo-router";

export default function CustodyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: "#4A6C58", // Sage
        headerStyle: { backgroundColor: "#FFFBF5" }, // Cream
        headerTitleStyle: { color: "#475569" }, // Slate
      }}
    >
      <Stack.Screen
        name="override"
        options={{
          title: "Update Custody",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="stats"
        options={{
          title: "Custody Statistics",
        }}
      />
    </Stack>
  );
}

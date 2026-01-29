/**
 * Exports Layout
 *
 * Handles navigation for court export screens including:
 * - Export list
 * - Create export wizard
 * - Export details
 */

import { Stack } from "expo-router";

export default function ExportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFBF5",
        },
        headerTitleStyle: {
          color: "#1e293b",
          fontWeight: "600",
        },
        headerTintColor: "#4A6C58",
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Court Reports",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Report",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[exportId]"
        options={{
          title: "Report Details",
        }}
      />
    </Stack>
  );
}

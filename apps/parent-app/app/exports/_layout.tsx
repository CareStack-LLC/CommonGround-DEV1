/**
 * Exports Layout
 *
 * Handles navigation for court export screens including:
 * - Export list
 * - Create export wizard
 * - Export details
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ExportsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surfaceElevated,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "600",
        },
        headerTintColor: colors.primary,
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

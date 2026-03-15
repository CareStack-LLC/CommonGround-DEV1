/**
 * Schedule Stack Layout
 * Simplified — collections and time blocks have been removed
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ScheduleLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.textPrimary },
      }}
    />
  );
}

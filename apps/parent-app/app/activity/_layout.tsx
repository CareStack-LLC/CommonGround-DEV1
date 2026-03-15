/**
 * Activity Stack Layout
 * Navigation for activity feed screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ActivityLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surfaceElevated },
        headerTitleStyle: { color: colors.secondary },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Activity Feed" }}
      />
    </Stack>
  );
}

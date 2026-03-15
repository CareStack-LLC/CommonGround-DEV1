/**
 * Event Detail Layout
 * Navigation for individual event screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function EventDetailLayout() {
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
        options={{ title: "Event Details" }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit Event",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

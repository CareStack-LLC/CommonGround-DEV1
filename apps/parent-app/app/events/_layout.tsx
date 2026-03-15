/**
 * Events Stack Layout
 * Navigation for event management screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function EventsLayout() {
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
        name="create"
        options={{
          title: "New Event",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[eventId]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

/**
 * Custody Stack Layout
 * Navigation for custody tracking and override screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function CustodyLayout() {
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

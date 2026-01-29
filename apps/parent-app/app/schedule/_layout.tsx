/**
 * Schedule Stack Layout
 * Navigation for schedule management screens
 */

import { Stack } from "expo-router";

const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function ScheduleLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: colors.sage,
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { color: colors.slate },
      }}
    >
      <Stack.Screen
        name="collections"
        options={{ title: "My Time Collections" }}
      />
      <Stack.Screen
        name="time-blocks"
        options={{ title: "Time Blocks" }}
      />
    </Stack>
  );
}

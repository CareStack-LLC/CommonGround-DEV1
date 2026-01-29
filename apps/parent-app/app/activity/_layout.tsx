/**
 * Activity Stack Layout
 * Navigation for activity feed screens
 */

import { Stack } from "expo-router";

const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function ActivityLayout() {
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
        name="index"
        options={{ title: "Activity Feed" }}
      />
    </Stack>
  );
}

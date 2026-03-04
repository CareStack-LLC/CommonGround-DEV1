/**
 * Event Detail Layout
 * Navigation for individual event screens
 */

import { Stack } from "expo-router";

const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function EventDetailLayout() {
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

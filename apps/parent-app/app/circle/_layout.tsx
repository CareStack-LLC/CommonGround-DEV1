/**
 * Circle Management Layout
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function CircleLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
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
        options={{ title: "My Circle" }}
      />
      <Stack.Screen
        name="[contactId]"
        options={{ title: "Contact Settings" }}
      />
      <Stack.Screen
        name="invite"
        options={{ title: "Invite Contact" }}
      />
      <Stack.Screen
        name="logs"
        options={{ title: "Communication Logs" }}
      />
    </Stack>
  );
}

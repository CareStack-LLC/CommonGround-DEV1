/**
 * Circle Management Layout
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function CircleLayout() {
  const colorScheme = useColorScheme();

  const colors = {
    background: colorScheme === "dark" ? "#0f172a" : "#ffffff",
    text: colorScheme === "dark" ? "#ffffff" : "#0f172a",
  };

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
        headerTintColor: "#2563eb",
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

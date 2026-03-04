/**
 * Messages Layout
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function MessagesLayout() {
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
        name="[threadId]"
        options={{
          title: "Conversation",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="compose"
        options={{
          title: "New Message",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

/**
 * Messages Layout
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function MessagesLayout() {
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

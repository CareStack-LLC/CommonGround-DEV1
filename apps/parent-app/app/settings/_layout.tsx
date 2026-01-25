/**
 * Settings Layout
 */

import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function SettingsLayout() {
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
        name="edit-profile"
        options={{ title: "Edit Profile" }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: "Notifications" }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: "Privacy Settings" }}
      />
    </Stack>
  );
}

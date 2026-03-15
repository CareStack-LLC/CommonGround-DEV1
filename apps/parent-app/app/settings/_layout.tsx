/**
 * Settings Layout
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.textSecondary,
          fontWeight: "600",
        },
        headerTintColor: colors.primary,
        headerBackTitle: "Back",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
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

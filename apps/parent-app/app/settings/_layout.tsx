/**
 * Settings Layout
 */

import { Stack } from "expo-router";

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SLATE = "#475569";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: WHITE,
        },
        headerTitleStyle: {
          color: SLATE,
          fontWeight: "600",
        },
        headerTintColor: SAGE,
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

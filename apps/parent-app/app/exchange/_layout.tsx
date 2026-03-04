/**
 * Exchange Stack Layout
 * Navigation for custody exchange management screens
 */

import { Stack } from "expo-router";

export default function ExchangeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: "#4A6C58", // Sage
        headerStyle: { backgroundColor: "#FFFBF5" }, // Cream
        headerTitleStyle: { color: "#475569" }, // Slate
      }}
    >
      <Stack.Screen
        name="create"
        options={{
          title: "Schedule Exchange",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="qr-scan"
        options={{
          title: "Scan QR Code",
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="qr-show"
        options={{
          title: "Your QR Code",
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="[instanceId]"
        options={{
          title: "Exchange Details",
        }}
      />
    </Stack>
  );
}

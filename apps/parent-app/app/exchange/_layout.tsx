/**
 * Exchange Stack Layout
 * Navigation for custody exchange management screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ExchangeLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surfaceElevated },
        headerTitleStyle: { color: colors.secondary },
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

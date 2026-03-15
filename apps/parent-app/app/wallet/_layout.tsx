/**
 * Wallet Stack Layout
 * Navigation for wallet and payment screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function WalletLayout() {
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
        name="index"
        options={{ title: "My Wallet" }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          title: "Set Up Payments",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="add-card"
        options={{
          title: "Add Payment Method",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="transactions"
        options={{ title: "Transaction History" }}
      />
    </Stack>
  );
}

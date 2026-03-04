/**
 * Wallet Stack Layout
 * Navigation for wallet and payment screens
 */

import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
        headerTintColor: colors.sage,
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: { color: colors.slate },
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

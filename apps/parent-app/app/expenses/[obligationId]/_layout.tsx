/**
 * Expense Detail Stack Layout
 * Navigation for expense detail and funding screens
 */

import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function ExpenseDetailLayout() {
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
        options={{ title: "Expense Details" }}
      />
      <Stack.Screen
        name="fund"
        options={{
          title: "Fund Expense",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

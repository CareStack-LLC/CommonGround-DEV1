/**
 * ClearFund Expenses Stack Layout
 * Navigation for expense management screens
 */

import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function ExpensesLayout() {
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
        options={{ title: "ClearFund Expenses" }}
      />
      <Stack.Screen
        name="[obligationId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="create"
        options={{ title: "New Expense", presentation: "modal" }}
      />
    </Stack>
  );
}

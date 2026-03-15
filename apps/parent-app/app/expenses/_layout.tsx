/**
 * ClearFund Expenses Stack Layout
 * Navigation for expense management screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ExpensesLayout() {
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

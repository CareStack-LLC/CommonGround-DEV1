/**
 * Expense Detail Stack Layout
 * Navigation for expense detail and funding screens
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ExpenseDetailLayout() {
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

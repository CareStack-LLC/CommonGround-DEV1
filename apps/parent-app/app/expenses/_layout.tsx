import { Stack } from "expo-router";

export default function ExpensesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "ClearFund Expenses" }}
      />
      <Stack.Screen
        name="[obligationId]"
        options={{ title: "Expense Details" }}
      />
      <Stack.Screen
        name="create"
        options={{ title: "New Expense", presentation: "modal" }}
      />
    </Stack>
  );
}

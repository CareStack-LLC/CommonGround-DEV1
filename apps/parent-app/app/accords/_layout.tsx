import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function AccordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.sage,
        headerStyle: {
          backgroundColor: colors.cream,
        },
        headerTitleStyle: {
          color: colors.slate,
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Quick Accords",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "New Quick Accord",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

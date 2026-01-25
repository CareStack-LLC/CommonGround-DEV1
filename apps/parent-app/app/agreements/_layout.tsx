import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function AgreementsLayout() {
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
          title: "Agreements",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "New Agreement",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Agreement Details",
        }}
      />
    </Stack>
  );
}

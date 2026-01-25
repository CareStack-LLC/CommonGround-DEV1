import { Stack } from "expo-router";

export default function FamilyLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#4A6C58", // Sage
        headerStyle: {
          backgroundColor: "#FFFBF5", // Cream
        },
        headerTitleStyle: {
          color: "#475569", // Slate
          fontWeight: "600",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Family Files",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create Family File",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="invite"
        options={{
          title: "Invite Co-Parent",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Family Details",
        }}
      />
    </Stack>
  );
}

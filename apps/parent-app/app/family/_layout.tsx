import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function FamilyLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerStyle: {
          backgroundColor: colors.surfaceElevated,
        },
        headerTitleStyle: {
          color: colors.secondary,
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

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function AccordsLayout() {
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

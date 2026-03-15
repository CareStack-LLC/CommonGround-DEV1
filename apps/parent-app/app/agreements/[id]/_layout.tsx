/**
 * Agreement Detail Layout
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function AgreementDetailLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surfaceElevated,
        },
        headerTitleStyle: {
          color: colors.secondary,
          fontWeight: "600",
        },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="preview"
        options={{
          title: "Preview",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="sections/[sectionId]"
        options={{
          title: "Edit Section",
          presentation: "card",
        }}
      />
    </Stack>
  );
}

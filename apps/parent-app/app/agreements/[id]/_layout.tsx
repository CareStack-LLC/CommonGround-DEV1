/**
 * Agreement Detail Layout
 */

import { Stack } from "expo-router";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  slate: "#475569",
  cream: "#FFFBF5",
};

export default function AgreementDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: cream,
        },
        headerTitleStyle: {
          color: colors.slate,
          fontWeight: "600",
        },
        headerTintColor: colors.sage,
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

const cream = "#FFFBF5";

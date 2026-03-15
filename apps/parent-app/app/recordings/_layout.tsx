/**
 * Recordings Layout
 *
 * Handles navigation for recording screens including:
 * - Recording list
 * - Recording details
 * - Transcription viewer
 * - Audit trail
 * - Evidence export
 */

import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function RecordingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "600",
        },
        headerTintColor: colors.primary,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Recordings",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Recording Details",
        }}
      />
      <Stack.Screen
        name="[id]/transcription"
        options={{
          title: "Transcription",
        }}
      />
      <Stack.Screen
        name="[id]/audit"
        options={{
          title: "Audit Trail",
        }}
      />
      <Stack.Screen
        name="[id]/export"
        options={{
          title: "Export Evidence",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

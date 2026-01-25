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
import { useColorScheme } from "@/hooks/useColorScheme";

export default function RecordingsLayout() {
  const colorScheme = useColorScheme();

  const colors = {
    background: colorScheme === "dark" ? "#0f172a" : "#ffffff",
    text: colorScheme === "dark" ? "#ffffff" : "#0f172a",
    border: colorScheme === "dark" ? "#1e293b" : "#e2e8f0",
  };

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
        headerTintColor: "#2563eb",
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

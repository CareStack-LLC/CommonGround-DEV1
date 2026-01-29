import { Stack } from "expo-router";

export default function ClearfundLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[obligationId]" />
    </Stack>
  );
}

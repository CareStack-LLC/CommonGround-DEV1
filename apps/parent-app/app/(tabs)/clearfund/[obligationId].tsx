/**
 * Obligation Details Screen - Placeholder
 * TODO: Implement full details view
 */
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useTheme } from "@/theme";

export default function ObligationDetailsScreen() {
  const { obligationId } = useLocalSearchParams<{ obligationId: string }>();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundSecondary,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.secondary }}>
          Expense Details
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Ionicons name="receipt-outline" size={64} color={colors.primary} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary, marginTop: 16 }}>
          Expense ID: {obligationId}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" }}>
          Full expense details coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

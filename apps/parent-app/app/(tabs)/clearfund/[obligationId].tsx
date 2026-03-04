/**
 * Obligation Details Screen - Placeholder
 * TODO: Implement full details view
 */
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

const SAGE = "#4A6C58";
const SLATE = "#475569";
const SAND = "#F5F0E8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";

export default function ObligationDetailsScreen() {
  const { obligationId } = useLocalSearchParams<{ obligationId: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: WHITE,
        borderBottomWidth: 1,
        borderBottomColor: SAND,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={SLATE} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: SLATE }}>
          Expense Details
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
        <Ionicons name="receipt-outline" size={64} color={SAGE} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginTop: 16 }}>
          Expense ID: {obligationId}
        </Text>
        <Text style={{ fontSize: 14, color: "#94A3B8", marginTop: 8, textAlign: "center" }}>
          Full expense details coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

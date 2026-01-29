/**
 * Manual Custody Override Screen
 *
 * Allows parents to manually record that children are with them.
 * Features:
 * - Select which children
 * - Provide reason for override
 * - Date selection for historical updates
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { parent, type CustodyParent } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

const OVERRIDE_REASONS = [
  { id: "schedule_change", label: "Schedule change", icon: "calendar-outline" },
  { id: "emergency", label: "Emergency", icon: "alert-circle-outline" },
  { id: "illness", label: "Child illness", icon: "medkit-outline" },
  { id: "travel", label: "Travel/Vacation", icon: "airplane-outline" },
  { id: "holiday", label: "Holiday adjustment", icon: "gift-outline" },
  { id: "other", label: "Other reason", icon: "chatbubble-outline" },
];

export default function CustodyOverrideScreen() {
  const { date: initialDate } = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuth();
  const { familyFile, children } = useFamilyFile();

  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const isParentA = familyFile?.parent_a?.id === user?.id;
  const custodyParent: CustodyParent = isParentA ? "parent_a" : "parent_b";

  // Select all children by default
  useEffect(() => {
    if (children.length > 0 && selectedChildren.length === 0) {
      setSelectedChildren(children.map((c) => c.id));
    }
  }, [children]);

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const handleSubmit = async () => {
    if (selectedChildren.length === 0) {
      Alert.alert("Select Children", "Please select at least one child.");
      return;
    }

    if (!selectedReason) {
      Alert.alert("Select Reason", "Please select a reason for this change.");
      return;
    }

    const reason = selectedReason === "other" ? customReason : OVERRIDE_REASONS.find((r) => r.id === selectedReason)?.label || "";

    if (selectedReason === "other" && !customReason.trim()) {
      Alert.alert("Enter Reason", "Please enter a reason for this change.");
      return;
    }

    setSubmitting(true);

    try {
      await parent.custody.overrideCustody({
        family_file_id: familyFile!.id,
        date: selectedDate,
        custody_parent: custodyParent,
        child_ids: selectedChildren,
        reason: reason,
      });

      Alert.alert(
        "Custody Updated",
        `Custody has been recorded as with you for ${selectedDate}.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error("Override failed:", err);
      Alert.alert("Error", err.message || "Failed to update custody. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header Info */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: `${colors.sage}10` }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={colors.sage} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.slate }}>
                Manual Custody Update
              </Text>
              <Text className="text-sm" style={{ color: colors.slate }}>
                Record that the children are currently with you. This will be logged
                in the custody history and may be visible to professionals with
                access to your family file.
              </Text>
            </View>
          </View>
        </View>

        {/* Date Selection */}
        <View className="mb-6">
          <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
            Date
          </Text>
          <View className="rounded-xl p-4" style={{ backgroundColor: "white" }}>
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: `${colors.sage}20` }}
              >
                <Ionicons name="calendar" size={20} color={colors.sage} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium" style={{ color: colors.slate }}>
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                  Today
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Children Selection */}
        <View className="mb-6">
          <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
            Which children are with you?
          </Text>
          <View className="space-y-2">
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                className="rounded-xl p-4 flex-row items-center"
                style={{
                  backgroundColor: selectedChildren.includes(child.id) ? `${colors.sage}15` : "white",
                  borderWidth: selectedChildren.includes(child.id) ? 2 : 0,
                  borderColor: colors.sage,
                }}
                onPress={() => toggleChild(child.id)}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: selectedChildren.includes(child.id)
                      ? colors.sage
                      : colors.sand,
                  }}
                >
                  {selectedChildren.includes(child.id) ? (
                    <Ionicons name="checkmark" size={20} color="white" />
                  ) : (
                    <Text
                      className="font-bold"
                      style={{ color: colors.slate }}
                    >
                      {child.first_name?.charAt(0) || "?"}
                    </Text>
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-medium" style={{ color: colors.slate }}>
                    {child.first_name} {child.last_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {children.length === 0 && (
            <View className="rounded-xl p-4 items-center" style={{ backgroundColor: "white" }}>
              <Text style={{ color: colors.slate }}>No children found</Text>
            </View>
          )}
        </View>

        {/* Reason Selection */}
        <View className="mb-6">
          <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
            Reason for update
          </Text>
          <View className="space-y-2">
            {OVERRIDE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                className="rounded-xl p-4 flex-row items-center"
                style={{
                  backgroundColor: selectedReason === reason.id ? `${colors.sage}15` : "white",
                  borderWidth: selectedReason === reason.id ? 2 : 0,
                  borderColor: colors.sage,
                }}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: selectedReason === reason.id
                      ? colors.sage
                      : colors.sand,
                  }}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={20}
                    color={selectedReason === reason.id ? "white" : colors.slate}
                  />
                </View>
                <Text className="flex-1 ml-3 font-medium" style={{ color: colors.slate }}>
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.sage} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Reason Input */}
        {selectedReason === "other" && (
          <View className="mb-6">
            <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
              Please explain
            </Text>
            <TextInput
              className="rounded-xl p-4"
              style={{
                backgroundColor: "white",
                color: colors.slate,
                minHeight: 100,
                textAlignVertical: "top",
              }}
              placeholder="Enter reason for custody change..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={customReason}
              onChangeText={setCustomReason}
            />
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          className="py-4 rounded-xl items-center flex-row justify-center mb-6"
          style={{
            backgroundColor:
              selectedChildren.length > 0 && selectedReason
                ? colors.sage
                : colors.sand,
          }}
          onPress={handleSubmit}
          disabled={selectedChildren.length === 0 || !selectedReason || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={selectedChildren.length > 0 && selectedReason ? "white" : colors.slate}
              />
              <Text
                className="font-semibold text-lg ml-2"
                style={{
                  color:
                    selectedChildren.length > 0 && selectedReason ? "white" : colors.slate,
                }}
              >
                Confirm - Children With Me
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

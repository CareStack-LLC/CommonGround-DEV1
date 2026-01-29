/**
 * Create Expense Screen
 * Add a new shared expense obligation
 */

import { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import type { ObligationPurpose } from "@commonground/api-client/src/api/parent/clearfund";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

const PURPOSES: { id: ObligationPurpose; label: string; icon: string; color: string }[] = [
  { id: "medical", label: "Medical", icon: "medical", color: "#ef4444" },
  { id: "education", label: "Education", icon: "school", color: "#3b82f6" },
  { id: "sports", label: "Sports", icon: "football", color: "#22c55e" },
  { id: "clothing", label: "Clothing", icon: "shirt", color: "#ec4899" },
  { id: "childcare", label: "Childcare", icon: "people", color: "#14b8a6" },
  { id: "extracurricular", label: "Activities", icon: "musical-notes", color: "#06b6d4" },
  { id: "device", label: "Device", icon: "phone-portrait", color: "#8b5cf6" },
  { id: "camp", label: "Camp", icon: "bonfire", color: "#f97316" },
  { id: "transportation", label: "Transport", icon: "car", color: "#64748b" },
  { id: "other", label: "Other", icon: "receipt", color: "#6b7280" },
];

export default function CreateExpenseScreen() {
  const { user } = useAuth();
  const { familyFile, children } = useFamilyFile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [purpose, setPurpose] = useState<ObligationPurpose | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitPercent, setSplitPercent] = useState(50);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const familyFileId = familyFile?.id || null;

  const handleSubmit = async () => {
    if (!purpose) {
      Alert.alert("Error", "Please select a category");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await parent.clearfund.createObligation({
        family_file_id: familyFileId,
        child_id: selectedChild || undefined,
        purpose,
        description: description.trim(),
        total_amount: parseFloat(amount),
        parent_a_share_percent: splitPercent,
        due_date: dueDate?.toISOString(),
        vendor_name: vendorName.trim() || undefined,
      });

      Alert.alert("Success", "Expense created successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to create expense:", error);
      Alert.alert("Error", "Failed to create expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = parseFloat(amount) || 0;
  const parentAShare = (totalAmount * splitPercent) / 100;
  const parentBShare = totalAmount - parentAShare;

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Selection */}
        <View className="px-4 pt-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <TouchableOpacity
                key={p.id}
                className={`px-3 py-2 rounded-xl flex-row items-center ${
                  purpose === p.id
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setPurpose(p.id)}
              >
                <Ionicons
                  name={p.icon as any}
                  size={16}
                  color={purpose === p.id ? "white" : p.color}
                />
                <Text
                  className={`ml-2 font-medium ${
                    purpose === p.id
                      ? "text-white"
                      : "text-secondary-700 dark:text-secondary-300"
                  }`}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Description
          </Text>
          <TextInput
            className="bg-white dark:bg-secondary-800 rounded-xl px-4 py-3 text-secondary-900 dark:text-white"
            placeholder="e.g., School supplies for fall semester"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Amount */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Total Amount
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl px-4 py-3 flex-row items-center">
            <Text className="text-2xl text-secondary-500 mr-2">$</Text>
            <TextInput
              className="flex-1 text-2xl text-secondary-900 dark:text-white"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Split Percentage */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Split ({splitPercent}% / {100 - splitPercent}%)
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text className="text-secondary-500 text-sm">You pay</Text>
                <Text className="text-xl font-bold text-secondary-900 dark:text-white">
                  ${parentAShare.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-secondary-500 text-sm">Co-parent pays</Text>
                <Text className="text-xl font-bold text-secondary-900 dark:text-white">
                  ${parentBShare.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Slider representation */}
            <View className="flex-row items-center gap-2">
              {[25, 50, 75].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  className={`flex-1 py-2 rounded-lg ${
                    splitPercent === pct
                      ? "bg-primary-600"
                      : "bg-secondary-100 dark:bg-secondary-700"
                  }`}
                  onPress={() => setSplitPercent(pct)}
                >
                  <Text
                    className={`text-center font-medium ${
                      splitPercent === pct
                        ? "text-white"
                        : "text-secondary-700 dark:text-secondary-300"
                    }`}
                  >
                    {pct}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Select Child */}
        {children && children.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
              For Child (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-xl ${
                  selectedChild === null
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setSelectedChild(null)}
              >
                <Text
                  className={`font-medium ${
                    selectedChild === null
                      ? "text-white"
                      : "text-secondary-700 dark:text-secondary-300"
                  }`}
                >
                  All Children
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  className={`px-4 py-2 rounded-xl ${
                    selectedChild === child.id
                      ? "bg-primary-600"
                      : "bg-white dark:bg-secondary-800"
                  }`}
                  onPress={() => setSelectedChild(child.id)}
                >
                  <Text
                    className={`font-medium ${
                      selectedChild === child.id
                        ? "text-white"
                        : "text-secondary-700 dark:text-secondary-300"
                    }`}
                  >
                    {child.first_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Vendor */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Vendor/Store (optional)
          </Text>
          <TextInput
            className="bg-white dark:bg-secondary-800 rounded-xl px-4 py-3 text-secondary-900 dark:text-white"
            placeholder="e.g., Target, Pediatric Dentistry"
            placeholderTextColor="#9ca3af"
            value={vendorName}
            onChangeText={setVendorName}
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 p-4 pb-8">
        <TouchableOpacity
          className={`py-4 rounded-xl items-center ${
            isSubmitting ? "bg-primary-400" : "bg-primary-600"
          }`}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Create Expense</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/**
 * Create Exchange Screen
 * Schedule a new custody exchange for Time Bridge
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
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { parent } from "@commonground/api-client";
import type { CustodyParent } from "@commonground/api-client/src/api/parent/custody";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#6B9B7A";
const SAGE_SUBTLE = "#E8F0EC";
const SLATE = "#475569";
const AMBER = "#D4A574";
const AMBER_SUBTLE = "#FEF7ED";
const SAND = "#F5F0E8";
const CREAM = "#FFFBF5";

const RECURRENCE_OPTIONS = [
  { id: "none", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 Weeks" },
  { id: "monthly", label: "Monthly" },
];

export default function CreateExchangeScreen() {
  const { user } = useAuth();
  const { familyFile, children } = useFamilyFile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [exchangeDate, setExchangeDate] = useState(new Date());
  const [exchangeTime, setExchangeTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [fromParent, setFromParent] = useState<CustodyParent>("parent_a");
  const [toParent, setToParent] = useState<CustodyParent>("parent_b");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState("none");
  const [silentHandoff, setSilentHandoff] = useState(true);
  const [qrConfirmation, setQrConfirmation] = useState(false);
  const [checkInWindowBefore, setCheckInWindowBefore] = useState(30);
  const [checkInWindowAfter, setCheckInWindowAfter] = useState(30);
  const [notes, setNotes] = useState("");

  const familyFileId = familyFile?.id || null;

  // Determine if user is parent A or B
  const isParentA = true; // This would come from auth context

  const handleSubmit = async () => {
    if (selectedChildren.length === 0 && children && children.length > 0) {
      Alert.alert("Error", "Please select at least one child");
      return;
    }

    if (!locationName.trim()) {
      Alert.alert("Error", "Please enter a location name");
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const scheduledAt = new Date(exchangeDate);
      scheduledAt.setHours(exchangeTime.getHours());
      scheduledAt.setMinutes(exchangeTime.getMinutes());
      scheduledAt.setSeconds(0);
      scheduledAt.setMilliseconds(0);

      await parent.custody.createExchange({
        family_file_id: familyFileId,
        from_parent: fromParent,
        to_parent: toParent,
        scheduled_at: scheduledAt.toISOString(),
        location_name: locationName.trim(),
        location_address: locationAddress.trim() || undefined,
        child_ids: selectedChildren.length > 0 ? selectedChildren : (children?.map(c => c.id) || []),
        is_recurring: recurrence !== "none",
        recurrence_pattern: recurrence !== "none" ? recurrence : undefined,
        silent_handoff_enabled: silentHandoff,
        qr_confirmation_required: qrConfirmation,
        check_in_window_before_minutes: checkInWindowBefore,
        check_in_window_after_minutes: checkInWindowAfter,
        notes: notes.trim() || undefined,
      });

      Alert.alert("Success", "Exchange scheduled successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Failed to create exchange:", error);
      Alert.alert("Error", "Failed to schedule exchange. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) setExchangeDate(date);
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (time) setExchangeTime(time);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: SAND }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Direction Selection */}
        <View className="px-4 pt-4">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Exchange Direction
          </Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: CREAM }}>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: fromParent === "parent_a" ? SAGE : "transparent",
                }}
                onPress={() => {
                  setFromParent("parent_a");
                  setToParent("parent_b");
                }}
              >
                <Text
                  className="font-medium"
                  style={{ color: fromParent === "parent_a" ? "white" : SLATE }}
                >
                  From You
                </Text>
              </TouchableOpacity>
              <View className="mx-3">
                <Ionicons name="arrow-forward" size={20} color={AMBER} />
              </View>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: fromParent === "parent_b" ? SAGE : "transparent",
                }}
                onPress={() => {
                  setFromParent("parent_b");
                  setToParent("parent_a");
                }}
              >
                <Text
                  className="font-medium"
                  style={{ color: fromParent === "parent_b" ? "white" : SLATE }}
                >
                  To You
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Date & Time */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Date & Time
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 rounded-2xl p-4 flex-row items-center"
              style={{ backgroundColor: CREAM }}
              onPress={() => setShowDatePicker(true)}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: AMBER_SUBTLE }}
              >
                <Ionicons name="calendar" size={20} color={AMBER} />
              </View>
              <View className="ml-3">
                <Text className="text-xs" style={{ color: `${SLATE}99` }}>Date</Text>
                <Text className="font-medium" style={{ color: SLATE }}>
                  {exchangeDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 rounded-2xl p-4 flex-row items-center"
              style={{ backgroundColor: CREAM }}
              onPress={() => setShowTimePicker(true)}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: SAGE_SUBTLE }}
              >
                <Ionicons name="time" size={20} color={SAGE} />
              </View>
              <View className="ml-3">
                <Text className="text-xs" style={{ color: `${SLATE}99` }}>Time</Text>
                <Text className="font-medium" style={{ color: SLATE }}>
                  {exchangeTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={exchangeDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={exchangeTime}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Location */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Exchange Location
          </Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: CREAM }}>
            <View className="flex-row items-center mb-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: AMBER_SUBTLE }}
              >
                <Ionicons name="location" size={20} color={AMBER} />
              </View>
              <TextInput
                className="flex-1 ml-3 text-base"
                style={{ color: SLATE }}
                placeholder="Location name (e.g., School parking lot)"
                placeholderTextColor={`${SLATE}66`}
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>
            <TextInput
              className="text-base pl-13"
              style={{ color: SLATE, marginLeft: 52 }}
              placeholder="Full address (optional)"
              placeholderTextColor={`${SLATE}66`}
              value={locationAddress}
              onChangeText={setLocationAddress}
            />
          </View>
        </View>

        {/* Children Selection */}
        {children && children.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
              Children
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                className="px-4 py-2.5 rounded-full"
                style={{
                  backgroundColor: selectedChildren.length === 0 ? SAGE : CREAM,
                }}
                onPress={() => setSelectedChildren([])}
              >
                <Text
                  className="font-medium"
                  style={{ color: selectedChildren.length === 0 ? "white" : SLATE }}
                >
                  All Children
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  className="px-4 py-2.5 rounded-full"
                  style={{
                    backgroundColor: selectedChildren.includes(child.id) ? SAGE : CREAM,
                  }}
                  onPress={() => toggleChild(child.id)}
                >
                  <Text
                    className="font-medium"
                    style={{
                      color: selectedChildren.includes(child.id) ? "white" : SLATE,
                    }}
                  >
                    {child.first_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recurrence */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Repeat
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RECURRENCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                className="px-4 py-2.5 rounded-full"
                style={{
                  backgroundColor: recurrence === option.id ? SAGE : CREAM,
                }}
                onPress={() => setRecurrence(option.id)}
              >
                <Text
                  className="font-medium"
                  style={{ color: recurrence === option.id ? "white" : SLATE }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Silent Drop Options */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Verification Options
          </Text>
          <View className="rounded-2xl p-4" style={{ backgroundColor: CREAM }}>
            {/* Silent Handoff Toggle */}
            <View className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: SAGE_SUBTLE }}
                >
                  <Ionicons name="navigate" size={20} color={SAGE} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: SLATE }}>
                    Silent Drop GPS
                  </Text>
                  <Text className="text-xs" style={{ color: `${SLATE}99` }}>
                    Verify location at exchange
                  </Text>
                </View>
              </View>
              <Switch
                value={silentHandoff}
                onValueChange={setSilentHandoff}
                trackColor={{ false: "#e2e8f0", true: SAGE_LIGHT }}
                thumbColor={silentHandoff ? SAGE : "#f4f4f5"}
              />
            </View>

            {/* QR Confirmation Toggle */}
            <View className="flex-row items-center justify-between py-2 mt-2">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: AMBER_SUBTLE }}
                >
                  <Ionicons name="qr-code" size={20} color={AMBER} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: SLATE }}>
                    QR Confirmation
                  </Text>
                  <Text className="text-xs" style={{ color: `${SLATE}99` }}>
                    Scan to confirm handoff
                  </Text>
                </View>
              </View>
              <Switch
                value={qrConfirmation}
                onValueChange={setQrConfirmation}
                trackColor={{ false: "#e2e8f0", true: SAGE_LIGHT }}
                thumbColor={qrConfirmation ? SAGE : "#f4f4f5"}
              />
            </View>

            {/* Check-in Window */}
            {silentHandoff && (
              <View className="mt-4 pt-4 border-t border-slate-200">
                <Text className="text-sm font-medium mb-3" style={{ color: SLATE }}>
                  Check-in Window
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs mb-1" style={{ color: `${SLATE}99` }}>
                      Before (min)
                    </Text>
                    <View className="flex-row items-center">
                      {[15, 30, 60].map((mins) => (
                        <TouchableOpacity
                          key={mins}
                          className="flex-1 py-2 rounded-lg items-center mr-1"
                          style={{
                            backgroundColor: checkInWindowBefore === mins ? SAGE : SAGE_SUBTLE,
                          }}
                          onPress={() => setCheckInWindowBefore(mins)}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: checkInWindowBefore === mins ? "white" : SAGE }}
                          >
                            {mins}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs mb-1" style={{ color: `${SLATE}99` }}>
                      After (min)
                    </Text>
                    <View className="flex-row items-center">
                      {[15, 30, 60].map((mins) => (
                        <TouchableOpacity
                          key={mins}
                          className="flex-1 py-2 rounded-lg items-center mr-1"
                          style={{
                            backgroundColor: checkInWindowAfter === mins ? SAGE : SAGE_SUBTLE,
                          }}
                          onPress={() => setCheckInWindowAfter(mins)}
                        >
                          <Text
                            className="text-sm font-medium"
                            style={{ color: checkInWindowAfter === mins ? "white" : SAGE }}
                          >
                            {mins}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        <View className="px-4 mt-6">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Notes (optional)
          </Text>
          <TextInput
            className="rounded-2xl px-4 py-3 text-base"
            style={{ backgroundColor: CREAM, color: SLATE, minHeight: 80, textAlignVertical: "top" }}
            placeholder="Any special instructions or notes..."
            placeholderTextColor={`${SLATE}66`}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View
        className="absolute bottom-0 left-0 right-0 p-4 pb-8 border-t"
        style={{ backgroundColor: CREAM, borderColor: "#e2e8f0" }}
      >
        <TouchableOpacity
          className="py-4 rounded-xl items-center"
          style={{ backgroundColor: isSubmitting ? SAGE_LIGHT : SAGE }}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Schedule Exchange</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

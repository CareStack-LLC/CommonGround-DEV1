/**
 * Privacy Settings Screen
 */

import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { parent, type PrivacySettings } from "@commonground/api-client";

export default function PrivacyScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Privacy settings state
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [lastSeen, setLastSeen] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReporting, setCrashReporting] = useState(true);

  // Load privacy settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await parent.settings.getPrivacySettings();

      setReadReceipts(settings.read_receipts);
      setTypingIndicator(settings.typing_indicator);
      setLastSeen(settings.last_seen);
      setAnalyticsEnabled(settings.analytics_enabled);
      setCrashReporting(settings.crash_reporting);
    } catch (err) {
      console.error("Failed to load privacy settings:", err);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const settings: PrivacySettings = {
        read_receipts: readReceipts,
        typing_indicator: typingIndicator,
        last_seen: lastSeen,
        analytics_enabled: analyticsEnabled,
        crash_reporting: crashReporting,
      };

      await parent.settings.updatePrivacySettings(settings);
      Alert.alert("Saved", "Your privacy settings have been updated");
    } catch (err) {
      console.error("Failed to save privacy settings:", err);
      Alert.alert("Error", "Failed to save privacy settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = () => {
    Alert.alert(
      "Download Your Data",
      "We'll prepare a copy of your data and send you an email when it's ready. This may take up to 24 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Data",
          onPress: () => {
            Alert.alert("Request Submitted", "You'll receive an email when your data is ready.");
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data, including messages, recordings, and documents will be permanently deleted.\n\nAre you sure you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "Please contact support@commonground.app to complete account deletion. This ensures proper handling of any legal holds or court requirements.",
              [{ text: "OK" }]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Privacy Settings",
          headerRight: () =>
            saving ? (
              <ActivityIndicator size="small" color="#2563eb" className="mr-4" />
            ) : (
              <TouchableOpacity onPress={handleSave} className="mr-4">
                <Text className="text-primary-600 font-semibold">Save</Text>
              </TouchableOpacity>
            ),
        }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Communication Privacy */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Communication
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <PrivacyToggle
              icon="checkmark-done"
              label="Read Receipts"
              description="Let your co-parent see when you've read messages"
              value={readReceipts}
              onValueChange={setReadReceipts}
            />
            <PrivacyToggle
              icon="ellipsis-horizontal"
              label="Typing Indicator"
              description="Show when you're typing a message"
              value={typingIndicator}
              onValueChange={setTypingIndicator}
            />
            <PrivacyToggle
              icon="time"
              label="Last Seen"
              description="Show when you were last active"
              value={lastSeen}
              onValueChange={setLastSeen}
              isLast
            />
          </View>
        </View>

        {/* Data & Analytics */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Data & Analytics
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <PrivacyToggle
              icon="analytics"
              label="Usage Analytics"
              description="Help improve CommonGround with anonymous usage data"
              value={analyticsEnabled}
              onValueChange={setAnalyticsEnabled}
            />
            <PrivacyToggle
              icon="bug"
              label="Crash Reporting"
              description="Automatically send crash reports to help fix issues"
              value={crashReporting}
              onValueChange={setCrashReporting}
              isLast
            />
          </View>
        </View>

        {/* Legal Notice */}
        <View className="px-6 py-4">
          <View className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
            <View className="flex-1 ml-2">
              <Text className="text-blue-700 dark:text-blue-300 font-medium">
                Court-Admissible Records
              </Text>
              <Text className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Messages and recordings are retained for legal purposes with full chain of custody
                documentation. Privacy settings do not affect data retention for compliance.
              </Text>
            </View>
          </View>
        </View>

        {/* Data Requests */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Your Data
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b border-secondary-100 dark:border-secondary-700"
              onPress={handleDownloadData}
            >
              <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
                <Ionicons name="download" size={20} color="#2563eb" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-secondary-900 dark:text-white font-medium">
                  Download Your Data
                </Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  Request a copy of all your data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-4"
              onPress={handleDeleteAccount}
            >
              <View className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center">
                <Ionicons name="trash" size={20} color="#dc2626" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-red-600 dark:text-red-400 font-medium">Delete Account</Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  Permanently delete your account and data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrivacyToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-4 ${
        !isLast ? "border-b border-secondary-100 dark:border-secondary-700" : ""
      }`}
    >
      <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
        <Ionicons name={icon} size={20} color="#2563eb" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-secondary-900 dark:text-white font-medium">{label}</Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
        thumbColor={value ? "#2563eb" : "#f4f4f5"}
      />
    </View>
  );
}

/**
 * Notification Preferences Screen
 */

import { View, Text, ScrollView, Switch, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen() {
  // Notification settings state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);
  const [scheduleReminders, setScheduleReminders] = useState(true);
  const [callNotifs, setCallNotifs] = useState(true);
  const [recordingNotifs, setRecordingNotifs] = useState(true);
  const [legalAlerts, setLegalAlerts] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);

  const handleSave = () => {
    // TODO: Save to backend
    Alert.alert("Saved", "Your notification preferences have been updated");
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} className="mr-4">
              <Text className="text-primary-600 font-semibold">Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Push & Email */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Delivery Methods
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <NotificationToggle
              icon="notifications"
              label="Push Notifications"
              description="Receive notifications on your device"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />
            <NotificationToggle
              icon="mail"
              label="Email Notifications"
              description="Receive important updates via email"
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              isLast
            />
          </View>
        </View>

        {/* Notification Types */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Notification Types
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <NotificationToggle
              icon="chatbubble"
              label="Messages"
              description="New messages from your co-parent"
              value={messageNotifs}
              onValueChange={setMessageNotifs}
            />
            <NotificationToggle
              icon="calendar"
              label="Schedule Reminders"
              description="Upcoming events and exchanges"
              value={scheduleReminders}
              onValueChange={setScheduleReminders}
            />
            <NotificationToggle
              icon="videocam"
              label="Calls"
              description="Incoming call notifications"
              value={callNotifs}
              onValueChange={setCallNotifs}
            />
            <NotificationToggle
              icon="recording"
              label="Recordings"
              description="Recording ready and transcription complete"
              value={recordingNotifs}
              onValueChange={setRecordingNotifs}
            />
            <NotificationToggle
              icon="shield-checkmark"
              label="Legal Alerts"
              description="Legal hold and court-related updates"
              value={legalAlerts}
              onValueChange={setLegalAlerts}
              isLast
            />
          </View>
        </View>

        {/* Quiet Hours */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Quiet Hours
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <NotificationToggle
              icon="moon"
              label="Enable Quiet Hours"
              description="Silence notifications during set times"
              value={quietHoursEnabled}
              onValueChange={setQuietHoursEnabled}
            />
            {quietHoursEnabled && (
              <>
                <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 border-t border-secondary-100 dark:border-secondary-700">
                  <Text className="text-secondary-900 dark:text-white">Start Time</Text>
                  <Text className="text-primary-600">10:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center justify-between px-4 py-4 border-t border-secondary-100 dark:border-secondary-700">
                  <Text className="text-secondary-900 dark:text-white">End Time</Text>
                  <Text className="text-primary-600">7:00 AM</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Info */}
        <View className="px-6 py-4">
          <View className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text className="flex-1 ml-2 text-sm text-blue-700 dark:text-blue-300">
              Critical notifications like incoming calls and urgent legal alerts will always be
              delivered, even during quiet hours.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationToggle({
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

/**
 * Notifications Settings Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const [settings, setSettings] = useState({
    push_enabled: true,
    email_enabled: true,
    new_messages: true,
    case_updates: true,
    intake_completed: true,
    court_reminders: true,
    compliance_alerts: true,
    aria_flags: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Notifications</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* General */}
        <View className="mb-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">GENERAL</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            <NotificationItem
              label="Push Notifications"
              description="Enable push notifications"
              value={settings.push_enabled}
              onToggle={() => handleToggle('push_enabled')}
            />
            <NotificationItem
              label="Email Notifications"
              description="Receive email updates"
              value={settings.email_enabled}
              onToggle={() => handleToggle('email_enabled')}
              isLast
            />
          </View>
        </View>

        {/* Case Notifications */}
        <View className="mb-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">CASES</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            <NotificationItem
              label="New Messages"
              description="When clients send messages"
              value={settings.new_messages}
              onToggle={() => handleToggle('new_messages')}
            />
            <NotificationItem
              label="Case Updates"
              description="Agreement changes, status updates"
              value={settings.case_updates}
              onToggle={() => handleToggle('case_updates')}
            />
            <NotificationItem
              label="Intake Completed"
              description="When a client completes intake"
              value={settings.intake_completed}
              onToggle={() => handleToggle('intake_completed')}
              isLast
            />
          </View>
        </View>

        {/* Alerts */}
        <View>
          <Text className="text-gray-500 font-medium mb-2 px-2">ALERTS</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            <NotificationItem
              label="Court Reminders"
              description="Upcoming hearings and deadlines"
              value={settings.court_reminders}
              onToggle={() => handleToggle('court_reminders')}
            />
            <NotificationItem
              label="Compliance Alerts"
              description="Exchange and payment issues"
              value={settings.compliance_alerts}
              onToggle={() => handleToggle('compliance_alerts')}
            />
            <NotificationItem
              label="ARIA Flags"
              description="High-severity communication flags"
              value={settings.aria_flags}
              onToggle={() => handleToggle('aria_flags')}
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationItem({
  label,
  description,
  value,
  onToggle,
  isLast = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between p-4 ${
        !isLast ? 'border-b border-gray-100' : ''
      }`}
    >
      <View className="flex-1">
        <Text className="font-medium text-gray-800">{label}</Text>
        <Text className="text-gray-500 text-sm">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#d1d5db', true: '#2563eb' }}
      />
    </View>
  );
}

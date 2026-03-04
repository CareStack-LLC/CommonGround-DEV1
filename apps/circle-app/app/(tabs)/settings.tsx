import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [callSounds, setCallSounds] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-800">Settings</Text>
        </View>

        {/* Profile Section */}
        <View className="bg-white mt-4 mx-4 rounded-2xl overflow-hidden">
          <TouchableOpacity className="flex-row items-center p-4">
            <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
              <Text className="text-3xl">👤</Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-gray-800">
                {user?.name || "User"}
              </Text>
              <Text className="text-gray-500">{user?.email}</Text>
              {user?.relationship && (
                <View className="bg-primary-100 self-start px-3 py-1 rounded-full mt-1">
                  <Text className="text-primary-700 text-sm font-medium">
                    {user.relationship}
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View className="mt-6 px-4">
          <Text className="text-sm font-bold text-gray-500 uppercase mb-2 ml-2">
            Notifications
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            <SettingRow
              icon="notifications"
              iconColor="#0ea5e9"
              title="Push Notifications"
              subtitle="Get notified when someone is available"
              trailing={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: "#e5e7eb", true: "#0ea5e9" }}
                />
              }
            />
            <SettingRow
              icon="volume-high"
              iconColor="#8b5cf6"
              title="Call Sounds"
              subtitle="Play sounds for incoming calls"
              trailing={
                <Switch
                  value={callSounds}
                  onValueChange={setCallSounds}
                  trackColor={{ false: "#e5e7eb", true: "#8b5cf6" }}
                />
              }
            />
          </View>
        </View>

        {/* Connections Section */}
        <View className="mt-6 px-4">
          <Text className="text-sm font-bold text-gray-500 uppercase mb-2 ml-2">
            Connections
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            <SettingRow
              icon="people"
              iconColor="#22c55e"
              title="Connected Families"
              subtitle="Manage your family connections"
              onPress={() => {}}
            />
            <SettingRow
              icon="ticket"
              iconColor="#f97316"
              title="Enter Invitation Code"
              subtitle="Join another family's circle"
              onPress={() => router.push("/(auth)/invitation")}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View className="mt-6 px-4">
          <Text className="text-sm font-bold text-gray-500 uppercase mb-2 ml-2">
            Privacy & Security
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            <SettingRow
              icon="shield-checkmark"
              iconColor="#0ea5e9"
              title="Privacy Settings"
              subtitle="Control who can contact you"
              onPress={() => {}}
            />
            <SettingRow
              icon="lock-closed"
              iconColor="#6b7280"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support Section */}
        <View className="mt-6 px-4">
          <Text className="text-sm font-bold text-gray-500 uppercase mb-2 ml-2">
            Support
          </Text>
          <View className="bg-white rounded-2xl overflow-hidden">
            <SettingRow
              icon="help-circle"
              iconColor="#0ea5e9"
              title="Help Center"
              subtitle="Get help with My Circle"
              onPress={() => {}}
            />
            <SettingRow
              icon="chatbubble-ellipses"
              iconColor="#22c55e"
              title="Contact Support"
              subtitle="Reach out to our team"
              onPress={() => {}}
            />
            <SettingRow
              icon="document-text"
              iconColor="#6b7280"
              title="Terms of Service"
              onPress={() => {}}
            />
            <SettingRow
              icon="shield"
              iconColor="#6b7280"
              title="Privacy Policy"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View className="mt-6 px-4 mb-8">
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 items-center"
            onPress={handleLogout}
          >
            <Text className="text-red-500 font-bold text-lg">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View className="items-center mb-8">
          <Text className="text-gray-400 text-sm">My Circle v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center p-4 border-b border-gray-50">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-gray-800 font-medium">{title}</Text>
        {subtitle && (
          <Text className="text-gray-400 text-sm">{subtitle}</Text>
        )}
      </View>
      {trailing || (onPress && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />)}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
}

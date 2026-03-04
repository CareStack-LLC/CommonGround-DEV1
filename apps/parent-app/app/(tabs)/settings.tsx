import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

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
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Profile Section */}
        <View className="px-6 py-6 bg-white dark:bg-secondary-800 mb-4">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Text className="text-primary-600 font-bold text-2xl">
                {user?.first_name?.charAt(0) || "U"}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-secondary-900 dark:text-white">
                {user?.first_name} {user?.last_name}
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400">
                {user?.email}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="pencil" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Section */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Family
          </Text>
          <View className="card space-y-0">
            <SettingsRow
              icon="folder-open-outline"
              label="Family Files"
              onPress={() => router.push("/(tabs)/files")}
            />
            <SettingsRow
              icon="person-add-outline"
              label="Invite Co-Parent"
              onPress={() => router.push("/(tabs)/files")}
              isLast
            />
          </View>
        </View>

        {/* Agreements Section */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Agreements
          </Text>
          <View className="card space-y-0">
            <SettingsRow
              icon="document-text-outline"
              label="Custody Agreements"
              onPress={() => router.push("/agreements")}
            />
            <SettingsRow
              icon="flash-outline"
              label="Quick Accords"
              onPress={() => router.push("/accords")}
              isLast
            />
          </View>
        </View>

        {/* Account Settings */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Account
          </Text>
          <View className="card space-y-0">
            <SettingsRow
              icon="person-outline"
              label="Edit Profile"
              onPress={() => router.push("/settings/edit-profile")}
            />
            <SettingsRow
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => router.push("/settings/change-password")}
            />
            <SettingsRow
              icon="notifications-outline"
              label="Notification Preferences"
              onPress={() => router.push("/settings/notifications")}
            />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Settings"
              onPress={() => router.push("/settings/privacy")}
              isLast
            />
          </View>
        </View>

        {/* App Settings */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            App Settings
          </Text>
          <View className="card space-y-0">
            <SettingsToggle
              icon="moon-outline"
              label="Dark Mode"
              value={false}
              onValueChange={() => {}}
            />
            <SettingsRow
              icon="language-outline"
              label="Language"
              value="English"
              onPress={() => {}}
            />
            <SettingsRow
              icon="time-outline"
              label="Time Zone"
              value="Auto"
              onPress={() => {}}
              isLast
            />
          </View>
        </View>

        {/* Communication Settings */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Communication
          </Text>
          <View className="card space-y-0">
            <SettingsToggle
              icon="chatbubble-outline"
              label="Message Notifications"
              value={true}
              onValueChange={() => {}}
            />
            <SettingsToggle
              icon="calendar-outline"
              label="Schedule Reminders"
              value={true}
              onValueChange={() => {}}
            />
            <SettingsToggle
              icon="videocam-outline"
              label="Call Notifications"
              value={true}
              onValueChange={() => {}}
            />
          </View>
        </View>

        {/* Support */}
        <View className="px-6 mb-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Support
          </Text>
          <View className="card space-y-0">
            <SettingsRow
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => {}}
            />
            <SettingsRow
              icon="chatbubbles-outline"
              label="Contact Support"
              onPress={() => {}}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => {}}
            />
            <SettingsRow
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => {}}
              isLast
            />
          </View>
        </View>

        {/* Sign Out */}
        <View className="px-6 mb-4">
          <TouchableOpacity
            className="card flex-row items-center justify-center py-4"
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text className="text-danger-500 font-semibold ml-2">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center py-4">
          <Text className="text-secondary-400 dark:text-secondary-500 text-sm">
            CommonGround v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center py-4 ${
        !isLast ? "border-b border-secondary-100 dark:border-secondary-700" : ""
      }`}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color="#64748b" />
      <Text className="flex-1 ml-3 text-secondary-900 dark:text-white">
        {label}
      </Text>
      {value && (
        <Text className="text-secondary-500 dark:text-secondary-400 mr-2">
          {value}
        </Text>
      )}
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function SettingsToggle({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-secondary-100 dark:border-secondary-700">
      <Ionicons name={icon} size={22} color="#64748b" />
      <Text className="flex-1 ml-3 text-secondary-900 dark:text-white">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
        thumbColor={value ? "#2563eb" : "#f4f4f5"}
      />
    </View>
  );
}

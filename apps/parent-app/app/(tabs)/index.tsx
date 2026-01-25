import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { familyFile, children, isLoading, refresh } = useFamilyFile();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const firstName = user?.first_name || "Parent";

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6 bg-white dark:bg-secondary-800">
          <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
            Welcome, {firstName}
          </Text>
          <Text className="text-secondary-500 dark:text-secondary-400 mt-1">
            {familyFile?.title || "Your family dashboard"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickActionButton
              icon="chatbubble"
              label="New Message"
              onPress={() => router.push("/(tabs)/messages")}
            />
            <QuickActionButton
              icon="calendar"
              label="Add Event"
              onPress={() => router.push("/(tabs)/schedule")}
            />
            <QuickActionButton
              icon="videocam"
              label="Recordings"
              onPress={() => router.push("/recordings")}
            />
            <QuickActionButton
              icon="document-text"
              label="Agreements"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Children Section */}
        {children && children.length > 0 && (
          <View className="px-6 py-4">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
              Children
            </Text>
            <View className="space-y-3">
              {children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </View>
          </View>
        )}

        {/* Recent Activity */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
              Recent Activity
            </Text>
            <TouchableOpacity>
              <Text className="text-primary-600 text-sm">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="card">
            <View className="items-center py-8">
              <Ionicons name="time-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No recent activity
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Events */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
              Upcoming Events
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}>
              <Text className="text-primary-600 text-sm">View Calendar</Text>
            </TouchableOpacity>
          </View>
          <View className="card">
            <View className="items-center py-8">
              <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No upcoming events
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-white dark:bg-secondary-800 rounded-xl p-4 items-center justify-center shadow-sm border border-secondary-100 dark:border-secondary-700"
      style={{ width: "47%" }}
      onPress={onPress}
    >
      <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mb-2">
        <Ionicons name={icon} size={24} color="#2563eb" />
      </View>
      <Text className="text-secondary-700 dark:text-secondary-300 text-sm font-medium">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ChildCard({ child }: { child: { id: string; first_name: string; date_of_birth?: string } }) {
  const age = child.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(child.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <TouchableOpacity className="card flex-row items-center">
      <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
        <Text className="text-primary-600 font-bold text-lg">
          {child.first_name.charAt(0)}
        </Text>
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-secondary-900 dark:text-white font-semibold">
          {child.first_name}
        </Text>
        {age !== null && (
          <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
            {age} years old
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

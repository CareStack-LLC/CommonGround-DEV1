import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useState, useCallback } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors - Matching Web
const SAGE = "#4A6C58";       // Primary - Trust, success
const SAGE_LIGHT = "#6B9B7A";
const SLATE = "#475569";      // Secondary - Stability
const AMBER = "#D4A574";      // Accent - Warmth, attention
const SAND = "#F5F0E8";       // Background
const CREAM = "#FFFBF5";      // Card surfaces

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
    <SafeAreaView className="flex-1 bg-sand-200 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6" style={{ backgroundColor: CREAM }}>
          <Text className="text-2xl font-bold" style={{ color: SAGE }}>
            Welcome, {firstName}
          </Text>
          <Text className="mt-1" style={{ color: SLATE }}>
            {familyFile?.title || "Your family dashboard"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
            Quick Actions
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickActionButton
              icon="chatbubble"
              label="Messages"
              onPress={() => router.push("/(tabs)/messages")}
              color={SAGE}
            />
            <QuickActionButton
              icon="wallet"
              label="ClearFund"
              onPress={() => router.push("/expenses")}
              color={SAGE_LIGHT}
            />
            <QuickActionButton
              icon="swap-horizontal"
              label="Time Bridge"
              onPress={() => router.push("/(tabs)/schedule")}
              color={AMBER}
            />
            <QuickActionButton
              icon="people"
              label="My Circle"
              onPress={() => router.push("/circle")}
              color={SLATE}
            />
            <QuickActionButton
              icon="videocam"
              label="Recordings"
              onPress={() => router.push("/recordings")}
              color={AMBER}
            />
            <QuickActionButton
              icon="document-text"
              label="Agreements"
              onPress={() => {}}
              color={SLATE}
            />
          </View>
        </View>

        {/* Children Section */}
        {children && children.length > 0 && (
          <View className="px-6 py-4">
            <Text className="text-lg font-semibold mb-3" style={{ color: SLATE }}>
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
            <Text className="text-lg font-semibold" style={{ color: SLATE }}>
              Recent Activity
            </Text>
            <TouchableOpacity>
              <Text className="text-sm" style={{ color: SAGE }}>View All</Text>
            </TouchableOpacity>
          </View>
          <View className="rounded-3xl p-4" style={{ backgroundColor: CREAM }}>
            <View className="items-center py-8">
              <Ionicons name="time-outline" size={48} color={SLATE} />
              <Text className="mt-3" style={{ color: SLATE }}>
                No recent activity
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Events */}
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold" style={{ color: SLATE }}>
              Upcoming Events
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}>
              <Text className="text-sm" style={{ color: SAGE }}>View Calendar</Text>
            </TouchableOpacity>
          </View>
          <View className="rounded-3xl p-4" style={{ backgroundColor: CREAM }}>
            <View className="items-center py-8">
              <Ionicons name="calendar-outline" size={48} color={AMBER} />
              <Text className="mt-3" style={{ color: SLATE }}>
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
  color = SAGE,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      className="rounded-3xl p-4 items-center justify-center shadow-sm"
      style={{ width: "47%", backgroundColor: CREAM }}
      onPress={onPress}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="text-sm font-medium" style={{ color: SLATE }}>
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
    <TouchableOpacity
      className="flex-row items-center rounded-3xl p-4"
      style={{ backgroundColor: CREAM }}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: `${SAGE}20` }}
      >
        <Text className="font-bold text-lg" style={{ color: SAGE }}>
          {child.first_name.charAt(0)}
        </Text>
      </View>
      <View className="ml-4 flex-1">
        <Text className="font-semibold" style={{ color: SLATE }}>
          {child.first_name}
        </Text>
        {age !== null && (
          <Text className="text-sm" style={{ color: `${SLATE}99` }}>
            {age} years old
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={SLATE} />
    </TouchableOpacity>
  );
}

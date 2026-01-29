/**
 * Activity Feed Screen
 *
 * Shows all recent activity in the family file with filtering options.
 * Features:
 * - Category filtering (communication, custody, schedule, financial, system)
 * - Mark as read functionality
 * - Pull to refresh
 * - Infinite scroll pagination
 * - Navigation to related items
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

import {
  parent,
  type ActivityFeedItem,
  type ActivityCategory,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useRealtime } from "@/providers/RealtimeProvider";

const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

// Category configuration
const CATEGORIES: { key: ActivityCategory | "all"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All", icon: "apps" },
  { key: "communication", label: "Messages", icon: "chatbubble" },
  { key: "custody", label: "Custody", icon: "people" },
  { key: "schedule", label: "Schedule", icon: "calendar" },
  { key: "financial", label: "Financial", icon: "wallet" },
  { key: "system", label: "System", icon: "settings" },
];

// Map activity icons to Ionicons
const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  message: "chatbubble",
  users: "people",
  calendar: "calendar",
  check: "checkmark-circle",
  x: "close-circle",
  file: "document-text",
  wallet: "wallet",
  mail: "mail",
  info: "information-circle",
};

// Map categories to colors
const categoryColors: Record<string, { bg: string; text: string }> = {
  communication: { bg: "#E0E7FF", text: "#3730A3" },
  custody: { bg: "#D1FAE5", text: "#065F46" },
  schedule: { bg: "#FEF3C7", text: "#92400E" },
  financial: { bg: "#FEE2E2", text: "#991B1B" },
  system: { bg: "#F1F5F9", text: "#475569" },
};

export default function ActivityScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const { subscribe, isConnected } = useRealtime();
  const familyFileId = user?.family_file_id || familyFile?.id;

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const LIMIT = 20;

  // Subscribe to real-time activity updates
  useEffect(() => {
    const unsubscribe = subscribe("activity", () => {
      // Refresh activities when we receive a real-time update
      setOffset(0);
      fetchActivities(true);
    });

    return unsubscribe;
  }, [subscribe]);

  // Set up header with connection indicator and mark all as read button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center mr-4">
          {/* Real-time connection indicator */}
          <View
            className="w-2 h-2 rounded-full mr-3"
            style={{ backgroundColor: isConnected ? "#22C55E" : "#EF4444" }}
          />
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={{ color: colors.sage }} className="font-medium">
                Mark All Read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, unreadCount, isConnected]);

  const fetchActivities = useCallback(async (reset = false) => {
    if (!familyFileId) return;

    const newOffset = reset ? 0 : offset;

    try {
      const response = await parent.activities.getActivities(familyFileId, {
        limit: LIMIT,
        offset: newOffset,
        category: selectedCategory === "all" ? undefined : selectedCategory,
      });

      if (reset) {
        setActivities(response.items);
      } else {
        setActivities((prev) => [...prev, ...response.items]);
      }

      setUnreadCount(response.unread_count);
      setHasMore(response.items.length === LIMIT);
      setOffset(newOffset + response.items.length);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      // Demo data for testing
      const demoActivities: ActivityFeedItem[] = [
        {
          id: "act-1",
          activity_type: "message_sent",
          category: "communication",
          actor_name: "Sarah",
          title: "New message from Sarah",
          icon: "message",
          severity: "info",
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          is_read: false,
          subject_type: "message",
          subject_id: "msg-1",
        },
        {
          id: "act-2",
          activity_type: "exchange_completed",
          category: "custody",
          actor_name: "System",
          title: "Exchange check-in confirmed",
          icon: "check",
          severity: "success",
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          is_read: false,
          subject_type: "exchange",
        },
        {
          id: "act-3",
          activity_type: "event_created",
          category: "schedule",
          actor_name: "You",
          title: "Soccer practice added to calendar",
          icon: "calendar",
          severity: "info",
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          is_read: true,
          subject_type: "event",
          subject_id: "event-1",
        },
        {
          id: "act-4",
          activity_type: "expense_approved",
          category: "financial",
          actor_name: "Sarah",
          title: "School supplies expense approved",
          icon: "wallet",
          severity: "success",
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          is_read: true,
          subject_type: "expense",
          subject_id: "exp-1",
        },
        {
          id: "act-5",
          activity_type: "agreement_approved",
          category: "system",
          actor_name: "Sarah",
          title: "Agreement section approved",
          icon: "file",
          severity: "info",
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          is_read: true,
          subject_type: "agreement",
          subject_id: "agr-1",
        },
      ];

      // Filter by category if not "all"
      const filtered =
        selectedCategory === "all"
          ? demoActivities
          : demoActivities.filter((a) => a.category === selectedCategory);

      if (reset) {
        setActivities(filtered);
      } else {
        setActivities((prev) => [...prev, ...filtered]);
      }
      setUnreadCount(filtered.filter((a) => !a.is_read).length);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [familyFileId, selectedCategory, offset]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    setOffset(0);
    fetchActivities(true);
  }, [familyFileId, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOffset(0);
    await fetchActivities(true);
  }, [fetchActivities]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchActivities(false);
  }, [fetchActivities, loadingMore, hasMore]);

  const handleMarkAllRead = async () => {
    if (!familyFileId) return;

    try {
      await parent.activities.markAllAsRead(familyFileId);
      setActivities((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      // Demo mode
      setActivities((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setUnreadCount(0);
    }
  };

  const handleActivityPress = async (activity: ActivityFeedItem) => {
    // Mark as read
    if (!activity.is_read && familyFileId) {
      try {
        await parent.activities.markAsRead(familyFileId, activity.id);
        setActivities((prev) =>
          prev.map((a) => (a.id === activity.id ? { ...a, is_read: true } : a))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
        setActivities((prev) =>
          prev.map((a) => (a.id === activity.id ? { ...a, is_read: true } : a))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    // Navigate based on subject type
    switch (activity.subject_type) {
      case "message":
        router.push("/messages");
        break;
      case "event":
        if (activity.subject_id) {
          router.push(`/events/${activity.subject_id}`);
        } else {
          router.push("/events");
        }
        break;
      case "exchange":
        router.push("/(tabs)/schedule");
        break;
      case "agreement":
        if (activity.subject_id) {
          router.push(`/agreements/${activity.subject_id}`);
        } else {
          router.push("/agreements");
        }
        break;
      case "expense":
        router.push("/expenses");
        break;
      default:
        break;
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const time = formatDistanceToNow(new Date(dateString), { addSuffix: false });
      if (time.includes("less than a minute")) return "now";
      if (time.includes("minute")) {
        const mins = parseInt(time);
        return isNaN(mins) ? "1m" : `${mins}m`;
      }
      if (time.includes("hour")) {
        const hrs = parseInt(time);
        return isNaN(hrs) ? "1h" : `${hrs}h`;
      }
      if (time.includes("day")) {
        const days = parseInt(time);
        return isNaN(days) ? "1d" : `${days}d`;
      }
      return time.split(" ")[0];
    } catch {
      return "";
    }
  };

  const renderActivity = ({ item }: { item: ActivityFeedItem }) => {
    const Icon = iconMap[item.icon] || "information-circle";
    const catColors = categoryColors[item.category] || categoryColors.system;

    return (
      <TouchableOpacity
        className="flex-row items-center p-4 bg-white mb-2 rounded-xl"
        style={{
          borderLeftWidth: item.is_read ? 0 : 3,
          borderLeftColor: colors.sage,
        }}
        onPress={() => handleActivityPress(item)}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: catColors.bg }}
        >
          <Ionicons name={Icon} size={20} color={catColors.text} />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className={`${item.is_read ? "font-medium" : "font-semibold"}`}
            style={{ color: colors.slate }}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text className="text-sm text-slate-500 mt-0.5">{item.actor_name}</Text>
        </View>
        <Text className="text-xs text-slate-400">{formatTime(item.created_at)}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && activities.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      {/* Category Filter */}
      <View className="px-4 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                className="flex-row items-center px-3 py-2 rounded-full"
                style={{
                  backgroundColor: selectedCategory === cat.key ? colors.sage : "white",
                }}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={selectedCategory === cat.key ? "white" : colors.slate}
                />
                <Text
                  className="ml-1.5 font-medium"
                  style={{
                    color: selectedCategory === cat.key ? "white" : colors.slate,
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Activity List */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Ionicons name="notifications-off-outline" size={48} color="#94a3b8" />
            <Text className="text-slate-500 mt-3">No activity yet</Text>
            <Text className="text-sm text-slate-400 mt-1">
              Activity from your family file will appear here
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator size="small" color={colors.sage} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

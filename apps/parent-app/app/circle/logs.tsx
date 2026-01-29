/**
 * Communication Logs Screen
 * Parents can monitor all communication between children and circle contacts
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import type { CommunicationLog } from "@commonground/api-client/src/api/parent/myCircle";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

type FilterType = "all" | "flagged" | "calls" | "chat";

export default function CommunicationLogsScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const familyFileId = familyFile?.id || null;

  const fetchLogs = useCallback(async () => {
    if (!familyFileId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await parent.myCircle.getCommunicationLogs(familyFileId);
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      // Demo data
      setLogs([
        {
          id: "1",
          family_file_id: familyFileId,
          child_id: "child-1",
          contact_type: "circle",
          contact_id: "contact-1",
          contact_name: "Grandma Rose",
          communication_type: "video",
          started_at: new Date(Date.now() - 3600000).toISOString(),
          ended_at: new Date(Date.now() - 1800000).toISOString(),
          duration_seconds: 1800,
          duration_display: "30 min 0 sec",
          total_messages: 0,
          flagged_messages: 0,
          has_flags: false,
        },
        {
          id: "2",
          family_file_id: familyFileId,
          child_id: "child-1",
          contact_type: "circle",
          contact_id: "contact-1",
          contact_name: "Grandma Rose",
          communication_type: "chat",
          started_at: new Date(Date.now() - 86400000).toISOString(),
          ended_at: new Date(Date.now() - 85000000).toISOString(),
          duration_seconds: 1400,
          total_messages: 15,
          flagged_messages: 1,
          has_flags: true,
          aria_flags: {
            mild_concern: ["Message contained sensitive topic"],
          },
        },
        {
          id: "3",
          family_file_id: familyFileId,
          child_id: "child-2",
          contact_type: "circle",
          contact_id: "contact-2",
          contact_name: "Uncle Mike",
          communication_type: "video",
          started_at: new Date(Date.now() - 172800000).toISOString(),
          ended_at: new Date(Date.now() - 171000000).toISOString(),
          duration_seconds: 1800,
          duration_display: "30 min",
          total_messages: 0,
          flagged_messages: 0,
          has_flags: false,
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const filteredLogs = logs.filter((log) => {
    switch (filter) {
      case "flagged":
        return log.has_flags;
      case "calls":
        return log.communication_type === "video" || log.communication_type === "voice";
      case "chat":
        return log.communication_type === "chat";
      default:
        return true;
    }
  });

  const flaggedCount = logs.filter((l) => l.has_flags).length;

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return "videocam";
      case "voice":
        return "call";
      case "chat":
        return "chatbubble";
      case "theater":
        return "tv";
      default:
        return "help";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "#2563eb";
      case "voice":
        return "#16a34a";
      case "chat":
        return "#9333ea";
      case "theater":
        return "#f97316";
      default:
        return "#64748b";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Communication Logs" }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Alert Banner for Flagged Content */}
        {flaggedCount > 0 && (
          <TouchableOpacity
            className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex-row items-center"
            onPress={() => setFilter("flagged")}
          >
            <View className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-full items-center justify-center">
              <Ionicons name="warning" size={20} color="#dc2626" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-red-700 dark:text-red-300 font-bold">
                {flaggedCount} Flagged Communication{flaggedCount > 1 ? "s" : ""}
              </Text>
              <Text className="text-red-600 dark:text-red-400 text-sm">
                ARIA detected content that may need your review
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#dc2626" />
          </TouchableOpacity>
        )}

        {/* Filter Tabs */}
        <View className="px-6 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: "all", label: "All", icon: "list" },
              { id: "flagged", label: "Flagged", icon: "flag" },
              { id: "calls", label: "Calls", icon: "videocam" },
              { id: "chat", label: "Chat", icon: "chatbubble" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className={`mr-2 px-4 py-2 rounded-full flex-row items-center ${
                  filter === tab.id
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setFilter(tab.id as FilterType)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={filter === tab.id ? "white" : "#64748b"}
                />
                <Text
                  className={`ml-2 font-medium ${
                    filter === tab.id
                      ? "text-white"
                      : "text-secondary-700 dark:text-secondary-300"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Logs List */}
        <View className="px-6 mt-4">
          {filteredLogs.length === 0 ? (
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-8 items-center">
              <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
              <Text className="text-secondary-500 mt-4 text-center">
                No communication logs found
              </Text>
            </View>
          ) : (
            <View className="bg-white dark:bg-secondary-800 rounded-xl overflow-hidden">
              {filteredLogs.map((log, index) => (
                <TouchableOpacity
                  key={log.id}
                  className={`flex-row items-center px-4 py-4 ${
                    index < filteredLogs.length - 1
                      ? "border-b border-secondary-100 dark:border-secondary-700"
                      : ""
                  }`}
                >
                  {/* Type Icon */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${getTypeColor(log.communication_type)}20` }}
                  >
                    <Ionicons
                      name={getTypeIcon(log.communication_type) as any}
                      size={24}
                      color={getTypeColor(log.communication_type)}
                    />
                  </View>

                  {/* Details */}
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className="text-secondary-900 dark:text-white font-semibold">
                        {log.contact_name}
                      </Text>
                      {log.has_flags && (
                        <View className="ml-2 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                          <Text className="text-red-600 dark:text-red-400 text-xs font-medium">
                            Flagged
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-secondary-500 dark:text-secondary-400 text-sm capitalize">
                      {log.communication_type}
                      {log.duration_display && ` • ${log.duration_display}`}
                      {log.total_messages > 0 && ` • ${log.total_messages} messages`}
                    </Text>
                    <Text className="text-secondary-400 dark:text-secondary-500 text-xs mt-1">
                      {formatTime(log.started_at)}
                    </Text>
                  </View>

                  {/* Expand/View Details */}
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ARIA Monitoring Info */}
        <View className="mx-6 mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex-row">
          <Ionicons name="sparkles" size={24} color="#9333ea" />
          <View className="flex-1 ml-3">
            <Text className="text-purple-700 dark:text-purple-300 font-medium">
              ARIA Content Monitoring
            </Text>
            <Text className="text-purple-600 dark:text-purple-400 text-sm mt-1">
              All chat messages are automatically analyzed for inappropriate content,
              cyberbullying, and safety concerns.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

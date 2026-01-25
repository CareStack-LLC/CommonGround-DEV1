import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useMessages } from "@/hooks/useMessages";

export default function MessagesScreen() {
  const { messages, isLoading, refresh } = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900" edges={["top"]}>
      {/* Search Bar */}
      <View className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-800">
        <View className="flex-row items-center bg-secondary-100 dark:bg-secondary-800 rounded-lg px-4 py-2">
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-secondary-900 dark:text-white"
            placeholder="Search messages..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageItem message={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={64} color="#94a3b8" />
            <Text className="text-secondary-500 dark:text-secondary-400 mt-4 text-lg">
              No messages yet
            </Text>
            <Text className="text-secondary-400 dark:text-secondary-500 mt-2 text-center px-8">
              Start a conversation with your co-parent
            </Text>
          </View>
        }
      />

      {/* Compose Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push("/messages/compose")}
      >
        <Ionicons name="create" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  is_read: boolean;
}

function MessageItem({ message }: { message: Message }) {
  const timeAgo = getTimeAgo(new Date(message.created_at));

  return (
    <TouchableOpacity
      className={`px-4 py-4 border-b border-secondary-100 dark:border-secondary-800 ${
        !message.is_read ? "bg-primary-50 dark:bg-primary-900/10" : ""
      }`}
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 bg-secondary-200 dark:bg-secondary-700 rounded-full items-center justify-center">
          <Text className="text-secondary-600 dark:text-secondary-300 font-bold text-lg">
            {message.sender_name.charAt(0)}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-secondary-900 dark:text-white font-semibold">
              {message.sender_name}
            </Text>
            <Text className="text-secondary-400 text-xs">{timeAgo}</Text>
          </View>
          <Text
            className="text-secondary-600 dark:text-secondary-400 mt-1"
            numberOfLines={2}
          >
            {message.content}
          </Text>
        </View>
        {!message.is_read && (
          <View className="w-2 h-2 bg-primary-600 rounded-full ml-2 mt-2" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

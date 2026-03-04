/**
 * Chat Conversations Screen
 *
 * List of chat conversations with parents and circle contacts.
 * Child-friendly UI with large touch targets and emoji indicators.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { child, type ChatConversation } from "@commonground/api-client";

// Demo conversations for testing
const DEMO_CONVERSATIONS: ChatConversation[] = [
  {
    id: "1",
    contact_id: "parent-1",
    contact_type: "parent",
    contact_name: "Mom",
    contact_avatar_url: undefined,
    last_message: {
      id: "m1",
      session_id: "",
      sender_id: "parent-1",
      sender_type: "parent",
      sender_name: "Mom",
      content: "Have a great day at school! Love you!",
      message_type: "text",
      aria_analyzed: true,
      aria_flagged: false,
      is_delivered: true,
      is_read: true,
      sent_at: new Date(Date.now() - 3600000).toISOString(),
    },
    unread_count: 0,
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "2",
    contact_id: "parent-2",
    contact_type: "parent",
    contact_name: "Dad",
    contact_avatar_url: undefined,
    last_message: {
      id: "m2",
      session_id: "",
      sender_id: "parent-2",
      sender_type: "parent",
      sender_name: "Dad",
      content: "Can't wait to see you this weekend!",
      message_type: "text",
      aria_analyzed: true,
      aria_flagged: false,
      is_delivered: true,
      is_read: false,
      sent_at: new Date(Date.now() - 7200000).toISOString(),
    },
    unread_count: 2,
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "3",
    contact_id: "circle-1",
    contact_type: "circle_contact",
    contact_name: "Grandma",
    contact_avatar_url: undefined,
    last_message: {
      id: "m3",
      session_id: "",
      sender_id: "child-1",
      sender_type: "child",
      sender_name: "You",
      content: "I love you Grandma!",
      message_type: "sticker",
      sticker_id: "heart-1",
      aria_analyzed: false,
      aria_flagged: false,
      is_delivered: true,
      is_read: true,
      sent_at: new Date(Date.now() - 86400000).toISOString(),
    },
    unread_count: 0,
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

function getContactEmoji(contactType: string, name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("mom") || lowerName.includes("mother")) return "👩";
  if (lowerName.includes("dad") || lowerName.includes("father")) return "👨";
  if (lowerName.includes("grandma") || lowerName.includes("grandmother"))
    return "👵";
  if (lowerName.includes("grandpa") || lowerName.includes("grandfather"))
    return "👴";
  if (lowerName.includes("aunt")) return "👩‍🦰";
  if (lowerName.includes("uncle")) return "👨‍🦰";
  if (contactType === "parent") return "👤";
  return "😊";
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return minutes <= 1 ? "Just now" : `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? "Yesterday" : `${days} days ago`;
  }

  // Older
  return date.toLocaleDateString();
}

export default function ChatConversationsScreen() {
  const [conversations, setConversations] =
    useState<ChatConversation[]>(DEMO_CONVERSATIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await child.kidcoms.getConversations();
      setConversations(response.items);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      // Use demo data
      setConversations(DEMO_CONVERSATIONS);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleConversationPress = (conversation: ChatConversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/chat/[contactId]",
      params: {
        contactId: conversation.contact_id,
        contactName: conversation.contact_name,
        contactType: conversation.contact_type,
      },
    });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <LinearGradient
      colors={["#3b82f6", "#60a5fa", "#93c5fd"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text className="text-4xl font-bold text-white text-center">
                Chat 💬
              </Text>
            </View>

            {totalUnread > 0 && (
              <View className="bg-red-500 rounded-full px-3 py-1">
                <Text className="text-white font-bold">{totalUnread}</Text>
              </View>
            )}
          </View>

          <Text className="text-lg text-blue-200 text-center mt-1">
            Talk to your family!
          </Text>
        </View>

        {/* Conversations List */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
            />
          }
        >
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="white" />
              <Text className="text-white text-lg mt-4">
                Loading messages...
              </Text>
            </View>
          ) : conversations.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">💬</Text>
              <Text className="text-white text-xl text-center">
                No conversations yet!
              </Text>
              <Text className="text-blue-200 text-center mt-2">
                Ask a parent to start a chat
              </Text>
            </View>
          ) : (
            conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-lg"
                onPress={() => handleConversationPress(conversation)}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center">
                    {conversation.contact_avatar_url ? (
                      <Image
                        source={{ uri: conversation.contact_avatar_url }}
                        className="w-14 h-14 rounded-full"
                      />
                    ) : (
                      <Text className="text-4xl">
                        {getContactEmoji(
                          conversation.contact_type,
                          conversation.contact_name
                        )}
                      </Text>
                    )}
                  </View>

                  {/* Content */}
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-bold text-gray-800">
                        {conversation.contact_name}
                      </Text>
                      {conversation.last_message && (
                        <Text className="text-sm text-gray-400">
                          {formatTime(conversation.last_message.sent_at)}
                        </Text>
                      )}
                    </View>

                    {conversation.last_message && (
                      <View className="flex-row items-center mt-1">
                        {conversation.last_message.message_type === "sticker" ? (
                          <Text className="text-gray-500 flex-1">
                            🎨 Sticker
                          </Text>
                        ) : (
                          <Text
                            className={`flex-1 ${
                              conversation.unread_count > 0
                                ? "text-gray-800 font-semibold"
                                : "text-gray-500"
                            }`}
                            numberOfLines={1}
                          >
                            {conversation.last_message.sender_type === "child"
                              ? "You: "
                              : ""}
                            {conversation.last_message.content}
                          </Text>
                        )}

                        {/* Unread badge */}
                        {conversation.unread_count > 0 && (
                          <View className="bg-blue-500 rounded-full min-w-[24px] h-6 px-2 items-center justify-center ml-2">
                            <Text className="text-white text-xs font-bold">
                              {conversation.unread_count}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Arrow */}
                  <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

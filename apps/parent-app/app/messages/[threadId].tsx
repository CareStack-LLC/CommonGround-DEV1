/**
 * Message Thread View
 *
 * Shows conversation between co-parents with:
 * - Real-time message display
 * - ARIA analysis indicators on flagged messages
 * - Pull to refresh
 * - Reply functionality
 */

import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  parent,
  type Message,
  type ARIAAnalysis,
  type ToxicityLevel,
} from "@commonground/api-client";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useAuth } from "@/providers/AuthProvider";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { familyFile, coParent } = useFamilyFile();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [analysis, setAnalysis] = useState<ARIAAnalysis | null>(null);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!familyFile?.id) return;

    try {
      setIsLoading(true);
      const response = await parent.messages.getMessages(familyFile.id, {
        thread_id: threadId,
        limit: 50,
      });
      // Reverse to show oldest first (chat style)
      setMessages(response.messages.reverse());
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [familyFile?.id, threadId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Analyze reply as user types
  useEffect(() => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    if (replyContent.length >= 10) {
      analyzeTimeoutRef.current = setTimeout(async () => {
        setIsAnalyzing(true);
        try {
          const result = await parent.messages.analyzeMessage(replyContent);
          setAnalysis(result);
        } catch (err) {
          console.error("ARIA analysis failed:", err);
        } finally {
          setIsAnalyzing(false);
        }
      }, 800);
    } else {
      setAnalysis(null);
    }

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [replyContent]);

  const handleSend = async () => {
    if (!replyContent.trim() || !familyFile?.id || !coParent?.id) return;

    // Check if blocked
    if (analysis?.block_send) {
      Alert.alert(
        "Message Blocked",
        "Please revise your message before sending.",
        [{ text: "OK" }]
      );
      return;
    }

    // Warn for high toxicity
    if (analysis && (analysis.toxicity_level === "high" || analysis.toxicity_level === "severe")) {
      Alert.alert(
        "Are you sure?",
        "ARIA has detected concerning language. Consider revising.\n\n" +
          (analysis.suggestion || ""),
        [
          { text: "Revise", style: "cancel" },
          { text: "Send Anyway", style: "destructive", onPress: sendMessage },
        ]
      );
      return;
    }

    await sendMessage();
  };

  const sendMessage = async () => {
    if (!familyFile?.id || !coParent?.id) return;

    setIsSending(true);
    try {
      const response = await parent.messages.sendMessage(familyFile.id, {
        recipient_id: coParent.id,
        content: replyContent.trim(),
        thread_id: threadId,
      });

      // Add new message to list
      setMessages((prev) => [...prev, response.message]);
      setReplyContent("");
      setAnalysis(null);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getToxicityColor = (level: ToxicityLevel) => {
    switch (level) {
      case "high":
      case "severe":
        return "bg-red-100 border-red-300";
      case "medium":
        return "bg-orange-100 border-orange-300";
      case "low":
        return "bg-yellow-100 border-yellow-300";
      default:
        return "";
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const isFlagged = item.is_flagged && item.toxicity_level && item.toxicity_level !== "none";

    return (
      <View
        className={`px-4 py-2 ${isOwnMessage ? "items-end" : "items-start"}`}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
            isOwnMessage
              ? "bg-primary-600 rounded-br-sm"
              : "bg-secondary-100 dark:bg-secondary-800 rounded-bl-sm"
          } ${isFlagged ? getToxicityColor(item.toxicity_level!) : ""}`}
        >
          {/* ARIA Flag Indicator */}
          {isFlagged && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="warning" size={12} color="#dc2626" />
              <Text className="text-red-600 text-xs ml-1">
                ARIA flagged
              </Text>
            </View>
          )}

          <Text
            className={`${
              isOwnMessage
                ? "text-white"
                : "text-secondary-900 dark:text-white"
            }`}
          >
            {item.content}
          </Text>

          <Text
            className={`text-xs mt-1 ${
              isOwnMessage
                ? "text-primary-200"
                : "text-secondary-400 dark:text-secondary-500"
            }`}
          >
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isOwnMessage && item.is_read && " · Read"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900" edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: coParent?.first_name || "Conversation",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/messages/compose")}
              className="mr-2"
            >
              <Ionicons name="create-outline" size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={90}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 16 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="chatbubble-outline" size={48} color="#94a3b8" />
                <Text className="text-secondary-500 mt-4">
                  No messages yet
                </Text>
                <Text className="text-secondary-400 text-sm mt-1">
                  Start the conversation below
                </Text>
              </View>
            }
          />
        )}

        {/* ARIA Analysis Indicator */}
        {(isAnalyzing || analysis) && (
          <View className="px-4 py-2 border-t border-secondary-100 dark:border-secondary-800">
            {isAnalyzing ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="text-secondary-500 text-sm ml-2">
                  ARIA is analyzing...
                </Text>
              </View>
            ) : analysis && analysis.toxicity_level !== "none" ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="warning"
                  size={16}
                  color={
                    analysis.toxicity_level === "high" ||
                    analysis.toxicity_level === "severe"
                      ? "#dc2626"
                      : "#f59e0b"
                  }
                />
                <Text
                  className={`text-sm ml-2 ${
                    analysis.toxicity_level === "high" ||
                    analysis.toxicity_level === "severe"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {analysis.explanation || "Consider revising your message"}
                </Text>
              </View>
            ) : analysis ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text className="text-green-600 text-sm ml-2">
                  Message looks good
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Reply Input */}
        <View className="px-4 py-3 border-t border-secondary-100 dark:border-secondary-800 bg-white dark:bg-secondary-900">
          <View className="flex-row items-end">
            <View className="flex-1 bg-secondary-100 dark:bg-secondary-800 rounded-2xl px-4 py-2 mr-2">
              <TextInput
                className="text-secondary-900 dark:text-white max-h-24"
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                multiline
                value={replyContent}
                onChangeText={setReplyContent}
              />
            </View>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!replyContent.trim() || isSending || analysis?.block_send}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                replyContent.trim() && !analysis?.block_send
                  ? "bg-primary-600"
                  : "bg-secondary-300 dark:bg-secondary-700"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

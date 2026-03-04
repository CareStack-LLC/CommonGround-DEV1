import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  slateDark: "#334155",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedData {
  title?: string;
  purpose_category?: string;
  purpose_description?: string;
  is_single_event?: boolean;
  event_date?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  pickup_responsibility?: string;
  dropoff_responsibility?: string;
  transportation_notes?: string;
  has_shared_expense?: boolean;
  estimated_amount?: number;
  expense_category?: string;
}

const CATEGORIES = [
  { id: "travel", label: "Travel", icon: "airplane", description: "Trips, vacations, out-of-town visits" },
  { id: "schedule_swap", label: "Schedule Swap", icon: "swap-horizontal", description: "Trade custody days or times" },
  { id: "special_event", label: "Special Event", icon: "star", description: "Birthdays, recitals, sports events" },
  { id: "overnight", label: "Overnight", icon: "moon", description: "One-off overnight arrangements" },
  { id: "expense", label: "Expense", icon: "wallet", description: "Shared expense agreements" },
  { id: "other", label: "Other", icon: "document-text", description: "Any other arrangement" },
];

export default function CreateQuickAccordScreen() {
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const { token, user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<"category" | "chat">("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isReadyToCreate, setIsReadyToCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Start ARIA conversation when category is selected
  const startConversation = async (category: string) => {
    setSelectedCategory(category);
    setStep("chat");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/aria/start/${familyId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purpose_category: category,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation_id);
        setMessages([{ role: "assistant", content: data.message }]);
        if (data.extracted_data) {
          setExtractedData(data.extracted_data);
        }
      } else {
        Alert.alert("Error", "Failed to start conversation with ARIA.");
        setStep("category");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      setStep("category");
    } finally {
      setLoading(false);
    }
  };

  // Send message to ARIA
  const sendMessage = async () => {
    if (!inputText.trim() || !conversationId) return;

    const userMessage = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/aria/message/${conversationId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

        if (data.extracted_data) {
          setExtractedData(data.extracted_data);
        }
        if (data.is_ready_to_create !== undefined) {
          setIsReadyToCreate(data.is_ready_to_create);
        }

        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert("Error", "Failed to send message.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setSending(false);
    }
  };

  // Create Quick Accord from conversation
  const createAccord = async () => {
    if (!conversationId) return;

    setCreating(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/aria/create/${conversationId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          "Quick Accord Created",
          "Your Quick Accord has been created and is ready for review.",
          [
            {
              text: "View Accord",
              onPress: () => router.replace(`/accords/${data.id}?familyId=${familyId}`),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to create Quick Accord.");
      }
    } catch (error) {
      console.error("Error creating accord:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Category Selection Screen
  if (step === "category") {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <View className="mb-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: colors.slate }}>
              What type of arrangement?
            </Text>
            <Text style={{ color: colors.slate }}>
              Select a category and ARIA will help you create a Quick Accord.
            </Text>
          </View>

          <View className="space-y-3">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className="rounded-xl p-4 flex-row items-center"
                style={{ backgroundColor: "white" }}
                onPress={() => startConversation(cat.id)}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${colors.sage}20` }}
                >
                  <Ionicons name={cat.icon as any} size={24} color={colors.sage} />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="font-semibold text-lg" style={{ color: colors.slate }}>
                    {cat.label}
                  </Text>
                  <Text className="text-sm" style={{ color: colors.slate }}>
                    {cat.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.slate} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Chat Screen
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Extracted Data Preview */}
        {extractedData && Object.keys(extractedData).length > 0 && (
          <View
            className="px-4 py-3 border-b"
            style={{ backgroundColor: `${colors.sage}10`, borderBottomColor: colors.sand }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-text" size={16} color={colors.sage} />
                <Text className="ml-2 font-medium text-sm" style={{ color: colors.sage }}>
                  {extractedData.title || "Quick Accord"}
                </Text>
              </View>
              {isReadyToCreate && (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
                  <Text className="ml-1 text-xs font-medium" style={{ color: colors.sage }}>
                    Ready
                  </Text>
                </View>
              )}
            </View>
            {extractedData.event_date && (
              <Text className="text-xs mt-1" style={{ color: colors.slate }}>
                Date: {extractedData.event_date}
              </Text>
            )}
            {extractedData.start_date && extractedData.end_date && (
              <Text className="text-xs mt-1" style={{ color: colors.slate }}>
                {extractedData.start_date} - {extractedData.end_date}
              </Text>
            )}
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
        >
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.sage} />
              <Text className="mt-4" style={{ color: colors.slate }}>
                Starting conversation with ARIA...
              </Text>
            </View>
          ) : (
            <>
              {/* ARIA Introduction */}
              <View className="items-center mb-6">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: colors.sage }}
                >
                  <Text className="text-white text-2xl font-bold">A</Text>
                </View>
                <Text className="font-semibold" style={{ color: colors.slate }}>
                  ARIA
                </Text>
                <Text className="text-xs" style={{ color: colors.slate }}>
                  Your co-parenting assistant
                </Text>
              </View>

              {/* Message Bubbles */}
              {messages.map((msg, index) => (
                <View
                  key={index}
                  className={`mb-3 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <View
                    className="rounded-2xl px-4 py-3 max-w-[85%]"
                    style={{
                      backgroundColor: msg.role === "user" ? colors.sage : "white",
                      borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                      borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                    }}
                  >
                    <Text
                      style={{ color: msg.role === "user" ? "white" : colors.slate }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <View className="items-start mb-3">
                  <View
                    className="rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "white" }}
                  >
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-gray-400 mr-1 animate-pulse" />
                      <View className="w-2 h-2 rounded-full bg-gray-400 mr-1 animate-pulse" />
                      <View className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Create Button */}
        {isReadyToCreate && (
          <View className="px-4 py-2">
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.sage }}
              onPress={createAccord}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Create Quick Accord
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View
          className="flex-row items-end px-4 py-3 border-t"
          style={{ backgroundColor: "white", borderTopColor: colors.sand }}
        >
          <TextInput
            className="flex-1 rounded-2xl px-4 py-3 mr-2"
            style={{ backgroundColor: colors.sand, color: colors.slate, maxHeight: 100 }}
            placeholder="Type your message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading && !sending}
          />
          <TouchableOpacity
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: inputText.trim() ? colors.sage : colors.sand }}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading || sending}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "white" : colors.slate}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

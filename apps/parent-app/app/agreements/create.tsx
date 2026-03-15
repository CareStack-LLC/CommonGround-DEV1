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
import { useTheme } from "@/theme";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AGREEMENT_TYPES = [
  {
    id: "v2_standard",
    title: "Standard Agreement",
    description: "Comprehensive 7-section agreement covering all aspects of co-parenting",
    icon: "document-text",
    sections: 7,
  },
  {
    id: "v2_lite",
    title: "Lite Agreement",
    description: "Simplified 5-section agreement for low-conflict situations",
    icon: "document",
    sections: 5,
  },
];

export default function CreateAgreementScreen() {
  const { colors } = useTheme();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const { token } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<"type" | "chat">("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Create agreement and start ARIA conversation
  const startAgreement = async (version: string) => {
    setSelectedType(version);
    setStep("chat");
    setLoading(true);

    try {
      // First create the agreement
      const createResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files/${familyId}/agreements`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreement_version: version,
            title: version === "v2_lite" ? "Lite Parenting Agreement" : "Shared Care Agreement",
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create agreement");
      }

      const agreement = await createResponse.json();
      setAgreementId(agreement.id);

      // Start ARIA conversation
      const ariaResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/${agreement.id}/aria/message`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Hello, I'd like to create a co-parenting agreement.",
          }),
        }
      );

      if (ariaResponse.ok) {
        const data = await ariaResponse.json();
        setMessages([
          { role: "user", content: "Hello, I'd like to create a co-parenting agreement." },
          { role: "assistant", content: data.message || data.response },
        ]);
      } else {
        // Fallback greeting
        setMessages([
          {
            role: "assistant",
            content: "Hello! I'm ARIA, and I'll help you create your co-parenting agreement. Let's start by discussing your custody arrangement. Do you have a specific schedule in mind, or would you like me to suggest some common arrangements?",
          },
        ]);
      }
    } catch (error) {
      console.error("Error starting agreement:", error);
      Alert.alert("Error", "Failed to start agreement. Please try again.");
      setStep("type");
    } finally {
      setLoading(false);
    }
  };

  // Send message to ARIA
  const sendMessage = async () => {
    if (!inputText.trim() || !agreementId) return;

    const userMessage = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/${agreementId}/aria/message`,
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || data.response },
        ]);

        if (data.completion_percentage !== undefined) {
          setCompletionPercentage(data.completion_percentage);
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

  // Finalize agreement from conversation
  const finalizeAgreement = async () => {
    if (!agreementId) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/agreements/${agreementId}/aria/finalize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        Alert.alert(
          "Agreement Created",
          "Your agreement draft has been created from our conversation. You can now review and edit each section.",
          [
            {
              text: "View Agreement",
              onPress: () => router.replace(`/agreements/${agreementId}?familyId=${familyId}`),
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to finalize agreement.");
      }
    } catch (error) {
      console.error("Error finalizing agreement:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
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

  // Type Selection Screen
  if (step === "type") {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <View className="mb-6">
            <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
              Choose Agreement Type
            </Text>
            <Text style={{ color: colors.secondary }}>
              Select the type of agreement that best fits your situation.
              ARIA will guide you through creating it conversationally.
            </Text>
          </View>

          <View className="space-y-4">
            {AGREEMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                className="rounded-xl p-5"
                style={{ backgroundColor: colors.background }}
                onPress={() => startAgreement(type.id)}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <Ionicons name={type.icon as any} size={28} color={colors.primary} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className="font-semibold text-lg mb-1" style={{ color: colors.secondary }}>
                      {type.title}
                    </Text>
                    <Text className="text-sm mb-2" style={{ color: colors.secondary }}>
                      {type.description}
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons name="layers-outline" size={14} color={colors.primary} />
                      <Text className="ml-1 text-xs font-medium" style={{ color: colors.primary }}>
                        {type.sections} sections
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Box */}
          <View className="rounded-xl p-4 mt-6" style={{ backgroundColor: `${colors.accent}20` }}>
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <View className="flex-1 ml-3">
                <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                  How it works
                </Text>
                <Text className="text-sm" style={{ color: colors.secondary }}>
                  ARIA will have a natural conversation with you about your co-parenting
                  arrangement. Based on your discussion, it will automatically populate
                  the agreement sections. You can always edit sections manually afterward.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Chat Screen
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Progress Bar */}
        {completionPercentage > 0 && (
          <View className="px-4 py-2 border-b" style={{ borderBottomColor: colors.backgroundSecondary }}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-medium" style={{ color: colors.secondary }}>
                Agreement Progress
              </Text>
              <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                {completionPercentage}%
              </Text>
            </View>
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.backgroundSecondary }}>
              <View
                className="h-full rounded-full"
                style={{ backgroundColor: colors.primary, width: `${completionPercentage}%` }}
              />
            </View>
          </View>
        )}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
        >
          {loading && messages.length === 0 ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-4" style={{ color: colors.secondary }}>
                Starting conversation with ARIA...
              </Text>
            </View>
          ) : (
            <>
              {/* ARIA Introduction */}
              <View className="items-center mb-6">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-white text-2xl font-bold">A</Text>
                </View>
                <Text className="font-semibold" style={{ color: colors.secondary }}>
                  ARIA
                </Text>
                <Text className="text-xs text-center px-8" style={{ color: colors.secondary }}>
                  I'll help you create your agreement through conversation
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
                      backgroundColor: msg.role === "user" ? colors.primary : "white",
                      borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                      borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
                    }}
                  >
                    <Text style={{ color: msg.role === "user" ? "white" : colors.secondary }}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <View className="items-start mb-3">
                  <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: colors.background }}>
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                      <View className="w-2 h-2 rounded-full bg-gray-400" />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Finalize Button - show after some conversation */}
        {messages.length >= 6 && (
          <View className="px-4 py-2">
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.primary }}
              onPress={finalizeAgreement}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="document-text" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">
                    Create Agreement Draft
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-xs text-center mt-2" style={{ color: colors.secondary }}>
              You can continue chatting or create the draft now
            </Text>
          </View>
        )}

        {/* Input Area */}
        <View
          className="flex-row items-end px-4 py-3 border-t"
          style={{ backgroundColor: colors.background, borderTopColor: colors.backgroundSecondary }}
        >
          <TextInput
            className="flex-1 rounded-2xl px-4 py-3 mr-2"
            style={{ backgroundColor: colors.backgroundSecondary, color: colors.secondary, maxHeight: 100 }}
            placeholder="Describe your situation..."
            placeholderTextColor={colors.inputPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!loading && !sending}
          />
          <TouchableOpacity
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: inputText.trim() ? colors.primary : colors.backgroundSecondary }}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading || sending}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "white" : colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

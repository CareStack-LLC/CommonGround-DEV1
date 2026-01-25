/**
 * Compose Message Screen with ARIA Analysis
 *
 * Features:
 * - Real-time ARIA toxicity analysis as user types
 * - Visual feedback on message tone
 * - Suggested rewrites for high-toxicity messages
 * - Option to modify before sending
 */

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import type { ARIAAnalysis, ToxicityLevel } from "@commonground/api-client/src/api/parent/messages";

export default function ComposeMessageScreen() {
  const { familyFile, coParent } = useFamilyFile();
  const [content, setContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [analysis, setAnalysis] = useState<ARIAAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const analyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced ARIA analysis
  const analyzeMessage = useCallback(async (text: string) => {
    if (!text.trim() || text.length < 10) {
      setAnalysis(null);
      setShowAnalysis(false);
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await parent.messages.analyzeMessage(text);
      setAnalysis(result);
      // Only show analysis panel if there are issues
      if (result.toxicity_level !== 'none' || result.is_flagged) {
        setShowAnalysis(true);
      }
    } catch (err) {
      console.error("ARIA analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Trigger analysis after user stops typing
  useEffect(() => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    if (content.length >= 10) {
      analyzeTimeoutRef.current = setTimeout(() => {
        analyzeMessage(content);
      }, 800); // Wait 800ms after user stops typing
    } else {
      setAnalysis(null);
      setShowAnalysis(false);
    }

    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current);
      }
    };
  }, [content, analyzeMessage]);

  const handleSend = async () => {
    if (!content.trim() || !familyFile?.id || !coParent?.id) return;

    // Check if message would be blocked
    if (analysis?.block_send) {
      Alert.alert(
        "Message Blocked",
        "This message contains content that violates our communication guidelines. Please revise your message before sending.",
        [{ text: "OK" }]
      );
      return;
    }

    // Warn for high toxicity but allow sending
    if (analysis && (analysis.toxicity_level === 'high' || analysis.toxicity_level === 'severe')) {
      Alert.alert(
        "Are you sure?",
        "ARIA has detected concerning language in your message. Consider revising it to maintain a constructive tone.\n\n" +
          (analysis.suggestion || "Try to focus on the children's needs."),
        [
          { text: "Revise", style: "cancel" },
          {
            text: "Send Anyway",
            style: "destructive",
            onPress: sendMessage,
          },
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
      await parent.messages.sendMessage(familyFile.id, {
        recipient_id: coParent.id,
        content: content.trim(),
      });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleUseSuggestion = () => {
    if (analysis?.suggestion) {
      setContent(analysis.suggestion);
      setShowAnalysis(false);
      setAnalysis(null);
    }
  };

  const getToxicityColor = (level: ToxicityLevel) => {
    switch (level) {
      case 'none':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: '#16a34a' };
      case 'low':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: '#ca8a04' };
      case 'medium':
        return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: '#ea580c' };
      case 'high':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: '#dc2626' };
      case 'severe':
        return { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', icon: '#991b1b' };
      default:
        return { bg: 'bg-secondary-100 dark:bg-secondary-800', text: 'text-secondary-700 dark:text-secondary-300', icon: '#64748b' };
    }
  };

  const getToxicityLabel = (level: ToxicityLevel) => {
    switch (level) {
      case 'none':
        return 'Positive Tone';
      case 'low':
        return 'Slightly Concerning';
      case 'medium':
        return 'Concerning';
      case 'high':
        return 'High Risk';
      case 'severe':
        return 'Blocked';
      default:
        return 'Unknown';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      profanity: 'Profanity',
      insult: 'Insult',
      hostility: 'Hostility',
      sarcasm: 'Sarcasm',
      blame: 'Blame',
      dismissive: 'Dismissive',
      threatening: 'Threatening',
      manipulation: 'Manipulation',
      passive_aggressive: 'Passive-Aggressive',
      all_caps: 'Aggressive Tone (ALL CAPS)',
      custody_weaponization: 'Using Children as Leverage',
      financial_coercion: 'Financial Pressure',
      hate_speech: 'Hate Speech',
      sexual_harassment: 'Harassment',
    };
    return labels[category] || category;
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "New Message",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSend}
              disabled={!content.trim() || isSending || analysis?.block_send}
              className="mr-4"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text
                  className={`font-semibold ${
                    content.trim() && !analysis?.block_send
                      ? "text-primary-600"
                      : "text-secondary-400"
                  }`}
                >
                  Send
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Recipient */}
          <View className="px-4 py-3 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
            <View className="flex-row items-center">
              <Text className="text-secondary-500 dark:text-secondary-400">To:</Text>
              <View className="ml-2 flex-row items-center bg-primary-100 dark:bg-primary-900/30 px-3 py-1 rounded-full">
                <View className="w-6 h-6 bg-primary-600 rounded-full items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {coParent?.first_name?.charAt(0) || "?"}
                  </Text>
                </View>
                <Text className="text-primary-700 dark:text-primary-300 ml-2 font-medium">
                  {coParent?.first_name || "Co-Parent"}
                </Text>
              </View>
            </View>
          </View>

          {/* Message Input */}
          <View className="px-4 py-4 bg-white dark:bg-secondary-800">
            <TextInput
              className="text-secondary-900 dark:text-white text-base min-h-[150px]"
              placeholder="Write your message..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
              autoFocus
            />
          </View>

          {/* ARIA Analysis Indicator */}
          {isAnalyzing && (
            <View className="px-4 py-2 flex-row items-center">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-secondary-500 text-sm ml-2">ARIA is analyzing...</Text>
            </View>
          )}

          {/* ARIA Analysis Results */}
          {showAnalysis && analysis && (
            <View className="px-4 py-4">
              <View className={`rounded-xl p-4 ${getToxicityColor(analysis.toxicity_level).bg}`}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons
                      name={analysis.toxicity_level === 'none' ? 'checkmark-circle' : 'warning'}
                      size={20}
                      color={getToxicityColor(analysis.toxicity_level).icon}
                    />
                    <Text className={`ml-2 font-semibold ${getToxicityColor(analysis.toxicity_level).text}`}>
                      {getToxicityLabel(analysis.toxicity_level)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowAnalysis(false)}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Explanation */}
                {analysis.explanation && (
                  <Text className="text-secondary-700 dark:text-secondary-300 text-sm mb-3">
                    {analysis.explanation}
                  </Text>
                )}

                {/* Categories */}
                {analysis.categories.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {analysis.categories.map((category) => (
                      <View
                        key={category}
                        className="bg-white/50 dark:bg-black/20 px-2 py-1 rounded"
                      >
                        <Text className="text-xs text-secondary-600 dark:text-secondary-400">
                          {getCategoryLabel(category)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Triggers */}
                {analysis.triggers.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                      Concerning phrases:
                    </Text>
                    <Text className="text-sm text-secondary-700 dark:text-secondary-300 italic">
                      "{analysis.triggers.join('", "')}"
                    </Text>
                  </View>
                )}

                {/* Suggestion */}
                {analysis.suggestion && (
                  <View className="bg-white dark:bg-secondary-800 rounded-lg p-3 mt-2">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="bulb" size={16} color="#2563eb" />
                      <Text className="text-primary-600 font-medium ml-1 text-sm">
                        Suggested Alternative
                      </Text>
                    </View>
                    <Text className="text-secondary-700 dark:text-secondary-300 text-sm mb-3">
                      {analysis.suggestion}
                    </Text>
                    <TouchableOpacity
                      className="bg-primary-600 py-2 rounded-lg items-center"
                      onPress={handleUseSuggestion}
                    >
                      <Text className="text-white font-medium">Use This Instead</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Block Warning */}
                {analysis.block_send && (
                  <View className="bg-red-600 dark:bg-red-700 rounded-lg p-3 mt-3">
                    <View className="flex-row items-center">
                      <Ionicons name="hand-left" size={20} color="#ffffff" />
                      <Text className="text-white font-semibold ml-2">
                        Message Cannot Be Sent
                      </Text>
                    </View>
                    <Text className="text-red-100 text-sm mt-1">
                      Please revise your message to remove inappropriate content.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ARIA Info */}
          <View className="px-4 py-4">
            <View className="flex-row items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Ionicons name="sparkles" size={20} color="#2563eb" />
              <View className="flex-1 ml-2">
                <Text className="text-blue-700 dark:text-blue-300 font-medium">
                  ARIA Communication Assistant
                </Text>
                <Text className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                  ARIA analyzes your messages to help maintain constructive communication.
                  This keeps your conversation focused on what matters most - your children.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

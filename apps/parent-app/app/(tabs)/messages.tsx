/**
 * Messages Screen - Matches Web Portal Design
 * Real-time messaging with Supabase, ARIA integration, and attachment support
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useAuth } from "@/providers/AuthProvider";
import {
  createFamilyFileChannel,
  subscribeToMessages,
  setupTypingBroadcast,
  sendTypingIndicator,
  fetchMessagesForFamilyFile,
  fetchUserById,
  type MessageRow,
  type TypingPayload,
} from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Design System Colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";

const TOKEN_KEY = "auth_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

// ARIA intervention action types
type ARIAAction = "accepted" | "modified" | "rejected" | "sent_anyway" | "cancelled";

interface Message {
  id: string;
  family_file_id: string;
  sender_id: string;
  sender_name?: string;
  recipient_id: string;
  content: string;
  sent_at: string;
  read_at?: string | null;
  acknowledged_at?: string | null;
  is_flagged?: boolean;
  toxicity_level?: string;
  has_attachments?: boolean;
  attachment_urls?: string[];
}

interface ARIAAnalysis {
  toxicity_level: "none" | "low" | "medium" | "high" | "severe";
  toxicity_score: number;
  is_flagged: boolean;
  suggestion?: string;
  explanation?: string;
  block_send?: boolean;
}

export default function MessagesScreen() {
  const { familyFile } = useFamilyFile();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [analysis, setAnalysis] = useState<ARIAAnalysis | null>(null);
  const [pendingAction, setPendingAction] = useState<ARIAAction | null>(null); // Track what user did with ARIA suggestion
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [coParentId, setCoParentId] = useState<string | null>(null);
  const [coParentName, setCoParentName] = useState<string>("Co-parent");
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine co-parent ID from family file
  useEffect(() => {
    if (!familyFile || !user?.id) return;

    // Get the family file with parent IDs (they come as parent_a_id and parent_b_id)
    const ff = familyFile as any; // Type assertion for dynamic properties
    const parentAId = ff.parent_a_id;
    const parentBId = ff.parent_b_id;

    console.log("[Messages] Family file:", ff.id, "Parent A:", parentAId, "Parent B:", parentBId, "Current user:", user.id);

    // Determine which parent is the co-parent
    let otherParentId: string | null = null;
    if (parentAId && parentBId) {
      otherParentId = user.id === parentAId ? parentBId : parentAId;
    } else if (parentAId && user.id !== parentAId) {
      otherParentId = parentAId;
    } else if (parentBId && user.id !== parentBId) {
      otherParentId = parentBId;
    }

    console.log("[Messages] Co-parent ID determined:", otherParentId);
    setCoParentId(otherParentId);

    // Fetch co-parent name
    if (otherParentId) {
      fetchUserById(otherParentId).then((userData) => {
        if (userData) {
          setCoParentName(userData.first_name || "Co-parent");
          console.log("[Messages] Co-parent name:", userData.first_name);
        }
      });
    }
  }, [familyFile, user?.id]);

  // Fetch messages using REST API
  const fetchMessages = useCallback(async () => {
    if (!familyFile?.id) return;

    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        console.log("[Messages] No token available");
        return;
      }

      console.log("[Messages] Fetching messages for family file:", familyFile.id);

      const response = await fetch(
        `${API_URL}/api/v1/messages/family-file/${familyFile.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json() as Message[];
        console.log("[Messages] Fetched", data.length, "messages from API");
        setMessages(data);
      } else {
        const errorData = await response.json() as { detail?: string };
        console.error("[Messages] API error:", errorData.detail);
      }
    } catch (err) {
      console.error("[Messages] Failed to load messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [familyFile?.id]);

  // Set up Supabase real-time
  useEffect(() => {
    if (!familyFile?.id || !user?.id) return;

    const channel = createFamilyFileChannel(familyFile.id, user.id);
    channelRef.current = channel;

    // Subscribe to new messages
    subscribeToMessages(
      channel,
      familyFile.id,
      (newMessage: MessageRow) => {
        console.log("[Messages] New message received:", newMessage.id);
        setMessages((prev) => {
          // Check if message already exists
          if (prev.find((m) => m.id === newMessage.id)) return prev;
          return [...prev, mapMessageRow(newMessage)];
        });
        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (updatedMessage: MessageRow) => {
        console.log("[Messages] Message updated:", updatedMessage.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMessage.id ? mapMessageRow(updatedMessage) : m
          )
        );
      }
    );

    // Subscribe to typing indicators
    setupTypingBroadcast(channel, (payload: TypingPayload) => {
      if (payload.user_id !== user.id) {
        setOtherUserTyping(payload.is_typing);
      }
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log("[Messages] Supabase channel status:", status);
    });

    return () => {
      console.log("[Messages] Cleaning up Supabase channel");
      channel.unsubscribe();
    };
  }, [familyFile?.id, user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages.length]);

  // Analyze message as user types (debounced)
  useEffect(() => {
    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current);
    }

    if (messageText.length >= 10) {
      analyzeTimeoutRef.current = setTimeout(async () => {
        setIsAnalyzing(true);
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (!token) return;

          const response = await fetch(`${API_URL}/api/v1/messages/analyze`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: messageText }),
          });

          if (response.ok) {
            const result = await response.json() as ARIAAnalysis;
            setAnalysis(result);
            // Reset pending action when new analysis arrives (user is typing new content)
            if (pendingAction === "accepted" && messageText !== result.suggestion) {
              // User modified the suggestion they accepted
              setPendingAction("modified");
            }
          } else {
            // Show analysis error but allow message send
            console.error("ARIA analysis returned error");
            setAnalysis(null);
          }
        } catch (err) {
          console.error("ARIA analysis failed:", err);
          // Don't block sending - just clear analysis
          setAnalysis(null);
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
  }, [messageText]);

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setMessageText(text);

    // Send typing indicator
    if (channelRef.current && familyFile?.id && user?.id) {
      if (!isTyping) {
        setIsTyping(true);
        sendTypingIndicator(channelRef.current, {
          user_id: user.id,
          user_name: user.first_name || "User",
          is_typing: true,
          family_file_id: familyFile.id,
        });
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (channelRef.current && familyFile?.id && user?.id) {
          sendTypingIndicator(channelRef.current, {
            user_id: user.id,
            user_name: user.first_name || "User",
            is_typing: false,
            family_file_id: familyFile.id,
          });
        }
      }, 2000);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!messageText.trim() || !familyFile?.id || !coParentId) return;

    // Check if blocked
    if (analysis?.block_send) {
      Alert.alert(
        "Message Blocked",
        "Please revise your message before sending.",
        [{ text: "OK" }]
      );
      return;
    }

    // Warn for high toxicity (orange/red levels)
    if (analysis && (analysis.toxicity_level === "high" || analysis.toxicity_level === "severe" ||
                     analysis.toxicity_level === "orange" || analysis.toxicity_level === "red")) {
      Alert.alert(
        "Are you sure?",
        "ARIA has detected concerning language. Consider revising.\n\n" +
          (analysis.suggestion || ""),
        [
          { text: "Revise", style: "cancel" },
          {
            text: "Send Anyway",
            style: "destructive",
            onPress: () => sendMessage("sent_anyway"), // Record as sent_anyway
          },
        ]
      );
      return;
    }

    // If there was a suggestion but user didn't explicitly accept it,
    // and they didn't use "Send Anyway", treat as rejected/modified
    if (analysis?.is_flagged && !pendingAction) {
      // User saw suggestion but sent their own version
      setPendingAction("rejected");
    }

    await sendMessage();
  };

  // Record ARIA intervention after message is sent
  const recordIntervention = async (messageId: string, action: ARIAAction, finalMessage?: string) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      await fetch(`${API_URL}/api/v1/messages/${messageId}/intervention`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          final_message: finalMessage,
        }),
      });
      console.log("[Messages] Recorded ARIA intervention:", action);
    } catch (err) {
      console.error("[Messages] Failed to record intervention:", err);
      // Don't fail the send - intervention tracking is secondary
    }
  };

  const sendMessage = async (overrideAction?: ARIAAction) => {
    if (!familyFile?.id || !coParentId) return;

    const actionToRecord = overrideAction || pendingAction;
    setIsSending(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      console.log("[Messages] Sending message to recipient:", coParentId);
      const response = await fetch(`${API_URL}/api/v1/messages/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family_file_id: familyFile.id,
          recipient_id: coParentId,
          content: messageText.trim(),
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json() as { id: string; was_flagged?: boolean };

        // Record ARIA intervention if message was flagged and user took an action
        if (sentMessage.was_flagged && actionToRecord) {
          await recordIntervention(sentMessage.id, actionToRecord, messageText.trim());
        }

        setMessageText("");
        setAnalysis(null);
        setPendingAction(null);
        // Real-time will add the message, but let's also refresh to be safe
        await fetchMessages();
      } else {
        const errorData = await response.json() as { detail?: string };
        Alert.alert("Error", errorData.detail || "Failed to send message");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      Alert.alert("Error", message);
    } finally {
      setIsSending(false);
    }
  };

  // Acknowledge message
  const acknowledgeMessage = async (messageId: string) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      await fetch(`${API_URL}/api/v1/messages/${messageId}/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, acknowledged_at: new Date().toISOString() } : m
        )
      );
    } catch (err) {
      console.error("Failed to acknowledge:", err);
    }
  };

  const mapMessageRow = (row: MessageRow): Message => ({
    id: row.id,
    family_file_id: row.family_file_id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    content: row.content,
    sent_at: row.sent_at,
    read_at: row.read_at,
    acknowledged_at: row.acknowledged_at,
    is_flagged: row.was_flagged,
    has_attachments: row.has_attachments,
    attachment_urls: row.attachment_urls || undefined,
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const showAcknowledge = !isOwnMessage && !item.acknowledged_at;
    const isAcknowledged = !!item.acknowledged_at;

    return (
      <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
        {/* Timestamp */}
        <Text style={{
          textAlign: isOwnMessage ? "right" : "left",
          color: SLATE_LIGHT,
          fontSize: 12,
          marginBottom: 4,
          marginLeft: isOwnMessage ? 0 : 48,
        }}>
          {formatTime(item.sent_at)}
        </Text>

        <View style={{
          flexDirection: "row",
          justifyContent: isOwnMessage ? "flex-end" : "flex-start",
          alignItems: "flex-end",
        }}>
          {/* Avatar for other's messages */}
          {!isOwnMessage && (
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}>
              <Ionicons name="person" size={18} color={SAGE} />
            </View>
          )}

          <View style={{ maxWidth: "75%" }}>
            {/* Message Bubble */}
            <View style={{
              backgroundColor: isOwnMessage ? SAGE : WHITE,
              borderRadius: 16,
              borderBottomRightRadius: isOwnMessage ? 4 : 16,
              borderBottomLeftRadius: isOwnMessage ? 16 : 4,
              padding: 12,
              borderWidth: isOwnMessage ? 0 : 1,
              borderColor: SAND,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
              {/* Attachments */}
              {item.has_attachments && item.attachment_urls && item.attachment_urls.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{
                    color: isOwnMessage ? "rgba(255,255,255,0.8)" : SLATE_LIGHT,
                    fontSize: 12,
                    marginBottom: 4
                  }}>
                    (Attachment)
                  </Text>
                  {item.attachment_urls.map((url, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: url }}
                      style={{
                        width: "100%",
                        height: 200,
                        borderRadius: 8,
                        marginBottom: 4,
                      }}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}

              {/* Message Content */}
              <Text style={{
                color: isOwnMessage ? WHITE : SLATE,
                fontSize: 15,
                lineHeight: 22,
              }}>
                {item.content}
              </Text>
            </View>

            {/* Acknowledge Button / Acknowledged Status */}
            {showAcknowledge && (
              <TouchableOpacity
                onPress={() => acknowledgeMessage(item.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  backgroundColor: SAND,
                  borderRadius: 12,
                  alignSelf: "flex-start",
                }}
              >
                <Ionicons name="thumbs-up-outline" size={14} color={SAGE} />
                <Text style={{ color: SAGE, fontSize: 12, marginLeft: 4, fontWeight: "500" }}>
                  Acknowledge
                </Text>
              </TouchableOpacity>
            )}

            {isAcknowledged && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <Ionicons name="thumbs-up" size={12} color={SAGE} />
                <Text style={{ color: SAGE, fontSize: 11, marginLeft: 4 }}>
                  Acknowledged
                </Text>
              </View>
            )}

            {/* Own message: Show "You" label */}
            {isOwnMessage && (
              <Text style={{
                textAlign: "right",
                color: SAGE,
                fontSize: 11,
                marginTop: 2,
                fontWeight: "500",
              }}>
                You
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getToxicityColor = (level: string) => {
    // Handle both color names (from API) and severity names (legacy)
    switch (level) {
      case "red":
      case "high":
      case "severe":
        return "#DC2626"; // Red - severe toxicity
      case "orange":
      case "medium":
        return "#F59E0B"; // Orange - medium toxicity
      case "yellow":
      case "low":
        return "#EAB308"; // Yellow - low toxicity
      case "green":
      case "none":
      default:
        return SAGE; // Green - no toxicity
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE }}>Loading messages...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: SAGE,
        borderBottomWidth: 1,
        borderBottomColor: SAND,
      }}>
        {/* Family Icon */}
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}>
          <Ionicons name="people" size={20} color={WHITE} />
        </View>

        {/* Title */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: WHITE }}>
            {familyFile?.title || familyFile?.family_name || "Family Messages"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/agreements")}>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              Shared Care Agreement <Ionicons name="chevron-forward" size={12} />
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
          onPress={() => {
            if (!coParentId || !familyFile?.id) {
              Alert.alert("Unable to Call", "Both parents must be connected to the family file to make calls.");
              return;
            }
            router.push({
              pathname: "/call/[sessionId]",
              params: {
                sessionId: "new",
                recipientId: coParentId,
                recipientType: "parent",
                familyFileId: familyFile.id,
                recipientName: coParentName,
                callType: "audio",
              },
            });
          }}
        >
          <Ionicons name="call" size={18} color={WHITE} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
          onPress={() => {
            if (!coParentId || !familyFile?.id) {
              Alert.alert("Unable to Call", "Both parents must be connected to the family file to make calls.");
              return;
            }
            router.push({
              pathname: "/call/[sessionId]",
              params: {
                sessionId: "new",
                recipientId: coParentId,
                recipientType: "parent",
                familyFileId: familyFile.id,
                recipientName: coParentName,
                callType: "video",
              },
            });
          }}
        >
          <Ionicons name="videocam" size={18} color={WHITE} />
        </TouchableOpacity>

        {/* ARIA Badge */}
        <View style={{
          marginLeft: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: "#F97316",
          flexDirection: "row",
          alignItems: "center",
        }}>
          <View style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: WHITE,
            marginRight: 4
          }} />
          <Text style={{ color: WHITE, fontSize: 12, fontWeight: "600" }}>ARIA</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingVertical: 16,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
              <Ionicons name="chatbubbles-outline" size={64} color={SLATE_LIGHT} />
              <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginTop: 16 }}>
                No messages yet
              </Text>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT, marginTop: 8, textAlign: "center" }}>
                Start a conversation with your co-parent
              </Text>
            </View>
          }
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: SLATE_LIGHT, fontSize: 12, fontStyle: "italic" }}>
              {coParentName} is typing...
            </Text>
          </View>
        )}

        {/* ARIA Analysis Indicator */}
        {(isAnalyzing || (analysis && analysis.toxicity_level !== "none")) && (
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: WHITE,
            borderTopWidth: 1,
            borderTopColor: SAND,
          }}>
            {isAnalyzing ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color={SAGE} />
                <Text style={{ color: SLATE_LIGHT, fontSize: 13, marginLeft: 8 }}>
                  ARIA is analyzing...
                </Text>
              </View>
            ) : analysis && analysis.toxicity_level !== "none" ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="warning"
                    size={16}
                    color={getToxicityColor(analysis.toxicity_level)}
                  />
                  <Text style={{
                    color: getToxicityColor(analysis.toxicity_level),
                    fontSize: 13,
                    marginLeft: 8,
                    fontWeight: "500",
                  }}>
                    {analysis.explanation || "Consider revising your message"}
                  </Text>
                </View>
                {analysis.suggestion && (
                  <TouchableOpacity
                    onPress={() => {
                      setMessageText(analysis.suggestion!);
                      setPendingAction("accepted"); // Track that user accepted the suggestion
                    }}
                    style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: SAGE_LIGHT,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: SAGE, fontSize: 12 }}>
                      Suggestion: {analysis.suggestion}
                    </Text>
                    <Text style={{ color: SAGE, fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                      Tap to use this instead
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Input Bar */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: WHITE,
          borderTopWidth: 1,
          borderTopColor: SAND,
        }}>
          {/* ARIA Icon */}
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <Ionicons name="paper-plane" size={18} color={SAGE} />
          </TouchableOpacity>

          {/* Text Input */}
          <View style={{
            flex: 1,
            backgroundColor: SAND,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            maxHeight: 100,
          }}>
            <TextInput
              placeholder="Write a message..."
              placeholderTextColor={SLATE_LIGHT}
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              style={{
                color: SLATE,
                fontSize: 15,
                maxHeight: 80,
              }}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || isSending || analysis?.block_send}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: messageText.trim() && !analysis?.block_send ? SAGE : SLATE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Ionicons name="send" size={18} color={WHITE} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

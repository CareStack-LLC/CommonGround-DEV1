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
  ScrollView,
  Linking,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";
import {
  createFamilyFileChannel,
  subscribeToMessages,
  setupTypingBroadcast,
  sendTypingIndicator,
  fetchUserById,
  type MessageRow,
  type TypingPayload,
} from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TOKEN_KEY = "auth_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

// ARIA intervention action types
type ARIAAction = "accepted" | "modified" | "rejected" | "sent_anyway" | "cancelled";

// Attachment from backend
interface MessageAttachment {
  id: string;
  message_id: string;
  family_file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: "image" | "video" | "audio" | "document" | "other";
  storage_url: string;
}

// Pending attachment (before upload)
interface PendingAttachment {
  id: string;
  uri: string;
  name: string;
  type: string;
  size?: number;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

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
  attachments?: MessageAttachment[];
}

interface ARIAAnalysis {
  toxicity_level: "none" | "low" | "medium" | "high" | "severe" | "green" | "yellow" | "orange" | "red";
  toxicity_score: number;
  is_flagged: boolean;
  suggestion?: string;
  explanation?: string;
  block_send?: boolean;
}

export default function MessagesScreen() {
  const { colors } = useTheme();
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
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick image from camera or library
  const pickImage = async (useCamera: boolean = false) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to take photos.");
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo library access is needed to select images.");
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images", "videos"],
            allowsEditing: false,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images", "videos"],
            allowsMultipleSelection: true,
            quality: 0.8,
          });

      if (!result.canceled && result.assets) {
        const newAttachments: PendingAttachment[] = result.assets.map((asset) => ({
          id: Math.random().toString(36).substring(7),
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
          uploading: false,
          uploaded: false,
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to pick image");
    }
    setShowAttachmentPicker(false);
  };

  // Pick document
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newAttachments: PendingAttachment[] = result.assets.map((asset) => ({
          id: Math.random().toString(36).substring(7),
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
          uploading: false,
          uploaded: false,
        }));
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
    } catch (err) {
      console.error("Document picker error:", err);
      Alert.alert("Error", "Failed to pick document");
    }
    setShowAttachmentPicker(false);
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Upload attachment to backend
  const uploadAttachment = async (messageId: string, attachment: PendingAttachment): Promise<boolean> => {
    try {
      setAttachments((prev) =>
        prev.map((a) => (a.id === attachment.id ? { ...a, uploading: true } : a))
      );

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return false;

      // Create form data - React Native requires special handling
      const formData = new FormData();
      formData.append("file", {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.type,
      } as unknown as Blob);

      // Use type assertion for React Native fetch compatibility with FormData
      const response = await fetch(`${API_URL}/api/v1/messages/${messageId}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: formData as any,
      });

      if (response.ok) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === attachment.id ? { ...a, uploading: false, uploaded: true } : a))
        );
        return true;
      } else {
        const errorData = await response.json() as { detail?: string };
        setAttachments((prev) =>
          prev.map((a) => (a.id === attachment.id ? { ...a, uploading: false, error: errorData.detail || "Upload failed" } : a))
        );
        return false;
      }
    } catch (err) {
      console.error("Attachment upload error:", err);
      setAttachments((prev) =>
        prev.map((a) => (a.id === attachment.id ? { ...a, uploading: false, error: "Upload failed" } : a))
      );
      return false;
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

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
        const data = await response.json() as Message[] | { items: Message[] };
        // Normalize the response - API returns array with attachments objects
        const rawMessages = Array.isArray(data) ? data : (data as { items: Message[] }).items || [];
        const normalizedMessages: Message[] = rawMessages.map((msg: any) => ({
          id: msg.id,
          family_file_id: msg.family_file_id,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          content: msg.content,
          sent_at: msg.sent_at,
          read_at: msg.read_at,
          acknowledged_at: msg.acknowledged_at,
          is_flagged: msg.was_flagged,
          has_attachments: msg.attachments && msg.attachments.length > 0,
          attachments: msg.attachments || [],
          attachment_urls: msg.attachments?.map((a: MessageAttachment) => a.storage_url) || [],
        }));
        console.log("[Messages] Fetched", normalizedMessages.length, "messages from API");
        setMessages(normalizedMessages);
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
    if (!messageText.trim() && attachments.length === 0) return;

    const actionToRecord = overrideAction || pendingAction;
    setIsSending(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      // Use placeholder content if only attachments
      const content = messageText.trim() || (attachments.length > 0 ? "(Attachment)" : "");

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
          content,
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json() as { id: string; was_flagged?: boolean };

        // Record ARIA intervention if message was flagged and user took an action
        if (sentMessage.was_flagged && actionToRecord) {
          await recordIntervention(sentMessage.id, actionToRecord, messageText.trim());
        }

        // Upload attachments if any
        if (attachments.length > 0) {
          setIsUploading(true);
          const uploadPromises = attachments.map((attachment) =>
            uploadAttachment(sentMessage.id, attachment)
          );
          await Promise.all(uploadPromises);
          setIsUploading(false);
        }

        setMessageText("");
        setAnalysis(null);
        setPendingAction(null);
        setAttachments([]);
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
      setIsUploading(false);
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
    // Note: attachments come from REST API, not realtime
  });

  // Get file icon name based on type
  const getFileIconName = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "videocam";
    if (type.startsWith("audio/")) return "musical-notes";
    if (type.includes("pdf")) return "document-text";
    return "document";
  };

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
          color: colors.textMuted,
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
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
          )}

          <View style={{ maxWidth: "75%" }}>
            {/* Message Bubble */}
            <View style={{
              backgroundColor: isOwnMessage ? colors.primary : colors.background,
              borderRadius: 16,
              borderBottomRightRadius: isOwnMessage ? 4 : 16,
              borderBottomLeftRadius: isOwnMessage ? 16 : 4,
              padding: 12,
              borderWidth: isOwnMessage ? 0 : 1,
              borderColor: colors.backgroundSecondary,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
              {/* Attachments from API response */}
              {item.attachments && item.attachments.length > 0 && (
                <View style={{ marginBottom: item.content && item.content !== "(Attachment)" ? 8 : 0 }}>
                  {item.attachments.map((att) => (
                    <View key={att.id} style={{ marginBottom: 8 }}>
                      {att.file_category === "image" || att.file_type?.startsWith("image/") ? (
                        <TouchableOpacity onPress={() => setFullScreenImage(att.storage_url)}>
                          <Image
                            source={{ uri: att.storage_url }}
                            style={{
                              width: "100%",
                              height: 200,
                              borderRadius: 8,
                            }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : att.file_category === "video" || att.file_type?.startsWith("video/") ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(att.storage_url)}
                          style={{
                            backgroundColor: isOwnMessage ? "rgba(255,255,255,0.2)" : colors.backgroundSecondary,
                            borderRadius: 8,
                            padding: 12,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="videocam" size={24} color={isOwnMessage ? colors.textInverse : colors.primary} />
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: isOwnMessage ? colors.textInverse : colors.secondary, fontWeight: "500" }} numberOfLines={1}>
                              {att.file_name}
                            </Text>
                            <Text style={{ color: isOwnMessage ? "rgba(255,255,255,0.7)" : colors.textMuted, fontSize: 12 }}>
                              Tap to play
                            </Text>
                          </View>
                          <Ionicons name="play-circle" size={32} color={isOwnMessage ? colors.textInverse : colors.primary} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(att.storage_url)}
                          style={{
                            backgroundColor: isOwnMessage ? "rgba(255,255,255,0.2)" : colors.backgroundSecondary,
                            borderRadius: 8,
                            padding: 12,
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name={getFileIconName(att.file_type)} size={24} color={isOwnMessage ? colors.textInverse : colors.primary} />
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: isOwnMessage ? colors.textInverse : colors.secondary, fontWeight: "500" }} numberOfLines={1}>
                              {att.file_name}
                            </Text>
                            <Text style={{ color: isOwnMessage ? "rgba(255,255,255,0.7)" : colors.textMuted, fontSize: 12 }}>
                              {formatFileSize(att.file_size)} • Tap to open
                            </Text>
                          </View>
                          <Ionicons name="download" size={20} color={isOwnMessage ? colors.textInverse : colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Legacy attachment_urls support */}
              {(!item.attachments || item.attachments.length === 0) && item.attachment_urls && item.attachment_urls.length > 0 && (
                <View style={{ marginBottom: item.content && item.content !== "(Attachment)" ? 8 : 0 }}>
                  {item.attachment_urls.map((url, idx) => (
                    <TouchableOpacity key={idx} onPress={() => setFullScreenImage(url)}>
                      <Image
                        source={{ uri: url }}
                        style={{
                          width: "100%",
                          height: 200,
                          borderRadius: 8,
                          marginBottom: 4,
                        }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Message Content - hide if just "(Attachment)" and we have attachments */}
              {item.content && item.content !== "(Attachment)" && (
                <Text style={{
                  color: isOwnMessage ? colors.textInverse : colors.secondary,
                  fontSize: 15,
                  lineHeight: 22,
                }}>
                  {item.content}
                </Text>
              )}

              {/* Show placeholder if no content and no attachments rendered */}
              {item.content === "(Attachment)" && (!item.attachments || item.attachments.length === 0) && (!item.attachment_urls || item.attachment_urls.length === 0) && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="attach" size={16} color={isOwnMessage ? "rgba(255,255,255,0.7)" : colors.textMuted} />
                  <Text style={{
                    color: isOwnMessage ? "rgba(255,255,255,0.7)" : colors.textMuted,
                    fontSize: 14,
                    marginLeft: 4,
                    fontStyle: "italic",
                  }}>
                    Attachment
                  </Text>
                </View>
              )}
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
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: 12,
                  alignSelf: "flex-start",
                }}
              >
                <Ionicons name="thumbs-up-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 4, fontWeight: "500" }}>
                  Acknowledge
                </Text>
              </TouchableOpacity>
            )}

            {isAcknowledged && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <Ionicons name="thumbs-up" size={12} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 11, marginLeft: 4 }}>
                  Acknowledged
                </Text>
              </View>
            )}

            {/* Own message: Show "You" label */}
            {isOwnMessage && (
              <Text style={{
                textAlign: "right",
                color: colors.primary,
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
        return colors.primary; // Green - no toxicity
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.secondary }}>Loading messages...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundSecondary,
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
          <Ionicons name="people" size={20} color={colors.textInverse} />
        </View>

        {/* Title */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textInverse }}>
            {familyFile?.title || familyFile?.family_name || "Family Messages"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/agreements")}>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              Shared Care Agreement <Ionicons name="chevron-forward" size={12} />
            </Text>
          </TouchableOpacity>
        </View>

        {/* ARIA Monitoring Indicator */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginLeft: 8,
          gap: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" }} />
          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.9)", fontWeight: "600" }}>ARIA</Text>
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
          <Ionicons name="call" size={18} color={colors.textInverse} />
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
          <Ionicons name="videocam" size={18} color={colors.textInverse} />
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
            backgroundColor: colors.textInverse,
            marginRight: 4
          }} />
          <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: "600" }}>ARIA</Text>
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
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary, marginTop: 16 }}>
                No messages yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" }}>
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
            <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: "italic" }}>
              {coParentName} is typing...
            </Text>
          </View>
        )}

        {/* ARIA Analysis Indicator */}
        {(isAnalyzing || (analysis && analysis.toxicity_level !== "none")) && (
          <View style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundSecondary,
          }}>
            {isAnalyzing ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 8 }}>
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
                      backgroundColor: colors.primaryLight,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12 }}>
                      Suggestion: {analysis.suggestion}
                    </Text>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                      Tap to use this instead
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>
        )}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <View style={{
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.backgroundSecondary,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {attachments.map((attachment) => (
                <View
                  key={attachment.id}
                  style={{
                    marginRight: 8,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: attachment.error ? "#DC2626" : attachment.uploaded ? colors.primary : colors.backgroundSecondary,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {attachment.type.startsWith("image/") ? (
                    <Image
                      source={{ uri: attachment.uri }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 80,
                      height: 80,
                      backgroundColor: colors.backgroundSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name={getFileIconName(attachment.type)} size={28} color={colors.primary} />
                      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                        {attachment.name.slice(0, 10)}...
                      </Text>
                    </View>
                  )}

                  {/* Upload status overlay */}
                  {attachment.uploading && (
                    <View style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    </View>
                  )}

                  {/* Remove button */}
                  {!attachment.uploading && !attachment.uploaded && (
                    <TouchableOpacity
                      onPress={() => removeAttachment(attachment.id)}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="close" size={14} color={colors.textInverse} />
                    </TouchableOpacity>
                  )}

                  {/* Success indicator */}
                  {attachment.uploaded && (
                    <View style={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
          borderTopWidth: attachments.length > 0 ? 0 : 1,
          borderTopColor: colors.backgroundSecondary,
        }}>
          {/* Attachment Button */}
          <TouchableOpacity
            onPress={() => setShowAttachmentPicker(true)}
            disabled={isSending || isUploading}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
              opacity: isSending || isUploading ? 0.5 : 1,
            }}
          >
            <Ionicons name="attach" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Text Input */}
          <View style={{
            flex: 1,
            backgroundColor: colors.backgroundSecondary,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            maxHeight: 100,
          }}>
            <TextInput
              placeholder="Write a message..."
              placeholderTextColor={colors.textMuted}
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              editable={!isSending && !isUploading}
              style={{
                color: colors.secondary,
                fontSize: 15,
                maxHeight: 80,
              }}
            />
          </View>

          {/* ARIA Test Button */}
          <TouchableOpacity
            onPress={async () => {
              if (!messageText.trim()) {
                Alert.alert("ARIA", "Enter a message to analyze with ARIA");
                return;
              }
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
                  if (result.toxicity_level === "none" || result.toxicity_level === "green") {
                    Alert.alert("ARIA", "Your message looks good! No concerning language detected.", [{ text: "Great!" }]);
                  }
                }
              } catch (err) {
                console.error("ARIA analysis failed:", err);
              } finally {
                setIsAnalyzing(false);
              }
            }}
            disabled={!messageText.trim() || isSending || isAnalyzing}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: messageText.trim() && !isSending ? "#F97316" : colors.textMuted,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
              opacity: !messageText.trim() || isSending || isAnalyzing ? 0.5 : 1,
            }}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="sparkles" size={16} color={colors.textInverse} />
            )}
          </TouchableOpacity>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!messageText.trim() && attachments.length === 0) || isSending || isUploading || analysis?.block_send}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: (messageText.trim() || attachments.length > 0) && !analysis?.block_send ? colors.primary : colors.textMuted,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 8,
            }}
          >
            {isSending || isUploading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="send" size={18} color={colors.textInverse} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Picker Modal */}
      <Modal
        visible={showAttachmentPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
          onPress={() => setShowAttachmentPicker(false)}
        >
          <View style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 40,
            paddingHorizontal: 20,
          }}>
            <View style={{
              width: 36,
              height: 4,
              backgroundColor: colors.textMuted,
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 20,
            }} />

            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.secondary, marginBottom: 20 }}>
              Add Attachment
            </Text>

            {/* Camera Option */}
            <TouchableOpacity
              onPress={() => pickImage(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.backgroundSecondary,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="camera" size={24} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Camera</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Take a photo or video</Text>
              </View>
            </TouchableOpacity>

            {/* Photo Library Option */}
            <TouchableOpacity
              onPress={() => pickImage(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.backgroundSecondary,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="images" size={24} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Photo Library</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Choose from your photos</Text>
              </View>
            </TouchableOpacity>

            {/* Document Option */}
            <TouchableOpacity
              onPress={pickDocument}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 16,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="document" size={24} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Document</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>PDF, Word, or other files</Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowAttachmentPicker(false)}
              style={{
                marginTop: 20,
                paddingVertical: 14,
                backgroundColor: colors.backgroundSecondary,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={!!fullScreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setFullScreenImage(null)}
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                zIndex: 10,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={24} color={colors.textInverse} />
            </TouchableOpacity>

            {/* Image */}
            {fullScreenImage && (
              <Image
                source={{ uri: fullScreenImage }}
                style={{ flex: 1, width: "100%" }}
                resizeMode="contain"
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Chat Conversation Screen
 *
 * Full chat interface with a contact including:
 * - Message bubbles with sender differentiation
 * - Sticker support
 * - ARIA monitoring indicators
 * - Child-friendly UI
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  child,
  type ChatMessage,
  type Sticker,
  type StickerPack,
} from "@commonground/api-client";

// Demo messages for testing
const DEMO_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    session_id: "",
    sender_id: "parent-1",
    sender_type: "parent",
    sender_name: "Mom",
    content: "Good morning sweetie! Did you sleep well?",
    message_type: "text",
    aria_analyzed: true,
    aria_flagged: false,
    is_delivered: true,
    is_read: true,
    sent_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "2",
    session_id: "",
    sender_id: "child-1",
    sender_type: "child",
    sender_name: "You",
    content: "Yes! I had a dream about dinosaurs!",
    message_type: "text",
    aria_analyzed: true,
    aria_flagged: false,
    is_delivered: true,
    is_read: true,
    sent_at: new Date(Date.now() - 7000000).toISOString(),
  },
  {
    id: "3",
    session_id: "",
    sender_id: "parent-1",
    sender_type: "parent",
    sender_name: "Mom",
    content: "That sounds fun! What kind of dinosaurs?",
    message_type: "text",
    aria_analyzed: true,
    aria_flagged: false,
    is_delivered: true,
    is_read: true,
    sent_at: new Date(Date.now() - 6800000).toISOString(),
  },
  {
    id: "4",
    session_id: "",
    sender_id: "child-1",
    sender_type: "child",
    sender_name: "You",
    content: "T-Rex and Triceratops! They were friends!",
    message_type: "text",
    aria_analyzed: true,
    aria_flagged: false,
    is_delivered: true,
    is_read: true,
    sent_at: new Date(Date.now() - 6600000).toISOString(),
  },
  {
    id: "5",
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
];

// Demo sticker packs
const DEMO_STICKER_PACKS: StickerPack[] = [
  {
    id: "emotions",
    name: "Feelings",
    description: "Express how you feel!",
    preview_url: "https://picsum.photos/seed/emotions/100/100",
    is_unlocked: true,
    stickers: [
      {
        id: "happy",
        pack_id: "emotions",
        name: "Happy",
        image_url: "https://picsum.photos/seed/happy/150/150",
        category: "emotions",
      },
      {
        id: "sad",
        pack_id: "emotions",
        name: "Sad",
        image_url: "https://picsum.photos/seed/sad/150/150",
        category: "emotions",
      },
      {
        id: "excited",
        pack_id: "emotions",
        name: "Excited",
        image_url: "https://picsum.photos/seed/excited/150/150",
        category: "emotions",
      },
      {
        id: "sleepy",
        pack_id: "emotions",
        name: "Sleepy",
        image_url: "https://picsum.photos/seed/sleepy/150/150",
        category: "emotions",
      },
    ],
  },
  {
    id: "love",
    name: "Love",
    description: "Show your love!",
    preview_url: "https://picsum.photos/seed/love/100/100",
    is_unlocked: true,
    stickers: [
      {
        id: "heart",
        pack_id: "love",
        name: "Heart",
        image_url: "https://picsum.photos/seed/heart/150/150",
        category: "love",
      },
      {
        id: "hug",
        pack_id: "love",
        name: "Hug",
        image_url: "https://picsum.photos/seed/hug/150/150",
        category: "love",
      },
      {
        id: "kiss",
        pack_id: "love",
        name: "Kiss",
        image_url: "https://picsum.photos/seed/kiss/150/150",
        category: "love",
      },
      {
        id: "family",
        pack_id: "love",
        name: "Family",
        image_url: "https://picsum.photos/seed/family/150/150",
        category: "love",
      },
    ],
  },
  {
    id: "animals",
    name: "Animals",
    description: "Cute animal friends!",
    preview_url: "https://picsum.photos/seed/animals/100/100",
    is_unlocked: true,
    stickers: [
      {
        id: "dog",
        pack_id: "animals",
        name: "Dog",
        image_url: "https://picsum.photos/seed/dog/150/150",
        category: "animals",
      },
      {
        id: "cat",
        pack_id: "animals",
        name: "Cat",
        image_url: "https://picsum.photos/seed/cat/150/150",
        category: "animals",
      },
      {
        id: "bunny",
        pack_id: "animals",
        name: "Bunny",
        image_url: "https://picsum.photos/seed/bunny/150/150",
        category: "animals",
      },
      {
        id: "unicorn",
        pack_id: "animals",
        name: "Unicorn",
        image_url: "https://picsum.photos/seed/unicorn/150/150",
        category: "animals",
      },
    ],
  },
];

// Quick reply suggestions
const QUICK_REPLIES = [
  "I love you!",
  "Good morning!",
  "Good night!",
  "I miss you!",
  "Thank you!",
  "Can we talk?",
];

function getContactEmoji(contactType: string, name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("mom") || lowerName.includes("mother")) return "👩";
  if (lowerName.includes("dad") || lowerName.includes("father")) return "👨";
  if (lowerName.includes("grandma")) return "👵";
  if (lowerName.includes("grandpa")) return "👴";
  if (contactType === "parent") return "👤";
  return "😊";
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatConversationScreen() {
  const params = useLocalSearchParams<{
    contactId: string;
    contactName: string;
    contactType: string;
  }>();

  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] =
    useState<StickerPack[]>(DEMO_STICKER_PACKS);
  const [selectedPack, setSelectedPack] = useState<StickerPack | null>(
    DEMO_STICKER_PACKS[0]
  );
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!params.contactId) return;

    try {
      const response = await child.kidcoms.getMessages(params.contactId, {
        limit: 50,
      });
      setMessages(response.items.reverse());
      await child.kidcoms.markMessagesRead(params.contactId);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      // Use demo data
      setMessages(DEMO_MESSAGES);
    } finally {
      setIsLoading(false);
    }
  }, [params.contactId]);

  // Fetch sticker packs
  const fetchStickers = useCallback(async () => {
    try {
      const response = await child.kidcoms.getStickerPacks();
      setStickerPacks(response.items);
      if (response.items.length > 0) {
        setSelectedPack(response.items[0]);
      }
    } catch {
      // Use demo data
      setStickerPacks(DEMO_STICKER_PACKS);
      setSelectedPack(DEMO_STICKER_PACKS[0]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
    fetchStickers();
  }, [fetchMessages, fetchStickers]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!inputText.trim() || !params.contactId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSending(true);
    setShowQuickReplies(false);

    const messageContent = inputText.trim();
    setInputText("");
    Keyboard.dismiss();

    // Optimistically add message
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: "",
      sender_id: "child-1",
      sender_type: "child",
      sender_name: "You",
      content: messageContent,
      message_type: "text",
      aria_analyzed: false,
      aria_flagged: false,
      is_delivered: false,
      is_read: false,
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const sentMessage = await child.kidcoms.sendMessage(params.contactId, {
        content: messageContent,
        message_type: "text",
      });
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? sentMessage : m))
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      // Show error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSending(false);
    }
  };

  // Send sticker
  const handleSendSticker = async (sticker: Sticker) => {
    if (!params.contactId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowStickers(false);

    // Optimistically add sticker message
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: "",
      sender_id: "child-1",
      sender_type: "child",
      sender_name: "You",
      content: sticker.name,
      message_type: "sticker",
      sticker_id: sticker.id,
      aria_analyzed: false,
      aria_flagged: false,
      is_delivered: false,
      is_read: false,
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const sentMessage = await child.kidcoms.sendMessage(params.contactId, {
        content: sticker.name,
        message_type: "sticker",
        sticker_id: sticker.id,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? sentMessage : m))
      );
    } catch (error) {
      console.error("Failed to send sticker:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Quick reply
  const handleQuickReply = (text: string) => {
    setInputText(text);
    setShowQuickReplies(false);
  };

  const contactEmoji = getContactEmoji(
    params.contactType || "parent",
    params.contactName || "Contact"
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={["#3b82f6", "#60a5fa"]}
        className="pt-12 pb-4 px-4"
      >
        <SafeAreaView edges={[]} className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center ml-3">
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
              <Text className="text-2xl">{contactEmoji}</Text>
            </View>
            <View className="ml-3">
              <Text className="text-xl font-bold text-white">
                {params.contactName || "Contact"}
              </Text>
              <Text className="text-blue-200 text-sm capitalize">
                {params.contactType?.replace("_", " ") || "Family"}
              </Text>
            </View>
          </View>

          {/* Video call button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/call",
                params: {
                  contactId: params.contactId,
                  contactName: params.contactName,
                },
              });
            }}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="videocam" size={22} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      {/* ARIA Notice */}
      <View className="bg-blue-50 px-4 py-2 flex-row items-center">
        <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
        <Text className="text-blue-600 text-xs ml-2">
          Messages are checked to keep conversations kind and safe
        </Text>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : messages.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">💬</Text>
              <Text className="text-gray-500 text-lg text-center">
                No messages yet!
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Say hi to {params.contactName}!
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = message.sender_type === "child";
              const showAvatar =
                index === 0 ||
                messages[index - 1].sender_type !== message.sender_type;

              return (
                <View
                  key={message.id}
                  className={`flex-row mb-2 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Other person's avatar */}
                  {!isMe && showAvatar && (
                    <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2">
                      <Text className="text-lg">{contactEmoji}</Text>
                    </View>
                  )}
                  {!isMe && !showAvatar && <View className="w-10" />}

                  {/* Message bubble */}
                  <View
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMe
                        ? "bg-blue-500 rounded-br-sm"
                        : "bg-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {message.message_type === "sticker" ? (
                      <View className="w-24 h-24 items-center justify-center">
                        <Image
                          source={{
                            uri: `https://picsum.photos/seed/${message.sticker_id}/150/150`,
                          }}
                          className="w-20 h-20"
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <Text
                        className={`text-base ${
                          isMe ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {message.content}
                      </Text>
                    )}

                    <Text
                      className={`text-xs mt-1 ${
                        isMe ? "text-blue-200" : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.sent_at)}
                      {isMe && message.is_delivered && " ✓"}
                    </Text>
                  </View>

                  {/* ARIA flag indicator */}
                  {message.aria_flagged && (
                    <View className="ml-1 self-center">
                      <Ionicons
                        name="warning"
                        size={16}
                        color="#f59e0b"
                      />
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Quick Replies */}
          {showQuickReplies && messages.length > 0 && (
            <View className="mt-4">
              <Text className="text-gray-400 text-sm mb-2 text-center">
                Quick replies
              </Text>
              <View className="flex-row flex-wrap justify-center">
                {QUICK_REPLIES.map((reply) => (
                  <TouchableOpacity
                    key={reply}
                    onPress={() => handleQuickReply(reply)}
                    className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2 m-1"
                  >
                    <Text className="text-blue-600">{reply}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="border-t border-gray-200 px-4 py-3 bg-white">
          <View className="flex-row items-center">
            {/* Sticker button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStickers(true);
                Keyboard.dismiss();
              }}
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-2"
            >
              <Text className="text-xl">🎨</Text>
            </TouchableOpacity>

            {/* Text input */}
            <View className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                className="flex-1 text-base text-gray-800"
                multiline
                maxLength={500}
                onFocus={() => setShowQuickReplies(false)}
              />
            </View>

            {/* Send button */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              className={`w-10 h-10 rounded-full items-center justify-center ml-2 ${
                inputText.trim() ? "bg-blue-500" : "bg-gray-200"
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? "white" : "#9ca3af"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sticker Picker Modal */}
      <Modal
        visible={showStickers}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStickers(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[60%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">
                Stickers 🎨
              </Text>
              <TouchableOpacity
                onPress={() => setShowStickers(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Pack tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="border-b border-gray-100"
              contentContainerStyle={{ padding: 8 }}
            >
              {stickerPacks.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPack(pack);
                  }}
                  className={`px-4 py-2 mr-2 rounded-full ${
                    selectedPack?.id === pack.id
                      ? "bg-blue-500"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedPack?.id === pack.id
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {pack.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Stickers grid */}
            <ScrollView className="p-4">
              <View className="flex-row flex-wrap">
                {selectedPack?.stickers.map((sticker) => (
                  <TouchableOpacity
                    key={sticker.id}
                    onPress={() => handleSendSticker(sticker)}
                    className="w-1/4 p-2"
                  >
                    <View className="bg-gray-50 rounded-xl p-2 items-center">
                      <Image
                        source={{ uri: sticker.image_url }}
                        className="w-16 h-16"
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

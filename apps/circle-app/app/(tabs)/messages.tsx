/**
 * Messages Screen for Circle App
 * Messaging between circle contacts and children
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useAuth } from "@/providers/AuthProvider";
import { circle, type CircleMessage, type CircleStickerPack } from "@commonground/api-client";

// Demo messages fallback
const DEMO_MESSAGES: CircleMessage[] = [
  {
    id: "1",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "child1",
    sender_type: "child",
    sender_name: "Emma",
    content: "Hi Grandma! 👋",
    message_type: "text",
    is_from_me: false,
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "2",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "contact1",
    sender_type: "circle_contact",
    sender_name: "Grandma",
    content: "Hello sweetie! How was school today?",
    message_type: "text",
    is_from_me: true,
    is_read: true,
    created_at: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: "3",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "child1",
    sender_type: "child",
    sender_name: "Emma",
    content: "It was great! We learned about dinosaurs 🦕",
    message_type: "text",
    is_from_me: false,
    is_read: true,
    created_at: new Date(Date.now() - 3400000).toISOString(),
  },
  {
    id: "4",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "contact1",
    sender_type: "circle_contact",
    sender_name: "Grandma",
    content: "That sounds amazing! I love dinosaurs too!",
    message_type: "text",
    is_from_me: true,
    is_read: true,
    created_at: new Date(Date.now() - 3300000).toISOString(),
  },
];

// Default sticker packs
const DEFAULT_STICKER_PACKS: CircleStickerPack[] = [
  {
    id: "emoji",
    name: "Emoji",
    stickers: [
      { id: "heart", pack_id: "emoji", emoji: "❤️" },
      { id: "smile", pack_id: "emoji", emoji: "😊" },
      { id: "party", pack_id: "emoji", emoji: "🎉" },
      { id: "thumbs", pack_id: "emoji", emoji: "👍" },
      { id: "star", pack_id: "emoji", emoji: "🌟" },
      { id: "butterfly", pack_id: "emoji", emoji: "🦋" },
      { id: "rainbow", pack_id: "emoji", emoji: "🌈" },
      { id: "art", pack_id: "emoji", emoji: "🎨" },
    ],
  },
  {
    id: "animals",
    name: "Animals",
    stickers: [
      { id: "dog", pack_id: "animals", emoji: "🐕" },
      { id: "cat", pack_id: "animals", emoji: "🐈" },
      { id: "unicorn", pack_id: "animals", emoji: "🦄" },
      { id: "dino", pack_id: "animals", emoji: "🦖" },
      { id: "bunny", pack_id: "animals", emoji: "🐰" },
      { id: "bear", pack_id: "animals", emoji: "🐻" },
      { id: "penguin", pack_id: "animals", emoji: "🐧" },
      { id: "dolphin", pack_id: "animals", emoji: "🐬" },
    ],
  },
  {
    id: "food",
    name: "Food",
    stickers: [
      { id: "pizza", pack_id: "food", emoji: "🍕" },
      { id: "icecream", pack_id: "food", emoji: "🍦" },
      { id: "cake", pack_id: "food", emoji: "🎂" },
      { id: "cookie", pack_id: "food", emoji: "🍪" },
      { id: "donut", pack_id: "food", emoji: "🍩" },
      { id: "taco", pack_id: "food", emoji: "🌮" },
      { id: "watermelon", pack_id: "food", emoji: "🍉" },
      { id: "candy", pack_id: "food", emoji: "🍬" },
    ],
  },
];

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesScreen() {
  const { connectedChildren } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  const [selectedChild, setSelectedChild] = useState(connectedChildren[0]?.id || null);
  const [messages, setMessages] = useState<CircleMessage[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState<CircleStickerPack[]>(DEFAULT_STICKER_PACKS);
  const [selectedPack, setSelectedPack] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch messages and sticker packs
  const fetchData = useCallback(async () => {
    if (!selectedChild) return;

    try {
      const [messagesRes, stickersRes] = await Promise.all([
        circle.messages.getMessages(selectedChild),
        circle.messages.getStickerPacks(),
      ]);
      setMessages(messagesRes.items);
      if (stickersRes.items.length > 0) {
        setStickerPacks(stickersRes.items);
      }

      // Mark as read
      await circle.messages.markAsRead(selectedChild);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      // Filter demo messages for selected child
      setMessages(DEMO_MESSAGES.filter((m) => m.child_id === selectedChild));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChild) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage("");

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const sentMessage = await circle.messages.sendMessage(selectedChild, messageText);
      setMessages([...messages, sentMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add locally for demo
      const childData = connectedChildren.find((c) => c.id === selectedChild);
      const message: CircleMessage = {
        id: Date.now().toString(),
        child_id: selectedChild,
        child_name: childData?.name || "Child",
        sender_id: "me",
        sender_type: "circle_contact",
        sender_name: "You",
        content: messageText,
        message_type: "text",
        is_from_me: true,
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setMessages([...messages, message]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSticker = async (stickerId: string, emoji: string) => {
    if (!selectedChild) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const sentMessage = await circle.messages.sendSticker(selectedChild, stickerId);
      setMessages([...messages, sentMessage]);
      setShowStickers(false);
    } catch (error) {
      console.error("Failed to send sticker:", error);
      // Add locally for demo
      const childData = connectedChildren.find((c) => c.id === selectedChild);
      const message: CircleMessage = {
        id: Date.now().toString(),
        child_id: selectedChild,
        child_name: childData?.name || "Child",
        sender_id: "me",
        sender_type: "circle_contact",
        sender_name: "You",
        content: emoji,
        message_type: "sticker",
        sticker_id: stickerId,
        is_from_me: true,
        is_read: true,
        created_at: new Date().toISOString(),
      };
      setMessages([...messages, message]);
      setShowStickers(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleSendImage = async () => {
    if (!selectedChild) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsSending(true);
      try {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const sentMessage = await circle.messages.sendImage(selectedChild, base64, "image/jpeg");
        setMessages([...messages, sentMessage]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Failed to send image:", error);
        // Add locally for demo
        const childData = connectedChildren.find((c) => c.id === selectedChild);
        const message: CircleMessage = {
          id: Date.now().toString(),
          child_id: selectedChild,
          child_name: childData?.name || "Child",
          sender_id: "me",
          sender_type: "circle_contact",
          sender_name: "You",
          content: "📷 Photo",
          message_type: "image",
          image_url: result.assets[0].uri,
          is_from_me: true,
          is_read: true,
          created_at: new Date().toISOString(),
        };
        setMessages([...messages, message]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } finally {
        setIsSending(false);
      }
    }
  };

  const selectedChildData = connectedChildren.find((c) => c.id === selectedChild);
  const filteredMessages = messages.filter((m) => m.child_id === selectedChild);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="bg-white px-6 py-4 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-800">Messages</Text>

          {/* Child Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4 -mx-2"
          >
            {connectedChildren.map((child) => (
              <TouchableOpacity
                key={child.id}
                className={`mx-2 items-center ${
                  selectedChild === child.id ? "opacity-100" : "opacity-50"
                }`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedChild(child.id);
                }}
              >
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center ${
                    selectedChild === child.id
                      ? "bg-primary-100 border-2 border-primary-500"
                      : "bg-gray-100"
                  }`}
                >
                  <Text className="text-2xl">{child.age < 10 ? "👧" : "🧑"}</Text>
                </View>
                <Text
                  className={`text-sm mt-1 ${
                    selectedChild === child.id
                      ? "text-primary-600 font-bold"
                      : "text-gray-500"
                  }`}
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
        >
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-gray-500 mt-4">Loading messages...</Text>
            </View>
          ) : filteredMessages.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No messages yet</Text>
              <Text className="text-gray-400 text-center mt-2">
                Start a conversation with {selectedChildData?.name || "your child"}!
              </Text>
            </View>
          ) : (
            filteredMessages.map((message) => (
              <View
                key={message.id}
                className={`flex-row mb-3 ${
                  message.is_from_me ? "justify-end" : "justify-start"
                }`}
              >
                <View
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.is_from_me
                      ? "bg-primary-500 rounded-br-md"
                      : "bg-white rounded-bl-md shadow-sm"
                  }`}
                >
                  {message.message_type === "sticker" ? (
                    <Text className="text-4xl">{message.content}</Text>
                  ) : message.message_type === "image" && message.image_url ? (
                    <Image
                      source={{ uri: message.image_url }}
                      className="w-48 h-36 rounded-lg"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      className={`text-base ${
                        message.is_from_me ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {message.content}
                    </Text>
                  )}
                  <Text
                    className={`text-xs mt-1 ${
                      message.is_from_me ? "text-primary-200" : "text-gray-400"
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Sticker Picker */}
        {showStickers && (
          <View className="bg-white border-t border-gray-100">
            {/* Pack Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="border-b border-gray-100 px-2 py-2"
            >
              {stickerPacks.map((pack, index) => (
                <TouchableOpacity
                  key={pack.id}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedPack === index ? "bg-primary-100" : "bg-gray-50"
                  }`}
                  onPress={() => setSelectedPack(index)}
                >
                  <Text
                    className={`font-medium ${
                      selectedPack === index
                        ? "text-primary-600"
                        : "text-gray-500"
                    }`}
                  >
                    {pack.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Stickers */}
            <View className="px-4 py-4">
              <View className="flex-row flex-wrap justify-center">
                {stickerPacks[selectedPack]?.stickers.map((sticker) => (
                  <TouchableOpacity
                    key={sticker.id}
                    className="w-12 h-12 items-center justify-center m-2"
                    onPress={() => handleSendSticker(sticker.id, sticker.emoji)}
                  >
                    <Text className="text-3xl">{sticker.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View className="bg-white border-t border-gray-100 px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-10 h-10 items-center justify-center"
              onPress={() => setShowStickers(!showStickers)}
            >
              <Ionicons
                name={showStickers ? "close" : "happy-outline"}
                size={24}
                color={showStickers ? "#6366f1" : "#9ca3af"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="w-10 h-10 items-center justify-center"
              onPress={handleSendImage}
            >
              <Ionicons name="image-outline" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 mx-2 text-base"
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={handleSendMessage}
              editable={!isSending}
            />

            <TouchableOpacity
              className={`w-10 h-10 rounded-full items-center justify-center ${
                newMessage.trim() && !isSending ? "bg-primary-500" : "bg-gray-200"
              }`}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={newMessage.trim() ? "white" : "#9ca3af"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

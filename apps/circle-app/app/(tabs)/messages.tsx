import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  type: "text" | "image" | "sticker";
  imageUrl?: string;
}

// Demo messages
const DEMO_MESSAGES: Message[] = [
  {
    id: "1",
    text: "Hi Grandma! 👋",
    timestamp: "10:30 AM",
    isFromMe: false,
    type: "text",
  },
  {
    id: "2",
    text: "Hello sweetie! How was school today?",
    timestamp: "10:32 AM",
    isFromMe: true,
    type: "text",
  },
  {
    id: "3",
    text: "It was great! We learned about dinosaurs 🦕",
    timestamp: "10:33 AM",
    isFromMe: false,
    type: "text",
  },
  {
    id: "4",
    text: "That sounds amazing! I love dinosaurs too!",
    timestamp: "10:35 AM",
    isFromMe: true,
    type: "text",
  },
];

const STICKERS = ["❤️", "😊", "🎉", "👍", "🌟", "🦋", "🌈", "🎨"];

export default function MessagesScreen() {
  const { connectedChildren } = useAuth();
  const [selectedChild, setSelectedChild] = useState(
    connectedChildren[0]?.id || null
  );
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [showStickers, setShowStickers] = useState(false);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isFromMe: true,
      type: "text",
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  const handleSendSticker = (sticker: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const message: Message = {
      id: Date.now().toString(),
      text: sticker,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isFromMe: true,
      type: "sticker",
    };

    setMessages([...messages, message]);
    setShowStickers(false);
  };

  const selectedChildData = connectedChildren.find((c) => c.id === selectedChild);

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
                onPress={() => setSelectedChild(child.id)}
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
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`flex-row mb-3 ${
                message.isFromMe ? "justify-end" : "justify-start"
              }`}
            >
              <View
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.isFromMe
                    ? "bg-primary-500 rounded-br-md"
                    : "bg-white rounded-bl-md shadow-sm"
                }`}
              >
                {message.type === "sticker" ? (
                  <Text className="text-4xl">{message.text}</Text>
                ) : (
                  <Text
                    className={`text-base ${
                      message.isFromMe ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {message.text}
                  </Text>
                )}
                <Text
                  className={`text-xs mt-1 ${
                    message.isFromMe ? "text-primary-200" : "text-gray-400"
                  }`}
                >
                  {message.timestamp}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Sticker Picker */}
        {showStickers && (
          <View className="bg-white border-t border-gray-100 px-4 py-4">
            <View className="flex-row flex-wrap justify-center">
              {STICKERS.map((sticker, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-12 h-12 items-center justify-center m-2"
                  onPress={() => handleSendSticker(sticker)}
                >
                  <Text className="text-3xl">{sticker}</Text>
                </TouchableOpacity>
              ))}
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
                color="#9ca3af"
              />
            </TouchableOpacity>

            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="image-outline" size={24} color="#9ca3af" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 mx-2 text-base"
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={handleSendMessage}
            />

            <TouchableOpacity
              className={`w-10 h-10 rounded-full items-center justify-center ${
                newMessage.trim() ? "bg-primary-500" : "bg-gray-200"
              }`}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={newMessage.trim() ? "white" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

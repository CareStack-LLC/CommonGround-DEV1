import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";

interface Memory {
  id: string;
  imageUrl: string;
  caption?: string;
  childName: string;
  date: string;
  isFromMe: boolean;
}

// Demo memories with placeholder images
const DEMO_MEMORIES: Memory[] = [
  {
    id: "1",
    imageUrl: "https://picsum.photos/seed/memory1/400/400",
    caption: "My art project!",
    childName: "Emma",
    date: "Today",
    isFromMe: false,
  },
  {
    id: "2",
    imageUrl: "https://picsum.photos/seed/memory2/400/400",
    caption: "Beautiful sunset from grandma's house",
    childName: "Emma",
    date: "Yesterday",
    isFromMe: true,
  },
  {
    id: "3",
    imageUrl: "https://picsum.photos/seed/memory3/400/400",
    caption: "Soccer practice ⚽",
    childName: "Lucas",
    date: "2 days ago",
    isFromMe: false,
  },
  {
    id: "4",
    imageUrl: "https://picsum.photos/seed/memory4/400/400",
    caption: "Birthday cake for you!",
    childName: "Emma",
    date: "1 week ago",
    isFromMe: true,
  },
  {
    id: "5",
    imageUrl: "https://picsum.photos/seed/memory5/400/400",
    caption: "New puppy!",
    childName: "Lucas",
    date: "1 week ago",
    isFromMe: false,
  },
  {
    id: "6",
    imageUrl: "https://picsum.photos/seed/memory6/400/400",
    childName: "Emma",
    date: "2 weeks ago",
    isFromMe: false,
  },
];

const { width } = Dimensions.get("window");
const imageSize = (width - 48) / 3;

export default function MemoriesScreen() {
  const { connectedChildren } = useAuth();
  const [memories, setMemories] = useState<Memory[]>(DEMO_MEMORIES);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");

  const filteredMemories = memories.filter((m) => {
    if (filter === "sent") return m.isFromMe;
    if (filter === "received") return !m.isFromMe;
    return true;
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const newMemory: Memory = {
        id: Date.now().toString(),
        imageUrl: result.assets[0].uri,
        caption: "Shared with love 💕",
        childName: connectedChildren[0]?.name || "Family",
        date: "Just now",
        isFromMe: true,
      };

      setMemories([newMemory, ...memories]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Memories</Text>
          <TouchableOpacity
            className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center"
            onPress={handlePickImage}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-bold ml-1">Share</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View className="flex-row mt-4 bg-gray-100 rounded-xl p-1">
          {[
            { id: "all", label: "All" },
            { id: "received", label: "From Kids" },
            { id: "sent", label: "Shared by Me" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              className={`flex-1 py-2 rounded-lg ${
                filter === tab.id ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setFilter(tab.id as typeof filter)}
            >
              <Text
                className={`text-center font-medium ${
                  filter === tab.id ? "text-primary-600" : "text-gray-500"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Memory Grid */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredMemories.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="images-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 text-lg mt-4">No memories yet</Text>
            <Text className="text-gray-400 text-center mt-2">
              Share photos with your family to create memories together
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
            {filteredMemories.map((memory, index) => (
              <TouchableOpacity
                key={memory.id}
                className="mb-2"
                style={{
                  width: imageSize,
                  height: imageSize,
                  marginRight: (index + 1) % 3 === 0 ? 0 : 8,
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedMemory(memory);
                }}
              >
                <Image
                  source={{ uri: memory.imageUrl }}
                  className="w-full h-full rounded-xl"
                  resizeMode="cover"
                />
                {memory.isFromMe && (
                  <View className="absolute top-2 right-2 bg-primary-500 rounded-full p-1">
                    <Ionicons name="arrow-up" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Memory Detail Modal */}
      <Modal
        visible={!!selectedMemory}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2">
              <TouchableOpacity
                onPress={() => setSelectedMemory(null)}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <View className="items-center">
                <Text className="text-white font-bold">
                  {selectedMemory?.isFromMe
                    ? `Shared with ${selectedMemory?.childName}`
                    : `From ${selectedMemory?.childName}`}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {selectedMemory?.date}
                </Text>
              </View>
              <TouchableOpacity className="w-10 h-10 items-center justify-center">
                <Ionicons name="ellipsis-horizontal" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Image */}
            <View className="flex-1 items-center justify-center">
              {selectedMemory && (
                <Image
                  source={{ uri: selectedMemory.imageUrl }}
                  className="w-full"
                  style={{ aspectRatio: 1 }}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Caption */}
            {selectedMemory?.caption && (
              <View className="px-6 py-4">
                <Text className="text-white text-lg text-center">
                  {selectedMemory.caption}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View className="flex-row justify-center py-4 space-x-6">
              <TouchableOpacity className="items-center">
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="heart-outline" size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1">Love</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center">
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="chatbubble-outline" size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1">Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center">
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="download-outline" size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1">Save</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

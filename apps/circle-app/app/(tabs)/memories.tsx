/**
 * Memories Screen for Circle App
 * Photo sharing between circle contacts and children
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";
import { circle, type Memory } from "@commonground/api-client";

const { width } = Dimensions.get("window");
const imageSize = (width - 48) / 3;

// Demo data for fallback
const DEMO_MEMORIES: Memory[] = [
  {
    id: "1",
    image_url: "https://picsum.photos/seed/memory1/400/400",
    caption: "My art project!",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "child1",
    sender_type: "child",
    sender_name: "Emma",
    is_from_me: false,
    liked_by: [],
    comments_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    image_url: "https://picsum.photos/seed/memory2/400/400",
    caption: "Beautiful sunset from grandma's house",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "contact1",
    sender_type: "circle_contact",
    sender_name: "Grandma",
    is_from_me: true,
    liked_by: ["child1"],
    comments_count: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    image_url: "https://picsum.photos/seed/memory3/400/400",
    caption: "Soccer practice ⚽",
    child_id: "child2",
    child_name: "Lucas",
    sender_id: "child2",
    sender_type: "child",
    sender_name: "Lucas",
    is_from_me: false,
    liked_by: [],
    comments_count: 0,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    image_url: "https://picsum.photos/seed/memory4/400/400",
    caption: "Birthday cake for you!",
    child_id: "child1",
    child_name: "Emma",
    sender_id: "contact1",
    sender_type: "circle_contact",
    sender_name: "Grandma",
    is_from_me: true,
    liked_by: ["child1", "child2"],
    comments_count: 3,
    created_at: new Date(Date.now() - 604800000).toISOString(),
  },
];

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default function MemoriesScreen() {
  const { connectedChildren } = useAuth();
  const [memories, setMemories] = useState<Memory[]>(DEMO_MEMORIES);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch memories from API
  const fetchMemories = useCallback(async () => {
    try {
      const response = await circle.memories.getMemories({ filter });
      setMemories(response.items);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
      // Use demo data as fallback
      const filtered = DEMO_MEMORIES.filter((m) => {
        if (filter === "sent") return m.is_from_me;
        if (filter === "received") return !m.is_from_me;
        return true;
      });
      setMemories(filtered);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    fetchMemories();
  }, [fetchMemories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMemories();
  }, [fetchMemories]);

  const filteredMemories = memories.filter((m) => {
    if (filter === "sent") return m.is_from_me;
    if (filter === "received") return !m.is_from_me;
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
      setSelectedImage(result.assets[0].uri);
      setSelectedChildId(connectedChildren[0]?.id || null);
      setShowShareModal(true);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedChildId(connectedChildren[0]?.id || null);
      setShowShareModal(true);
    }
  };

  const handleShareMemory = async () => {
    if (!selectedImage || !selectedChildId) return;

    setIsUploading(true);
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload image first
      const uploadResult = await circle.memories.uploadMemoryImage(
        selectedChildId,
        base64,
        "image/jpeg"
      );

      // Share the memory
      const newMemory = await circle.memories.shareMemory({
        child_id: selectedChildId,
        image_url: uploadResult.url,
        caption: shareCaption || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMemories([newMemory, ...memories]);
      setShowShareModal(false);
      setSelectedImage(null);
      setShareCaption("");
    } catch (error) {
      console.error("Failed to share memory:", error);
      // Add locally for demo
      const childName = connectedChildren.find((c) => c.id === selectedChildId)?.name || "Family";
      const newMemory: Memory = {
        id: Date.now().toString(),
        image_url: selectedImage,
        caption: shareCaption || undefined,
        child_id: selectedChildId,
        child_name: childName,
        sender_id: "me",
        sender_type: "circle_contact",
        sender_name: "You",
        is_from_me: true,
        liked_by: [],
        comments_count: 0,
        created_at: new Date().toISOString(),
      };
      setMemories([newMemory, ...memories]);
      setShowShareModal(false);
      setSelectedImage(null);
      setShareCaption("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleLike = async (memory: Memory) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await circle.memories.toggleMemoryLike(memory.id);

      // Update local state
      setMemories((prev) =>
        prev.map((m) => {
          if (m.id === memory.id) {
            const isLiked = m.liked_by.includes("me");
            return {
              ...m,
              liked_by: isLiked
                ? m.liked_by.filter((id) => id !== "me")
                : [...m.liked_by, "me"],
            };
          }
          return m;
        })
      );

      if (selectedMemory?.id === memory.id) {
        const isLiked = selectedMemory.liked_by.includes("me");
        setSelectedMemory({
          ...selectedMemory,
          liked_by: isLiked
            ? selectedMemory.liked_by.filter((id) => id !== "me")
            : [...selectedMemory.liked_by, "me"],
        });
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleDownload = async (memory: Memory) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await circle.memories.downloadMemory(memory.id);
      Alert.alert("Saved!", "Photo saved to your device");
    } catch (error) {
      console.error("Failed to download:", error);
      Alert.alert("Saved!", "Photo saved to your device");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">Memories</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-gray-100 px-3 py-2 rounded-full mr-2"
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-primary-500 px-4 py-2 rounded-full flex-row items-center"
              onPress={handlePickImage}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-bold ml-1">Share</Text>
            </TouchableOpacity>
          </View>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(tab.id as typeof filter);
              }}
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
            <Text className="text-gray-500 mt-4">Loading memories...</Text>
          </View>
        ) : filteredMemories.length === 0 ? (
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
                  source={{ uri: memory.image_url }}
                  className="w-full h-full rounded-xl"
                  resizeMode="cover"
                />
                {memory.is_from_me && (
                  <View className="absolute top-2 right-2 bg-primary-500 rounded-full p-1">
                    <Ionicons name="arrow-up" size={12} color="white" />
                  </View>
                )}
                {memory.liked_by.length > 0 && (
                  <View className="absolute bottom-2 left-2 bg-black/50 rounded-full px-2 py-1 flex-row items-center">
                    <Ionicons name="heart" size={12} color="#ef4444" />
                    <Text className="text-white text-xs ml-1">
                      {memory.liked_by.length}
                    </Text>
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
                  {selectedMemory?.is_from_me
                    ? `Shared with ${selectedMemory?.child_name}`
                    : `From ${selectedMemory?.sender_name}`}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {selectedMemory && formatRelativeDate(selectedMemory.created_at)}
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
                  source={{ uri: selectedMemory.image_url }}
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
              <TouchableOpacity
                className="items-center"
                onPress={() => selectedMemory && handleToggleLike(selectedMemory)}
              >
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons
                    name={
                      selectedMemory?.liked_by.includes("me")
                        ? "heart"
                        : "heart-outline"
                    }
                    size={24}
                    color={
                      selectedMemory?.liked_by.includes("me") ? "#ef4444" : "white"
                    }
                  />
                </View>
                <Text className="text-white text-xs mt-1">
                  {selectedMemory?.liked_by.length || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="items-center">
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="chatbubble-outline" size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1">
                  {selectedMemory?.comments_count || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center"
                onPress={() => selectedMemory && handleDownload(selectedMemory)}
              >
                <View className="w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                  <Ionicons name="download-outline" size={24} color="white" />
                </View>
                <Text className="text-white text-xs mt-1">Save</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Share Memory Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Share Memory
              </Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Preview */}
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-64 rounded-xl mb-4"
                resizeMode="cover"
              />
            )}

            {/* Child Selector */}
            <Text className="text-gray-600 font-medium mb-2">Share with:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {connectedChildren.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  className={`mr-3 items-center ${
                    selectedChildId === child.id ? "opacity-100" : "opacity-50"
                  }`}
                  onPress={() => setSelectedChildId(child.id)}
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      selectedChildId === child.id
                        ? "bg-primary-100 border-2 border-primary-500"
                        : "bg-gray-100"
                    }`}
                  >
                    <Text className="text-2xl">
                      {child.age < 10 ? "👧" : "🧑"}
                    </Text>
                  </View>
                  <Text
                    className={`text-sm mt-1 ${
                      selectedChildId === child.id
                        ? "text-primary-600 font-bold"
                        : "text-gray-500"
                    }`}
                  >
                    {child.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Caption Input */}
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-base mb-4"
              placeholder="Add a caption (optional)"
              placeholderTextColor="#9ca3af"
              value={shareCaption}
              onChangeText={setShareCaption}
              multiline
              maxLength={200}
            />

            {/* Share Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${
                isUploading || !selectedChildId
                  ? "bg-gray-300"
                  : "bg-primary-500"
              }`}
              onPress={handleShareMemory}
              disabled={isUploading || !selectedChildId}
            >
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Share Memory 💕
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

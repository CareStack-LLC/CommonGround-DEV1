/**
 * Watch Together - Content Selection Screen
 * Browse and select content to watch with connected children
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";
import { circle, type WatchTogetherContent } from "@commonground/api-client";

// Supabase storage base URL for demo content
const SUPABASE_STORAGE_URL = "https://qqttugwxmkbnrgzgqbkz.supabase.co/storage/v1/object/public/kidcoms";

// Demo content
const DEMO_CONTENT: WatchTogetherContent[] = [
  {
    id: "crunch",
    title: "Crunch",
    description: "A fun animated short about a hungry creature!",
    thumbnail_url: "https://picsum.photos/seed/crunch/400/225",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Crunch.mp4`,
    duration_seconds: 240,
    category: "animation",
    age_rating: "G",
  },
  {
    id: "johnny-express",
    title: "Johnny Express",
    description: "Follow Johnny on his hilarious space delivery adventure!",
    thumbnail_url: "https://picsum.photos/seed/johnny/400/225",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Johnny%20Express.mp4`,
    duration_seconds: 330,
    category: "animation",
    age_rating: "G",
  },
  {
    id: "minions",
    title: "Minions",
    description: "Watch the silly Minions in action!",
    thumbnail_url: "https://picsum.photos/seed/minions/400/225",
    content_url: `${SUPABASE_STORAGE_URL}/videos/minions-clip.mp4`,
    duration_seconds: 180,
    category: "animation",
    age_rating: "G",
  },
  {
    id: "sonic",
    title: "Sonic The Hedgehog",
    description: "Gotta go fast with Sonic!",
    thumbnail_url: "https://picsum.photos/seed/sonic/400/225",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Sonic%20The%20Hedgehog.mp4`,
    duration_seconds: 150,
    category: "animation",
    age_rating: "G",
  },
  {
    id: "the-bread",
    title: "The Bread",
    description: "A charming animated short about bread!",
    thumbnail_url: "https://picsum.photos/seed/bread/400/225",
    content_url: `${SUPABASE_STORAGE_URL}/videos/The%20Bread.mp4`,
    duration_seconds: 120,
    category: "animation",
    age_rating: "G",
  },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🎬" },
  { id: "animation", label: "Animation", emoji: "🎭" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "nature", label: "Nature", emoji: "🌿" },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function WatchTogetherScreen() {
  const { connectedChildren } = useAuth();
  const [content, setContent] = useState<WatchTogetherContent[]>(DEMO_CONTENT);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedContent, setSelectedContent] = useState<WatchTogetherContent | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Fetch content
  const fetchContent = useCallback(async () => {
    try {
      const response = await circle.watchTogether.getContent({
        category: selectedCategory === "all" ? undefined : selectedCategory,
      });
      if (response.items.length > 0) {
        setContent(response.items);
      }
    } catch (error) {
      console.error("Failed to fetch content:", error);
      // Use demo content
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setIsLoading(true);
    fetchContent();
  }, [fetchContent]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContent();
  }, [fetchContent]);

  const filteredContent =
    selectedCategory === "all"
      ? content
      : content.filter((c) => c.category === selectedCategory);

  const handleContentPress = (item: WatchTogetherContent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedContent(item);
    setSelectedChildId(connectedChildren[0]?.id || null);
    setShowInviteModal(true);
  };

  const handleStartSession = async () => {
    if (!selectedContent || !selectedChildId) return;

    setIsStarting(true);
    try {
      const session = await circle.watchTogether.createSession(
        selectedChildId,
        selectedContent.id
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowInviteModal(false);

      // Navigate to session
      router.push({
        pathname: "/watch-together/session",
        params: {
          sessionId: session.id,
          contentUrl: selectedContent.content_url,
          title: selectedContent.title,
        },
      });
    } catch (error) {
      console.error("Failed to start session:", error);
      // For demo, still navigate
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowInviteModal(false);

      router.push({
        pathname: "/watch-together/session",
        params: {
          sessionId: "demo-session",
          contentUrl: selectedContent.content_url,
          title: selectedContent.title,
          childName: connectedChildren.find((c) => c.id === selectedChildId)?.name || "Child",
        },
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <LinearGradient colors={["#7c3aed", "#8b5cf6", "#a78bfa"]} className="flex-1">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text className="text-2xl font-bold text-white">Watch Together</Text>
            <Text className="text-purple-200">Pick something to watch!</Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className={`px-4 py-2 rounded-full mr-2 flex-row items-center ${
                selectedCategory === cat.id ? "bg-white" : "bg-white/20"
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat.id);
              }}
            >
              <Text className="mr-1">{cat.emoji}</Text>
              <Text
                className={`font-bold ${
                  selectedCategory === cat.id ? "text-purple-600" : "text-white"
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content Grid */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="white"
            />
          }
        >
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="white" />
              <Text className="text-white mt-4">Loading content...</Text>
            </View>
          ) : filteredContent.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">📺</Text>
              <Text className="text-white text-xl">No content available</Text>
            </View>
          ) : (
            filteredContent.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                onPress={() => handleContentPress(item)}
              />
            ))
          )}
        </ScrollView>

        {/* Invite Modal */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Watch Together
                </Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Content Preview */}
              {selectedContent && (
                <View className="flex-row items-center mb-6">
                  <Image
                    source={{ uri: selectedContent.thumbnail_url }}
                    className="w-24 h-16 rounded-xl"
                  />
                  <View className="ml-4 flex-1">
                    <Text className="font-bold text-gray-800">
                      {selectedContent.title}
                    </Text>
                    <Text className="text-gray-500">
                      {formatDuration(selectedContent.duration_seconds)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Child Selector */}
              <Text className="text-gray-600 font-medium mb-3">Watch with:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6"
              >
                {connectedChildren.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    className={`mr-4 items-center ${
                      selectedChildId === child.id ? "opacity-100" : "opacity-50"
                    }`}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <View
                      className={`w-16 h-16 rounded-full items-center justify-center ${
                        selectedChildId === child.id
                          ? "bg-purple-100 border-2 border-purple-500"
                          : "bg-gray-100"
                      }`}
                    >
                      <Text className="text-3xl">
                        {child.age < 10 ? "👧" : "🧑"}
                      </Text>
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        selectedChildId === child.id
                          ? "text-purple-600 font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Info */}
              <View className="bg-purple-50 rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="videocam" size={20} color="#7c3aed" />
                  <Text className="text-purple-800 font-medium ml-2">
                    Video call included!
                  </Text>
                </View>
                <Text className="text-purple-600 text-sm">
                  You'll be on a video call while watching together, so you can react
                  and chat!
                </Text>
              </View>

              {/* Start Button */}
              <TouchableOpacity
                className={`py-4 rounded-xl items-center ${
                  isStarting || !selectedChildId ? "bg-gray-300" : "bg-purple-500"
                }`}
                onPress={handleStartSession}
                disabled={isStarting || !selectedChildId}
              >
                {isStarting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    🎬 Start Watching
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ContentCard({
  content,
  onPress,
}: {
  content: WatchTogetherContent;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="mb-4 bg-white/10 rounded-2xl overflow-hidden"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: content.thumbnail_url }}
        className="w-full h-48"
        resizeMode="cover"
      />
      <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
        <Text className="text-white text-sm font-bold">
          {formatDuration(content.duration_seconds)}
        </Text>
      </View>
      <View className="p-4">
        <Text className="text-white font-bold text-lg">{content.title}</Text>
        <Text className="text-purple-200 mt-1" numberOfLines={2}>
          {content.description}
        </Text>
        <View className="flex-row items-center mt-2">
          <View className="bg-white/20 px-2 py-1 rounded-full">
            <Text className="text-white text-xs capitalize">
              {content.category}
            </Text>
          </View>
          <View className="bg-green-500/30 px-2 py-1 rounded-full ml-2">
            <Text className="text-white text-xs">{content.age_rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

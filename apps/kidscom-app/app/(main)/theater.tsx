/**
 * Theater Screen for Kidscom App
 * Watch videos alone or together with family members
 */

import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { child, type TheaterContent, type ContentFilters } from "@commonground/api-client";
import { useCircleContacts, CircleContact } from "@/hooks/useCircleContacts";

// Supabase storage base URL
const SUPABASE_STORAGE_URL = "https://qqttugwxmkbnrgzgqbkz.supabase.co/storage/v1/object/public/kidcoms";

// Real videos from Supabase storage
const DEMO_VIDEOS: TheaterContent[] = [
  {
    id: "crunch",
    title: "Crunch",
    description: "A fun animated short about a hungry creature!",
    thumbnail_url: "https://picsum.photos/seed/crunch/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Crunch.mp4`,
    content_type: "video",
    category: "fun",
    duration_seconds: 240,
    age_rating: "G",
    is_approved: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "johnny-express",
    title: "Johnny Express",
    description: "Follow Johnny on his hilarious space delivery adventure!",
    thumbnail_url: "https://picsum.photos/seed/johnny/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Johnny%20Express.mp4`,
    content_type: "video",
    category: "fun",
    duration_seconds: 330,
    age_rating: "G",
    is_approved: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "minions",
    title: "Minions",
    description: "Watch the silly Minions in action!",
    thumbnail_url: "https://picsum.photos/seed/minions/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/videos/minions-clip.mp4`,
    content_type: "video",
    category: "fun",
    duration_seconds: 180,
    age_rating: "G",
    is_approved: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "sonic",
    title: "Sonic The Hedgehog",
    description: "Gotta go fast with Sonic!",
    thumbnail_url: "https://picsum.photos/seed/sonic/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/videos/Sonic%20The%20Hedgehog.mp4`,
    content_type: "video",
    category: "fun",
    duration_seconds: 150,
    age_rating: "G",
    is_approved: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "the-bread",
    title: "The Bread",
    description: "A charming animated short about bread!",
    thumbnail_url: "https://picsum.photos/seed/bread/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/videos/The%20Bread.mp4`,
    content_type: "video",
    category: "fun",
    duration_seconds: 120,
    age_rating: "G",
    is_approved: true,
    created_at: new Date().toISOString(),
  },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "animals", label: "Animals" },
  { id: "science", label: "Science" },
  { id: "music", label: "Music" },
  { id: "fun", label: "Fun" },
];

// Format seconds to MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TheaterScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<TheaterContent | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [videos, setVideos] = useState<TheaterContent[]>(DEMO_VIDEOS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ContentFilters | null>(null);

  const { contacts } = useCircleContacts();

  // Load content - use demo data directly since child auth isn't set up
  // In production, this would fetch from API with child.theater.getContent()
  useEffect(() => {
    // Use demo videos directly - no API call needed
    setVideos(DEMO_VIDEOS);
    setFilters({
      allowed_categories: ["animals", "science", "music", "fun", "educational", "stories"],
      max_age_rating: "G",
      daily_time_limit_minutes: 60,
      time_remaining_minutes: 45,
    });
    setIsLoading(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Just reset to demo data
    setVideos(DEMO_VIDEOS);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const filteredVideos =
    selectedCategory === "all"
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  const handleVideoPress = (video: TheaterContent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVideo(video);
  };

  const handleWatchNow = () => {
    if (!selectedVideo) return;

    // Check time limit
    if (filters && filters.time_remaining_minutes <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("You've reached your screen time limit for today! Come back tomorrow! 🌟");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVideo(null);

    // Navigate to player
    router.push({
      pathname: "/theater/player",
      params: {
        contentId: selectedVideo.id,
        title: selectedVideo.title,
        url: selectedVideo.content_url,
      },
    });
  };

  const handleWatchTogether = () => {
    if (!selectedVideo) return;

    // Check time limit
    if (filters && filters.time_remaining_minutes <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("You've reached your screen time limit for today! Come back tomorrow! 🌟");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowContactPicker(true);
  };

  const handleSelectContact = (contact: CircleContact) => {
    if (!selectedVideo) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowContactPicker(false);

    // Navigate to Watch Together
    router.push({
      pathname: "/theater/watch-together",
      params: {
        contentId: selectedVideo.id,
        contactName: contact.display_name || contact.name,
      },
    });

    setSelectedVideo(null);
  };

  return (
    <LinearGradient
      colors={["#f97316", "#fb923c", "#fdba74"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <Text className="text-4xl font-bold text-white text-center">
            Theater 🎬
          </Text>
          <Text className="text-lg text-orange-200 text-center mt-1">
            Watch videos with family!
          </Text>
        </View>

        {/* Time Remaining Banner */}
        {filters && filters.time_remaining_minutes <= 30 && (
          <View className="mx-4 mb-3 bg-white/20 rounded-xl px-4 py-2 flex-row items-center">
            <Ionicons name="time-outline" size={20} color="white" />
            <Text className="text-white font-medium ml-2">
              {filters.time_remaining_minutes > 0
                ? `${filters.time_remaining_minutes} minutes of screen time left today`
                : "Screen time limit reached for today!"}
            </Text>
          </View>
        )}

        {/* Category Tabs */}
        <View className="h-10 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                className={`px-4 py-1.5 rounded-full mr-2 ${
                  selectedCategory === category.id ? "bg-white" : "bg-white/30"
                }`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(category.id);
                }}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedCategory === category.id
                      ? "text-orange-500"
                      : "text-white"
                  }`}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Video Grid */}
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
          {/* Featured Video - Large Hero Card */}
          {(() => {
            const featuredVideo = filteredVideos[0];
            if (!featuredVideo) return null;
            return (
              <TouchableOpacity
                className="mb-6"
                onPress={() => handleVideoPress(featuredVideo)}
                activeOpacity={0.9}
              >
                <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    source={{ uri: featuredVideo.thumbnail_url }}
                    className="w-full h-48"
                    resizeMode="cover"
                  />
                  {/* Play button overlay */}
                  <View className="absolute top-0 left-0 right-0 h-48 items-center justify-center">
                    <View className="w-20 h-20 bg-white/90 rounded-full items-center justify-center shadow-lg">
                      <Ionicons name="play" size={40} color="#f97316" />
                    </View>
                  </View>
                  {/* Featured badge */}
                  <View className="absolute top-3 left-3 bg-orange-500 px-3 py-1 rounded-full flex-row items-center">
                    <Ionicons name="star" size={14} color="white" />
                    <Text className="text-white font-bold text-sm ml-1">Featured</Text>
                  </View>
                  {/* Duration badge */}
                  <View className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full">
                    <Text className="text-white font-bold text-sm">
                      {formatDuration(featuredVideo.duration_seconds)}
                    </Text>
                  </View>
                  <View className="p-4">
                    <Text className="text-2xl font-bold text-gray-800 mb-1">
                      {featuredVideo.title}
                    </Text>
                    <Text className="text-gray-500 mb-3" numberOfLines={2}>
                      {featuredVideo.description}
                    </Text>
                    <View className="flex-row items-center">
                      <View className="bg-orange-100 px-3 py-1 rounded-full mr-2">
                        <Text className="text-orange-600 font-medium capitalize">
                          {featuredVideo.category}
                        </Text>
                      </View>
                      <View className="bg-green-100 px-3 py-1 rounded-full">
                        <Text className="text-green-600 font-medium">
                          {featuredVideo.age_rating}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* More Videos Label */}
          {filteredVideos.length > 1 && (
            <Text className="text-white font-bold text-lg mb-3">More Videos</Text>
          )}

          <View className="flex-row flex-wrap justify-between">
            {filteredVideos.slice(1).map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onPress={() => handleVideoPress(video)}
              />
            ))}
          </View>

          {filteredVideos.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">🎥</Text>
              <Text className="text-white text-xl text-center">
                No videos in this category yet!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Selected Video Preview - positioned above tab bar */}
        {selectedVideo && (
          <View className="absolute bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6">
            <View className="flex-row items-center mb-4">
              <Image
                source={{ uri: selectedVideo.thumbnail_url }}
                className="w-24 h-16 rounded-xl"
              />
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  {selectedVideo.title}
                </Text>
                <Text className="text-gray-500">
                  {formatDuration(selectedVideo.duration_seconds)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedVideo(null)}
                className="p-2"
              >
                <Text className="text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center ${
                  filters && filters.time_remaining_minutes <= 0
                    ? "bg-gray-300"
                    : "bg-orange-500"
                }`}
                onPress={handleWatchNow}
                disabled={filters !== null && filters.time_remaining_minutes <= 0}
              >
                <Text className="text-white font-bold text-lg">▶ Watch Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-4 rounded-2xl items-center ${
                  filters && filters.time_remaining_minutes <= 0
                    ? "bg-gray-300"
                    : "bg-purple-500"
                }`}
                onPress={handleWatchTogether}
                disabled={filters !== null && filters.time_remaining_minutes <= 0}
              >
                <Text className="text-white font-bold text-lg">
                  👥 Watch Together
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Contact Picker for Watch Together */}
        <Modal
          visible={showContactPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowContactPicker(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl p-6 max-h-[70%]">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-2xl font-bold text-gray-800">
                  Watch Together With... 👥
                </Text>
                <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                  <Text className="text-2xl">✕</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-gray-500 mb-4">
                Choose someone to video call while watching!
              </Text>

              <ScrollView className="max-h-80">
                {contacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    className="flex-row items-center p-4 bg-gray-50 rounded-2xl mb-3"
                    onPress={() => handleSelectContact(contact)}
                  >
                    <View className="w-14 h-14 bg-purple-100 rounded-full items-center justify-center">
                      {contact.avatar_url ? (
                        <Image
                          source={{ uri: contact.avatar_url }}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <Text className="text-3xl">
                          {getContactEmoji(contact.relationship)}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-lg font-bold text-gray-800">
                        {contact.display_name || contact.name}
                      </Text>
                      {contact.relationship && (
                        <Text className="text-gray-500 capitalize">
                          {contact.relationship}
                        </Text>
                      )}
                    </View>
                    {contact.is_online && (
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                        <Text className="text-green-600 font-medium">Online</Text>
                      </View>
                    )}
                    <Ionicons name="videocam" size={24} color="#8b5cf6" />
                  </TouchableOpacity>
                ))}

                {contacts.length === 0 && (
                  <View className="items-center py-8">
                    <Text className="text-4xl mb-2">😢</Text>
                    <Text className="text-gray-500 text-center">
                      No contacts available
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                className="bg-gray-100 py-4 rounded-2xl items-center mt-4"
                onPress={() => setShowContactPicker(false)}
              >
                <Text className="text-gray-600 font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

function VideoCard({
  video,
  onPress,
}: {
  video: TheaterContent;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="w-[48%] mb-4"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-2xl overflow-hidden shadow-lg">
        <Image
          source={{ uri: video.thumbnail_url }}
          className="w-full h-28"
          resizeMode="cover"
        />
        {/* Play button overlay */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-12 h-12 bg-black/40 rounded-full items-center justify-center">
            <Ionicons name="play" size={24} color="white" />
          </View>
        </View>
        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
          <Text className="text-white text-xs font-bold">
            {formatDuration(video.duration_seconds)}
          </Text>
        </View>
        <View className="p-3">
          <Text className="font-bold text-gray-800" numberOfLines={2}>
            {video.title}
          </Text>
          <Text className="text-sm text-gray-500 capitalize">{video.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getContactEmoji(relationship?: string): string {
  switch (relationship?.toLowerCase()) {
    case "grandparent":
    case "grandfather":
      return "👴";
    case "grandmother":
      return "👵";
    case "aunt":
      return "👩";
    case "uncle":
      return "👨";
    case "parent":
    case "mom":
    case "mother":
      return "👩";
    case "dad":
    case "father":
      return "👨";
    default:
      return "😊";
  }
}

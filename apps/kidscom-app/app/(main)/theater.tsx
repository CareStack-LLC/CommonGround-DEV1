/**
 * Theater Screen for Kidscom App
 * Watch videos alone or together with family members
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useCircleContacts, CircleContact } from "@/hooks/useCircleContacts";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
}

// Demo videos for the theater
const DEMO_VIDEOS: Video[] = [
  {
    id: "1",
    title: "Funny Animals",
    thumbnail: "https://picsum.photos/seed/animals/300/200",
    duration: "5:30",
    category: "Animals",
  },
  {
    id: "2",
    title: "Space Adventure",
    thumbnail: "https://picsum.photos/seed/space/300/200",
    duration: "12:45",
    category: "Science",
  },
  {
    id: "3",
    title: "Silly Songs",
    thumbnail: "https://picsum.photos/seed/music/300/200",
    duration: "3:20",
    category: "Music",
  },
  {
    id: "4",
    title: "Dinosaur World",
    thumbnail: "https://picsum.photos/seed/dinos/300/200",
    duration: "8:15",
    category: "Animals",
  },
  {
    id: "5",
    title: "Magic Tricks",
    thumbnail: "https://picsum.photos/seed/magic/300/200",
    duration: "6:00",
    category: "Fun",
  },
  {
    id: "6",
    title: "Ocean Friends",
    thumbnail: "https://picsum.photos/seed/ocean/300/200",
    duration: "10:30",
    category: "Animals",
  },
];

const CATEGORIES = ["All", "Animals", "Science", "Music", "Fun"];

export default function TheaterScreen() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const { contacts } = useCircleContacts();

  const filteredVideos =
    selectedCategory === "All"
      ? DEMO_VIDEOS
      : DEMO_VIDEOS.filter((v) => v.category === selectedCategory);

  const handleVideoPress = (video: Video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVideo(video);
  };

  const handleWatchNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPlayer(true);
    setIsPlaying(true);
  };

  const handleWatchTogether = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowContactPicker(true);
  };

  const handleSelectContact = (contact: CircleContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowContactPicker(false);
    setSelectedVideo(null);
    // Navigate to call screen - "Watch Together" starts a video call
    router.push(`/call/${contact.id}`);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setIsPlaying(false);
    setSelectedVideo(null);
  };

  return (
    <LinearGradient
      colors={["#f97316", "#fb923c", "#fdba74"]}
      className="flex-1"
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

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 mb-4"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              className={`px-5 py-2 rounded-full mr-2 ${
                selectedCategory === category ? "bg-white" : "bg-white/30"
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(category);
              }}
            >
              <Text
                className={`font-bold ${
                  selectedCategory === category
                    ? "text-orange-500"
                    : "text-white"
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Video Grid */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {filteredVideos.map((video) => (
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

        {/* Selected Video Preview */}
        {selectedVideo && !showPlayer && (
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6">
            <View className="flex-row items-center mb-4">
              <Image
                source={{ uri: selectedVideo.thumbnail }}
                className="w-24 h-16 rounded-xl"
              />
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  {selectedVideo.title}
                </Text>
                <Text className="text-gray-500">{selectedVideo.duration}</Text>
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
                className="flex-1 bg-orange-500 py-4 rounded-2xl items-center"
                onPress={handleWatchNow}
              >
                <Text className="text-white font-bold text-lg">▶ Watch Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-purple-500 py-4 rounded-2xl items-center"
                onPress={handleWatchTogether}
              >
                <Text className="text-white font-bold text-lg">
                  👥 Watch Together
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Video Player Modal */}
        <Modal
          visible={showPlayer}
          animationType="fade"
          supportedOrientations={["portrait", "landscape"]}
        >
          <View className="flex-1 bg-black">
            {/* Video placeholder - in a real app, use expo-av or similar */}
            <View className="flex-1 items-center justify-center">
              <Image
                source={{ uri: selectedVideo?.thumbnail }}
                className="absolute w-full h-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/30" />

              {/* Play/Pause indicator */}
              <TouchableOpacity
                className="w-24 h-24 bg-white/30 rounded-full items-center justify-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsPlaying(!isPlaying);
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={48}
                  color="white"
                />
              </TouchableOpacity>

              {/* Video title */}
              <View className="absolute top-16 left-0 right-0 px-6">
                <Text className="text-white text-2xl font-bold text-center">
                  {selectedVideo?.title}
                </Text>
                {isPlaying && (
                  <Text className="text-white/70 text-center mt-1">
                    Now Playing
                  </Text>
                )}
              </View>

              {/* Close button */}
              <TouchableOpacity
                className="absolute top-16 right-4 w-12 h-12 bg-black/50 rounded-full items-center justify-center"
                onPress={handleClosePlayer}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>

              {/* Progress bar placeholder */}
              <View className="absolute bottom-20 left-6 right-6">
                <View className="h-1 bg-white/30 rounded-full">
                  <View className="w-1/3 h-1 bg-orange-500 rounded-full" />
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-white/70 text-sm">1:45</Text>
                  <Text className="text-white/70 text-sm">
                    {selectedVideo?.duration}
                  </Text>
                </View>
              </View>

              {/* Info notice */}
              <View className="absolute bottom-6 left-6 right-6">
                <View className="bg-orange-500/80 px-4 py-2 rounded-xl">
                  <Text className="text-white text-center text-sm">
                    🎬 Video playback is a demo. Real videos coming soon!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>

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
  video: Video;
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
          source={{ uri: video.thumbnail }}
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
          <Text className="text-white text-xs font-bold">{video.duration}</Text>
        </View>
        <View className="p-3">
          <Text className="font-bold text-gray-800" numberOfLines={2}>
            {video.title}
          </Text>
          <Text className="text-sm text-gray-500">{video.category}</Text>
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

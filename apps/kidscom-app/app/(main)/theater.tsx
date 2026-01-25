import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

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

  const filteredVideos =
    selectedCategory === "All"
      ? DEMO_VIDEOS
      : DEMO_VIDEOS.filter((v) => v.category === selectedCategory);

  const handleVideoPress = (video: Video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVideo(video);
  };

  const handleWatchTogether = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In real app, this would start a watch party with a contact
    alert("Watch Together feature coming soon!");
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
                selectedCategory === category
                  ? "bg-white"
                  : "bg-white/30"
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
        {selectedVideo && (
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  alert("Playing: " + selectedVideo.title);
                }}
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

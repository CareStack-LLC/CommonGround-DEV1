/**
 * Library Screen for Kidscom App
 * Child-friendly content library with stories, audiobooks, and educational content
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

interface LibraryItem {
  id: string;
  title: string;
  thumbnail: string;
  type: "story" | "audiobook" | "activity";
  duration?: string;
  description: string;
}

// Demo content for the library
const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "1",
    title: "The Brave Little Star",
    thumbnail: "https://picsum.photos/seed/star/300/200",
    type: "story",
    duration: "10 min read",
    description: "A story about believing in yourself",
  },
  {
    id: "2",
    title: "Animal Friends",
    thumbnail: "https://picsum.photos/seed/animals2/300/200",
    type: "audiobook",
    duration: "15 min",
    description: "Listen to stories about forest animals",
  },
  {
    id: "3",
    title: "Space Explorer",
    thumbnail: "https://picsum.photos/seed/space2/300/200",
    type: "story",
    duration: "8 min read",
    description: "Journey through the solar system",
  },
  {
    id: "4",
    title: "Counting Fun",
    thumbnail: "https://picsum.photos/seed/numbers/300/200",
    type: "activity",
    description: "Learn numbers with fun games",
  },
  {
    id: "5",
    title: "Goodnight Moon",
    thumbnail: "https://picsum.photos/seed/moon/300/200",
    type: "audiobook",
    duration: "5 min",
    description: "A soothing bedtime story",
  },
  {
    id: "6",
    title: "Colors of the Rainbow",
    thumbnail: "https://picsum.photos/seed/rainbow/300/200",
    type: "activity",
    description: "Learn colors in a fun way",
  },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "📚" },
  { id: "story", label: "Stories", emoji: "📖" },
  { id: "audiobook", label: "Audio", emoji: "🎧" },
  { id: "activity", label: "Activities", emoji: "🎯" },
];

export default function LibraryScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const filteredItems =
    selectedCategory === "all"
      ? LIBRARY_ITEMS
      : LIBRARY_ITEMS.filter((item) => item.type === selectedCategory);

  const handleItemPress = (item: LibraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem(item);
  };

  const handleStartContent = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedItem(null);
    // In a real app, this would navigate to a content viewer
    alert(`Starting: ${selectedItem?.title}`);
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "story":
        return "📖";
      case "audiobook":
        return "🎧";
      case "activity":
        return "🎯";
      default:
        return "📚";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "story":
        return ["#8b5cf6", "#a78bfa"];
      case "audiobook":
        return ["#ec4899", "#f472b6"];
      case "activity":
        return ["#f97316", "#fb923c"];
      default:
        return ["#84cc16", "#a3e635"];
    }
  };

  return (
    <LinearGradient
      colors={["#84cc16", "#a3e635", "#bef264"]}
      className="flex-1"
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <Text className="text-4xl font-bold text-white text-center">
            My Library 📚
          </Text>
          <Text className="text-lg text-lime-200 text-center mt-1">
            Stories, audiobooks & fun activities!
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
              key={category.id}
              className={`px-5 py-2 rounded-full mr-2 flex-row items-center ${
                selectedCategory === category.id ? "bg-white" : "bg-white/30"
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(category.id);
              }}
            >
              <Text className="mr-1">{category.emoji}</Text>
              <Text
                className={`font-bold ${
                  selectedCategory === category.id
                    ? "text-lime-600"
                    : "text-white"
                }`}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content Grid */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between">
            {filteredItems.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                onPress={() => handleItemPress(item)}
              />
            ))}
          </View>

          {filteredItems.length === 0 && (
            <View className="items-center py-12">
              <Text className="text-6xl mb-4">📭</Text>
              <Text className="text-white text-xl text-center">
                No content in this category yet!
              </Text>
            </View>
          )}

          {/* Coming Soon Section */}
          <View className="mt-6 bg-white/20 rounded-3xl p-6">
            <Text className="text-2xl font-bold text-white text-center mb-2">
              More Coming Soon! ✨
            </Text>
            <Text className="text-lime-200 text-center">
              New stories and activities are added weekly!
            </Text>
          </View>
        </ScrollView>

        {/* Content Preview Modal */}
        {selectedItem && (
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6">
            <View className="flex-row items-center mb-4">
              <Image
                source={{ uri: selectedItem.thumbnail }}
                className="w-24 h-20 rounded-xl"
              />
              <View className="ml-4 flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="text-lg mr-1">
                    {getTypeEmoji(selectedItem.type)}
                  </Text>
                  <Text className="text-gray-500 capitalize">
                    {selectedItem.type}
                  </Text>
                </View>
                <Text className="text-xl font-bold text-gray-800">
                  {selectedItem.title}
                </Text>
                {selectedItem.duration && (
                  <Text className="text-gray-500">{selectedItem.duration}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedItem(null)}
                className="p-2"
              >
                <Text className="text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">{selectedItem.description}</Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 py-4 rounded-2xl items-center"
                style={{ backgroundColor: getTypeColor(selectedItem.type)[0] }}
                onPress={handleStartContent}
              >
                <Text className="text-white font-bold text-lg">
                  {selectedItem.type === "audiobook" ? "🎧 Listen Now" : "▶ Start"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function LibraryCard({
  item,
  onPress,
}: {
  item: LibraryItem;
  onPress: () => void;
}) {
  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "story":
        return "📖";
      case "audiobook":
        return "🎧";
      case "activity":
        return "🎯";
      default:
        return "📚";
    }
  };

  return (
    <TouchableOpacity
      className="w-[48%] mb-4"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-2xl overflow-hidden shadow-lg">
        <Image
          source={{ uri: item.thumbnail }}
          className="w-full h-28"
          resizeMode="cover"
        />
        <View className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-lg flex-row items-center">
          <Text className="text-sm mr-1">{getTypeEmoji(item.type)}</Text>
          <Text className="text-xs font-bold text-gray-700 capitalize">
            {item.type}
          </Text>
        </View>
        {item.duration && (
          <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-lg">
            <Text className="text-white text-xs font-bold">{item.duration}</Text>
          </View>
        )}
        <View className="p-3">
          <Text className="font-bold text-gray-800" numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

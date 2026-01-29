/**
 * Library Screen for Kidscom App
 * Child-friendly content library with stories, audiobooks, and educational content
 *
 * Features:
 * - Content browsing by category
 * - Favorites with heart toggle
 * - Progress tracking
 * - Pull-to-refresh
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { child, type LibraryItem } from "@commonground/api-client";

// Supabase storage base URL
const SUPABASE_STORAGE_URL = "https://qqttugwxmkbnrgzgqbkz.supabase.co/storage/v1/object/public/kidcoms";

// Real books from Supabase storage (PDFs)
const DEMO_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: "my-family",
    title: "My Family",
    description: "A heartwarming story about family love by Starfall",
    type: "book",
    thumbnail_url: "https://picsum.photos/seed/myfamily/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/15-MyFamily-by-Starfall.pdf`,
    category: "family",
    age_rating: "G",
    duration_minutes: 10,
    is_favorite: false,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "peg",
    title: "Peg",
    description: "Learn to read with Peg by Starfall",
    type: "book",
    thumbnail_url: "https://picsum.photos/seed/peg/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/2-Peg-by-Starfall.pdf`,
    category: "reading",
    age_rating: "G",
    duration_minutes: 5,
    is_favorite: false,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "sky-ride",
    title: "Sky Ride",
    description: "An exciting adventure in the sky by Starfall",
    type: "book",
    thumbnail_url: "https://picsum.photos/seed/skyride/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/8-SkyRide-by-Starfall.pdf`,
    category: "adventure",
    age_rating: "G",
    duration_minutes: 8,
    is_favorite: true,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "reach-for-stars",
    title: "Reach For The Stars",
    description: "Dream big and reach for the stars!",
    type: "book",
    thumbnail_url: "https://picsum.photos/seed/stars/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/ReachForTheStars_by_Starfall.pdf`,
    category: "inspirational",
    age_rating: "G",
    duration_minutes: 12,
    is_favorite: false,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "backpack-bears",
    title: "Backpack Bears Plant Book",
    description: "Learn about plants with the Backpack Bears!",
    type: "educational",
    thumbnail_url: "https://picsum.photos/seed/bears/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/SB776_backpack-bears-plant-book.pdf`,
    category: "nature",
    age_rating: "G",
    duration_minutes: 15,
    is_favorite: false,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "soap-boat",
    title: "Soap Boat",
    description: "A fun story about a boat made of soap!",
    type: "book",
    thumbnail_url: "https://picsum.photos/seed/soapboat/300/200",
    content_url: `${SUPABASE_STORAGE_URL}/books/Soap%20Boat.pdf`,
    category: "fun",
    age_rating: "G",
    duration_minutes: 7,
    is_favorite: true,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
  // Keep one activity for the interactive learning feature
  {
    id: "counting-fun",
    title: "Counting Fun",
    description: "Learn numbers with fun games",
    type: "activity",
    thumbnail_url: "https://picsum.photos/seed/numbers/300/200",
    category: "math",
    age_rating: "G",
    is_favorite: false,
    progress_percent: 0,
    created_at: new Date().toISOString(),
  },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "📚" },
  { id: "favorites", label: "Favorites", emoji: "❤️" },
  { id: "book", label: "Books", emoji: "📖" },
  { id: "story", label: "Stories", emoji: "📕" },
  { id: "activity", label: "Activities", emoji: "🎯" },
  { id: "educational", label: "Learning", emoji: "🎓" },
];

export default function LibraryScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [items, setItems] = useState<LibraryItem[]>(DEMO_LIBRARY_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch library content
  const fetchContent = useCallback(async () => {
    try {
      const isFavorites = selectedCategory === "favorites";
      const response = await child.kidcoms.getLibraryContent({
        type: isFavorites ? undefined : selectedCategory === "all" ? undefined : selectedCategory,
        favorites_only: isFavorites,
        limit: 50,
      });
      setItems(response.items);
    } catch (error) {
      console.error("Failed to fetch library content:", error);
      // Use demo data
      setItems(DEMO_LIBRARY_ITEMS);
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

  const filteredItems =
    selectedCategory === "all"
      ? items
      : selectedCategory === "favorites"
      ? items.filter((item) => item.is_favorite)
      : items.filter((item) => item.type === selectedCategory);

  const handleItemPress = (item: LibraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem(item);
  };

  const handleToggleFavorite = async (item: LibraryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i
      )
    );

    try {
      await child.kidcoms.toggleFavorite(item.id);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      // Revert on error
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_favorite: item.is_favorite } : i
        )
      );
    }
  };

  const handleStartContent = () => {
    if (!selectedItem) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedItem(null);

    // Navigate to content viewer based on type
    if (selectedItem.type === "activity") {
      router.push({
        pathname: "/library/activity",
        params: { itemId: selectedItem.id, title: selectedItem.title },
      });
    } else {
      router.push({
        pathname: "/library/reader",
        params: {
          itemId: selectedItem.id,
          title: selectedItem.title,
          contentUrl: selectedItem.content_url || "",
          contentType: selectedItem.type,
        },
      });
    }
  };

  const handleReadTogether = () => {
    if (!selectedItem) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedItem(null);

    // Navigate to Read Together screen
    router.push({
      pathname: "/library/read-together",
      params: {
        itemId: selectedItem.id,
        title: selectedItem.title,
        contentUrl: selectedItem.content_url || "",
      },
    });
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "book":
        return "📖";
      case "story":
        return "📕";
      case "activity":
        return "🎯";
      case "educational":
        return "🎓";
      default:
        return "📚";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "book":
        return ["#8b5cf6", "#a78bfa"];
      case "story":
        return ["#ec4899", "#f472b6"];
      case "activity":
        return ["#f97316", "#fb923c"];
      case "educational":
        return ["#3b82f6", "#60a5fa"];
      default:
        return ["#84cc16", "#a3e635"];
    }
  };

  return (
    <LinearGradient
      colors={["#84cc16", "#a3e635", "#bef264"]}
      style={{ flex: 1 }}
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
        <View className="h-10 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                className={`px-3 py-1.5 rounded-full mr-2 flex-row items-center ${
                  selectedCategory === category.id ? "bg-white" : "bg-white/30"
                }`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(category.id);
                }}
              >
                <Text className="text-sm mr-1">{category.emoji}</Text>
                <Text
                  className={`font-semibold text-sm ${
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
        </View>

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
              <Text className="text-white text-lg mt-4">Loading library...</Text>
            </View>
          ) : (
            <>
              {/* Featured Book - Large Hero Card */}
              {(() => {
                const featuredItem = filteredItems[0];
                if (!featuredItem || featuredItem.type === "activity") return null;
                return (
                  <TouchableOpacity
                    className="mb-6"
                    onPress={() => handleItemPress(featuredItem)}
                    activeOpacity={0.9}
                  >
                    <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                      <Image
                        source={{ uri: featuredItem.thumbnail_url }}
                        className="w-full h-44"
                        resizeMode="cover"
                      />
                      {/* Book icon overlay */}
                      <View className="absolute top-0 left-0 right-0 h-44 items-center justify-center">
                        <View className="w-20 h-20 bg-white/90 rounded-full items-center justify-center shadow-lg">
                          <Text className="text-4xl">📖</Text>
                        </View>
                      </View>
                      {/* Featured badge */}
                      <View className="absolute top-3 left-3 bg-lime-500 px-3 py-1 rounded-full flex-row items-center">
                        <Ionicons name="star" size={14} color="white" />
                        <Text className="text-white font-bold text-sm ml-1">Featured</Text>
                      </View>
                      {/* Duration badge */}
                      {featuredItem.duration_minutes && (
                        <View className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full">
                          <Text className="text-white font-bold text-sm">
                            {featuredItem.duration_minutes} min
                          </Text>
                        </View>
                      )}
                      {/* Favorite button */}
                      <TouchableOpacity
                        className="absolute top-12 right-3 w-10 h-10 bg-white/90 rounded-full items-center justify-center"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(featuredItem);
                        }}
                      >
                        <Ionicons
                          name={featuredItem.is_favorite ? "heart" : "heart-outline"}
                          size={22}
                          color={featuredItem.is_favorite ? "#ef4444" : "#9ca3af"}
                        />
                      </TouchableOpacity>
                      <View className="p-4">
                        <Text className="text-2xl font-bold text-gray-800 mb-1">
                          {featuredItem.title}
                        </Text>
                        <Text className="text-gray-500 mb-3" numberOfLines={2}>
                          {featuredItem.description}
                        </Text>
                        <View className="flex-row items-center">
                          <View className="bg-lime-100 px-3 py-1 rounded-full mr-2 flex-row items-center">
                            <Text className="mr-1">{getTypeEmoji(featuredItem.type)}</Text>
                            <Text className="text-lime-600 font-medium capitalize">
                              {featuredItem.type}
                            </Text>
                          </View>
                          <View className="bg-purple-100 px-3 py-1 rounded-full flex-row items-center">
                            <Text className="text-purple-600 font-medium">👥 Read Together</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* More Books Label */}
              {filteredItems.length > 1 && filteredItems[0]?.type !== "activity" && (
                <Text className="text-white font-bold text-lg mb-3">More Books</Text>
              )}

              <View className="flex-row flex-wrap justify-between">
                {filteredItems.slice(filteredItems[0]?.type !== "activity" ? 1 : 0).map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    onPress={() => handleItemPress(item)}
                    onFavoritePress={() => handleToggleFavorite(item)}
                  />
                ))}
              </View>
            </>
          )}

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
          <View className="absolute bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 pb-8">
            <View className="flex-row items-center mb-4">
              <Image
                source={{ uri: selectedItem.thumbnail_url }}
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
                  {selectedItem.is_favorite && (
                    <Ionicons
                      name="heart"
                      size={16}
                      color="#ef4444"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </View>
                <Text className="text-xl font-bold text-gray-800">
                  {selectedItem.title}
                </Text>
                {selectedItem.duration_minutes && (
                  <Text className="text-gray-500">
                    {selectedItem.duration_minutes} min
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedItem(null)}
                className="p-2"
              >
                <Text className="text-2xl">✕</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-2">{selectedItem.description}</Text>

            {/* Progress indicator */}
            {selectedItem.progress_percent !== undefined &&
              selectedItem.progress_percent > 0 && (
                <View className="mb-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Progress</Text>
                    <Text className="text-gray-500 text-sm">
                      {selectedItem.progress_percent}%
                    </Text>
                  </View>
                  <View className="h-2 bg-gray-200 rounded-full">
                    <View
                      className={`h-2 rounded-full ${
                        selectedItem.progress_percent >= 100
                          ? "bg-green-500"
                          : "bg-lime-500"
                      }`}
                      style={{
                        width: `${Math.min(selectedItem.progress_percent, 100)}%`,
                      }}
                    />
                  </View>
                </View>
              )}

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 py-4 rounded-2xl items-center"
                style={{ backgroundColor: getTypeColor(selectedItem.type)[0] }}
                onPress={handleStartContent}
              >
                <Text className="text-white font-bold text-lg">
                  {selectedItem.progress_percent && selectedItem.progress_percent > 0
                    ? selectedItem.progress_percent >= 100
                      ? "📖 Read Again"
                      : "▶ Continue"
                    : "▶ Start"}
                </Text>
              </TouchableOpacity>

              {/* Read Together button - only for books/stories, not activities */}
              {selectedItem.type !== "activity" && (
                <TouchableOpacity
                  className="py-4 px-4 rounded-2xl items-center bg-purple-500"
                  onPress={handleReadTogether}
                >
                  <Text className="text-white font-bold text-sm">👥</Text>
                  <Text className="text-white font-bold text-xs">Together</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className="py-4 px-4 rounded-2xl items-center bg-gray-100"
                onPress={() => handleToggleFavorite(selectedItem)}
              >
                <Ionicons
                  name={selectedItem.is_favorite ? "heart" : "heart-outline"}
                  size={24}
                  color={selectedItem.is_favorite ? "#ef4444" : "#9ca3af"}
                />
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
  onFavoritePress,
}: {
  item: LibraryItem;
  onPress: () => void;
  onFavoritePress: () => void;
}) {
  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "book":
        return "📖";
      case "story":
        return "📕";
      case "activity":
        return "🎯";
      case "educational":
        return "🎓";
      default:
        return "📚";
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    return `${minutes} min`;
  };

  return (
    <TouchableOpacity
      className="w-[48%] mb-4"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-2xl overflow-hidden shadow-lg">
        <Image
          source={{ uri: item.thumbnail_url }}
          className="w-full h-28"
          resizeMode="cover"
        />

        {/* Type badge */}
        <View className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded-lg flex-row items-center">
          <Text className="text-sm mr-1">{getTypeEmoji(item.type)}</Text>
          <Text className="text-xs font-bold text-gray-700 capitalize">
            {item.type}
          </Text>
        </View>

        {/* Duration badge */}
        {item.duration_minutes && (
          <View className="absolute top-2 right-10 bg-black/60 px-2 py-1 rounded-lg">
            <Text className="text-white text-xs font-bold">
              {formatDuration(item.duration_minutes)}
            </Text>
          </View>
        )}

        {/* Favorite button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onFavoritePress();
          }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full items-center justify-center"
        >
          <Ionicons
            name={item.is_favorite ? "heart" : "heart-outline"}
            size={16}
            color={item.is_favorite ? "#ef4444" : "#9ca3af"}
          />
        </TouchableOpacity>

        {/* Progress bar */}
        {item.progress_percent !== undefined && item.progress_percent > 0 && (
          <View className="absolute bottom-[72px] left-0 right-0 h-1 bg-gray-200">
            <View
              className={`h-1 ${
                item.progress_percent >= 100 ? "bg-green-500" : "bg-lime-500"
              }`}
              style={{ width: `${Math.min(item.progress_percent, 100)}%` }}
            />
          </View>
        )}

        <View className="p-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-gray-800 flex-1" numberOfLines={2}>
              {item.title}
            </Text>
            {item.progress_percent === 100 && (
              <View className="ml-1">
                <Text>✅</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {item.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

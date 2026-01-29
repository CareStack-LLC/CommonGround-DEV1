/**
 * Library Reader Screen
 *
 * Full-screen reading experience for books and stories.
 * Features:
 * - PDF viewing via WebView
 * - Progress tracking
 * - Zoom controls
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";

import { child } from "@commonground/api-client";

export default function ReaderScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    title: string;
    contentUrl: string;
    contentType: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPDF = params.contentUrl?.endsWith(".pdf");

  // Google Docs PDF viewer URL (works better on mobile)
  const pdfViewerUrl = isPDF
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(params.contentUrl || "")}`
    : params.contentUrl;

  // Mark as started
  useEffect(() => {
    if (!params.itemId) return;

    const markStarted = async () => {
      try {
        await child.kidcoms.updateProgress(params.itemId, 10);
      } catch {
        // Silent fail
      }
    };

    markStarted();
  }, [params.itemId]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mark as partially read
    if (params.itemId) {
      child.kidcoms.updateProgress(params.itemId, 50).catch(() => {});
    }

    router.back();
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Mark as complete
    if (params.itemId) {
      child.kidcoms.updateProgress(params.itemId, 100).catch(() => {});
    }

    router.back();
  };

  // Error state
  if (!params.contentUrl) {
    return (
      <View className="flex-1 bg-amber-50 items-center justify-center">
        <Text className="text-6xl mb-4">📚</Text>
        <Text className="text-amber-800 text-xl text-center px-6">
          No content available
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          className="mt-6 bg-amber-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        {showControls && (
          <View className="flex-row items-center justify-between px-4 py-3 bg-amber-500">
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text
                className="text-lg font-bold text-white text-center"
                numberOfLines={1}
              >
                {params.title || "Book"}
              </Text>
              <Text className="text-amber-100 text-center text-xs">
                {isPDF ? "PDF Book" : "Story"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleComplete}
              className="px-4 py-2 bg-white/20 rounded-full"
            >
              <Text className="text-white font-bold text-sm">Done ✓</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PDF/Content Viewer */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
          className="flex-1"
        >
          {isLoading && (
            <View className="absolute inset-0 items-center justify-center bg-amber-50 z-10">
              <ActivityIndicator size="large" color="#d97706" />
              <Text className="text-amber-800 text-lg mt-4">
                Loading book...
              </Text>
            </View>
          )}

          {error ? (
            <View className="flex-1 items-center justify-center bg-amber-50 px-6">
              <Text className="text-6xl mb-4">😕</Text>
              <Text className="text-amber-800 text-xl text-center mb-2">
                Couldn't load the book
              </Text>
              <Text className="text-amber-600 text-center mb-6">{error}</Text>
              <TouchableOpacity
                onPress={handleClose}
                className="bg-amber-500 px-6 py-3 rounded-full"
              >
                <Text className="text-white font-bold">Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <WebView
              source={{ uri: pdfViewerUrl || "" }}
              style={{ flex: 1 }}
              onLoadStart={() => setIsLoading(true)}
              onLoadEnd={() => setIsLoading(false)}
              onError={(e) => {
                setError(e.nativeEvent.description || "Failed to load");
                setIsLoading(false);
              }}
              scalesPageToFit
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
            />
          )}
        </TouchableOpacity>

        {/* Footer hint */}
        {showControls && !isLoading && !error && (
          <View className="bg-amber-100 px-4 py-2">
            <Text className="text-amber-700 text-center text-sm">
              📖 Pinch to zoom • Swipe to turn pages
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

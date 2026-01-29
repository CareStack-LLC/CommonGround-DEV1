/**
 * Theater Video Player Screen
 *
 * Full-featured video player for theater mode with:
 * - Video playback controls
 * - Progress tracking
 * - Time remaining display
 * - Parent-set time limits
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio, Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";

import { child, type TheaterContent } from "@commonground/api-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Supabase storage URL for KidComs videos
const SUPABASE_STORAGE_URL = "https://qqttugwxmkbnrgzgqbkz.supabase.co/storage/v1/object/public/kidcoms";

// Demo content for testing
const DEMO_CONTENT: TheaterContent = {
  id: "demo-1",
  title: "Crunch",
  description: "A fun animated short!",
  thumbnail_url: "https://picsum.photos/seed/crunch/800/450",
  content_url: `${SUPABASE_STORAGE_URL}/videos/Crunch.mp4`,
  content_type: "video",
  category: "fun",
  duration_seconds: 240,
  age_rating: "G",
  is_approved: true,
  created_at: new Date().toISOString(),
};

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    contentId?: string;
    title?: string;
    url?: string;
  }>();

  const videoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [content, setContent] = useState<TheaterContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch content
  useEffect(() => {
    const loadContent = async () => {
      // If URL is passed directly (from theater screen), use it immediately
      // This avoids needing API authentication for demo/local content
      if (params.url) {
        console.log("Using passed URL directly:", params.url);
        setContent({
          ...DEMO_CONTENT,
          id: params.contentId || "direct-play",
          title: params.title || "Video",
          content_url: params.url,
        });
        setIsLoading(false);
        return;
      }

      // Try to fetch from API (requires auth)
      try {
        if (params.contentId) {
          const data = await child.theater.getContentById(params.contentId);
          setContent(data);

          // Get time limits
          try {
            const filters = await child.theater.getContentFilters();
            setTimeRemaining(filters.time_remaining_minutes);
          } catch {
            setTimeRemaining(null);
          }
        } else {
          // No URL or contentId - use demo
          setContent(DEMO_CONTENT);
        }
      } catch (error) {
        console.error("Failed to load content from API:", error);
        // Fallback to demo content
        setContent(DEMO_CONTENT);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [params.contentId, params.url, params.title]);

  // Lock to landscape on mount, unlock on unmount
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    };

    const unlockOrientation = async () => {
      await ScreenOrientation.unlockAsync();
    };

    lockOrientation();
    return () => {
      unlockOrientation();
    };
  }, []);

  // Configure audio
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Handle playback status updates
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setIsBuffering(true);
        return;
      }

      setIsBuffering(status.isBuffering);
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);

      // Save progress periodically
      if (
        content &&
        status.positionMillis % 10000 < 1000 &&
        status.positionMillis > 0
      ) {
        child.theater.updateWatchProgress(
          content.id,
          Math.floor(status.positionMillis / 1000),
          status.didJustFinish
        ).catch(() => {});
      }

      // Check if finished
      if (status.didJustFinish) {
        handleClose();
      }
    },
    [content]
  );

  // Toggle play/pause
  const togglePlayPause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowControls(true);
    resetControlsTimeout();

    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  };

  // Seek to position
  const handleSeek = async (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await videoRef.current?.setPositionAsync(value);
    setShowControls(true);
    resetControlsTimeout();
  };

  // Skip forward/backward
  const skip = async (seconds: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPosition = Math.max(0, Math.min(duration, position + seconds * 1000));
    await videoRef.current?.setPositionAsync(newPosition);
    setShowControls(true);
    resetControlsTimeout();
  };

  // Toggle controls visibility
  const handleScreenTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowControls(!showControls);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  // Close player
  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save final progress
    if (content && position > 0) {
      try {
        await child.theater.updateWatchProgress(
          content.id,
          Math.floor(position / 1000),
          position >= duration * 0.9
        );
      } catch {}
    }

    router.back();
  };

  // Format time
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ color: "#fff", fontSize: 18, marginTop: 16 }}>Loading video...</Text>
      </View>
    );
  }

  const videoUrl = content?.content_url || DEMO_CONTENT.content_url;
  console.log("Playing video URL:", videoUrl);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      {/* Video Player */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleScreenTap}
        style={{ flex: 1 }}
      >
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={{ flex: 1, width: "100%", height: "100%" }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          useNativeControls={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={() => console.log("Video loaded successfully")}
          onError={(error) => {
            console.error("Video error:", error);
            Alert.alert("Error", `Failed to play video: ${JSON.stringify(error)}`, [
              { text: "OK", onPress: handleClose },
            ]);
          }}
        />

        {/* Buffering Indicator */}
        {isBuffering && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }}>
            {/* Top Bar */}
            <View className="flex-row items-center justify-between px-6 pt-4">
              <TouchableOpacity
                onPress={handleClose}
                className="w-12 h-12 bg-black/50 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>

              <View className="flex-1 mx-4">
                <Text
                  className="text-white text-xl font-bold text-center"
                  numberOfLines={1}
                >
                  {content?.title || "Video"}
                </Text>
              </View>

              {/* Time Remaining Warning */}
              {timeRemaining !== null && timeRemaining <= 15 && (
                <View className="bg-red-500/80 px-3 py-1 rounded-full">
                  <Text className="text-white font-bold">
                    {timeRemaining}m left
                  </Text>
                </View>
              )}
            </View>

            {/* Center Controls */}
            <View className="flex-1 flex-row items-center justify-center space-x-12">
              {/* Rewind */}
              <TouchableOpacity
                onPress={() => skip(-10)}
                className="w-16 h-16 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="play-back" size={32} color="white" />
                <Text className="text-white text-xs absolute -bottom-4">10s</Text>
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                onPress={togglePlayPause}
                className="w-24 h-24 bg-orange-500 rounded-full items-center justify-center"
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={48}
                  color="white"
                />
              </TouchableOpacity>

              {/* Fast Forward */}
              <TouchableOpacity
                onPress={() => skip(10)}
                className="w-16 h-16 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="play-forward" size={32} color="white" />
                <Text className="text-white text-xs absolute -bottom-4">10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar - Progress */}
            <View className="px-6 pb-6">
              <View className="flex-row items-center">
                <Text className="text-white text-sm w-12">
                  {formatTime(position)}
                </Text>

                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={0}
                  maximumValue={duration}
                  value={position}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor="#f97316"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#f97316"
                />

                <Text className="text-white text-sm w-12 text-right">
                  {formatTime(duration)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

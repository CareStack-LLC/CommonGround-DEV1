/**
 * Watch Together Session Screen
 * Video player with picture-in-picture video call
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";

import { circle } from "@commonground/api-client";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Emoji reactions for Watch Together
const REACTIONS = ["😂", "❤️", "😮", "👏", "🎉", "😢"];

export default function WatchTogetherSessionScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    contentUrl: string;
    title: string;
    childName?: string;
  }>();

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      if (status?.isLoaded && status.isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls, status]);

  // Handle screen orientation
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    setIsFullscreen(!isFullscreen);
  };

  const handlePlayPause = async () => {
    if (!videoRef.current || !status?.isLoaded) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (status.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }

    // Sync state with backend
    try {
      await circle.watchTogether.updatePlaybackState(params.sessionId!, {
        position_seconds: Math.floor((status.positionMillis || 0) / 1000),
        is_playing: !status.isPlaying,
      });
    } catch (e) {
      // Ignore sync errors in demo mode
    }
  };

  const handleSeek = async (direction: "back" | "forward") => {
    if (!videoRef.current || !status?.isLoaded) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const seekAmount = direction === "back" ? -10000 : 10000;
    const newPosition = Math.max(
      0,
      Math.min(
        (status.positionMillis || 0) + seekAmount,
        status.durationMillis || 0
      )
    );

    await videoRef.current.setPositionAsync(newPosition);
  };

  const handleReaction = async (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveReaction(emoji);

    // Show reaction briefly
    setTimeout(() => setActiveReaction(null), 2000);

    // Send to backend
    try {
      await circle.watchTogether.sendReaction(params.sessionId!, emoji);
    } catch (e) {
      // Ignore in demo mode
    }

    setShowReactions(false);
  };

  const handleEnd = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await circle.watchTogether.endSession(params.sessionId!);
    } catch (e) {
      // Ignore in demo mode
    }

    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    router.back();
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = status?.isLoaded
    ? (status.positionMillis || 0) / (status.durationMillis || 1)
    : 0;

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden={isFullscreen} />

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
        className="flex-1"
      >
        {/* Video Player */}
        <Video
          ref={videoRef}
          source={{ uri: params.contentUrl || "" }}
          style={{
            width: isFullscreen ? SCREEN_HEIGHT : SCREEN_WIDTH,
            height: isFullscreen ? SCREEN_WIDTH : SCREEN_WIDTH * (9 / 16),
            alignSelf: "center",
            marginTop: isFullscreen ? 0 : 60,
          }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
          isMuted={isMuted}
          onPlaybackStatusUpdate={setStatus}
        />

        {/* Video Call PiP (Simulated) */}
        {!isFullscreen && (
          <View className="absolute top-16 right-4 w-28 h-40 bg-gray-800 rounded-2xl overflow-hidden border-2 border-purple-500">
            <View className="flex-1 items-center justify-center">
              <Text className="text-4xl">👧</Text>
              <Text className="text-white text-xs mt-1">
                {params.childName || "Emma"}
              </Text>
            </View>
            <View className="absolute bottom-2 left-2 right-2 flex-row justify-center">
              <View className="w-2 h-2 bg-green-500 rounded-full" />
              <Text className="text-green-500 text-xs ml-1">Connected</Text>
            </View>
          </View>
        )}

        {/* Active Reaction Animation */}
        {activeReaction && (
          <View className="absolute top-1/3 left-0 right-0 items-center">
            <Text className="text-8xl">{activeReaction}</Text>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && (
          <View className="absolute inset-0 bg-black/30">
            {/* Top Bar */}
            <SafeAreaView edges={["top"]}>
              <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity
                  onPress={handleEnd}
                  className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                <View className="flex-1 mx-4">
                  <Text
                    className="text-white font-bold text-lg text-center"
                    numberOfLines={1}
                  >
                    {params.title}
                  </Text>
                  <Text className="text-purple-300 text-center text-sm">
                    Watching with {params.childName || "Emma"} 💜
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={toggleFullscreen}
                  className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
                >
                  <Ionicons
                    name={isFullscreen ? "contract" : "expand"}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Center Controls */}
            <View className="flex-1 flex-row items-center justify-center space-x-8">
              <TouchableOpacity
                onPress={() => handleSeek("back")}
                className="w-14 h-14 bg-black/50 rounded-full items-center justify-center"
              >
                <Ionicons name="play-back" size={28} color="white" />
                <Text className="text-white text-xs absolute -bottom-4">-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePlayPause}
                className="w-20 h-20 bg-purple-500 rounded-full items-center justify-center"
              >
                <Ionicons
                  name={status?.isLoaded && status.isPlaying ? "pause" : "play"}
                  size={40}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSeek("forward")}
                className="w-14 h-14 bg-black/50 rounded-full items-center justify-center"
              >
                <Ionicons name="play-forward" size={28} color="white" />
                <Text className="text-white text-xs absolute -bottom-4">+10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar */}
            <SafeAreaView edges={["bottom"]}>
              <View className="px-4 pb-4">
                {/* Progress Bar */}
                <View className="flex-row items-center mb-4">
                  <Text className="text-white text-sm w-12">
                    {formatTime(status?.isLoaded ? status.positionMillis || 0 : 0)}
                  </Text>
                  <View className="flex-1 mx-2 h-2 bg-white/30 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </View>
                  <Text className="text-white text-sm w-12 text-right">
                    {formatTime(status?.isLoaded ? status.durationMillis || 0 : 0)}
                  </Text>
                </View>

                {/* Bottom Actions */}
                <View className="flex-row items-center justify-between">
                  {/* Mute */}
                  <TouchableOpacity
                    onPress={() => setIsMuted(!isMuted)}
                    className="w-12 h-12 bg-black/50 rounded-full items-center justify-center"
                  >
                    <Ionicons
                      name={isMuted ? "volume-mute" : "volume-high"}
                      size={22}
                      color="white"
                    />
                  </TouchableOpacity>

                  {/* Reactions */}
                  <TouchableOpacity
                    onPress={() => setShowReactions(!showReactions)}
                    className="flex-row items-center bg-purple-500/80 px-4 py-3 rounded-full"
                  >
                    <Text className="text-xl mr-2">😊</Text>
                    <Text className="text-white font-bold">React</Text>
                  </TouchableOpacity>

                  {/* Placeholder for symmetry */}
                  <View className="w-12" />
                </View>

                {/* Reaction Picker */}
                {showReactions && (
                  <View className="flex-row justify-center mt-4 bg-black/70 rounded-full py-3 px-4">
                    {REACTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => handleReaction(emoji)}
                        className="mx-2"
                      >
                        <Text className="text-3xl">{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>
        )}

        {/* Loading indicator */}
        {status && !status.isLoaded && (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <View className="bg-white/20 px-6 py-4 rounded-2xl">
              <Text className="text-white text-lg">Loading video...</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

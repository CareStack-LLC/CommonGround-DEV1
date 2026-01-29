/**
 * Watch Together Screen
 *
 * Synchronized video watching with a family member over video call.
 * Features:
 * - Synchronized playback
 * - Picture-in-picture video call
 * - Emoji reactions
 * - Host controls playback
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

import { child, type WatchTogetherSession } from "@commonground/api-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Supabase storage URL for KidComs videos
const SUPABASE_STORAGE_URL = "https://qqttugwxmkbnrgzgqbkz.supabase.co/storage/v1/object/public/kidcoms";

// Emoji reactions
const REACTIONS = ["😂", "😍", "😮", "😢", "👍", "👎"];

export default function WatchTogetherScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    contentId: string;
    contactName?: string;
  }>();

  const videoRef = useRef<Video>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [session, setSession] = useState<WatchTogetherSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (params.sessionId) {
          const data = await child.theater.joinWatchTogetherSession(
            params.sessionId
          );
          setSession(data);
          // Check if we're the host
          // In a real app, compare with current user ID
          setIsHost(false);
        } else if (params.contentId) {
          // Create new session (demo mode)
          setSession({
            id: "demo-session",
            content_id: params.contentId,
            content: {
              id: params.contentId,
              title: "Watch Together Video",
              description: "",
              thumbnail_url: "https://picsum.photos/seed/wt/800/450",
              content_url: `${SUPABASE_STORAGE_URL}/videos/Crunch.mp4`,
              content_type: "video",
              category: "fun",
              duration_seconds: 240,
              age_rating: "G",
              is_approved: true,
              created_at: new Date().toISOString(),
            },
            host_id: "current-user",
            participant_ids: ["contact-1"],
            current_position_seconds: 0,
            is_playing: true,
            created_at: new Date().toISOString(),
          });
          setIsHost(true);
        }
      } catch (error) {
        console.error("Failed to join session:", error);
        Alert.alert("Error", "Failed to join watch session", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    return () => {
      if (params.sessionId) {
        child.theater.leaveWatchTogetherSession(params.sessionId).catch(() => {});
      }
    };
  }, [params.sessionId, params.contentId]);

  // Lock to landscape
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
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

  // Sync playback state (host only)
  useEffect(() => {
    if (!isHost || !session) return;

    syncIntervalRef.current = setInterval(async () => {
      try {
        await child.theater.updateWatchTogetherState(session.id, {
          position_seconds: Math.floor(position / 1000),
          is_playing: isPlaying,
        });
      } catch {}
    }, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isHost, session, position, isPlaying]);

  // Handle playback status
  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }

    setIsBuffering(status.isBuffering);
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);

    if (status.didJustFinish) {
      handleClose();
    }
  }, []);

  // Toggle play/pause (host only)
  const togglePlayPause = async () => {
    if (!isHost) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  };

  // Send reaction
  const sendReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveReaction(emoji);
    setShowReactions(false);

    // Clear reaction after animation
    setTimeout(() => {
      setActiveReaction(null);
    }, 2000);

    // In real app, send to session
    if (session) {
      child.kidcoms.sendTheaterMessage(session.id, {
        type: "emoji",
        content: emoji,
      }).catch(() => {});
    }
  };

  // Close session
  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (session) {
      try {
        await child.theater.leaveWatchTogetherSession(session.id);
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
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={{ color: "#fff", fontSize: 18, marginTop: 16 }}>
          Joining watch party...
        </Text>
      </View>
    );
  }

  const videoUrl = session?.content.content_url || `${SUPABASE_STORAGE_URL}/videos/Crunch.mp4`;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      {/* Video Player */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
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
        />

        {/* Buffering */}
        {isBuffering && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        )}

        {/* Reaction Animation */}
        {activeReaction && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 120 }}>{activeReaction}</Text>
          </View>
        )}

        {/* Controls */}
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

              <View className="flex-1 mx-4 items-center">
                <Text className="text-white text-xl font-bold">
                  👥 Watch Together
                </Text>
                <Text className="text-purple-300">
                  with {params.contactName || "Family"}
                </Text>
              </View>

              {/* Video call PIP placeholder */}
              <View className="w-24 h-16 bg-gray-800 rounded-xl items-center justify-center">
                <Ionicons name="videocam" size={24} color="#8b5cf6" />
                <Text className="text-white text-xs">Call</Text>
              </View>
            </View>

            {/* Center */}
            <View className="flex-1 items-center justify-center">
              {isHost ? (
                <TouchableOpacity
                  onPress={togglePlayPause}
                  className="w-20 h-20 bg-purple-500 rounded-full items-center justify-center"
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color="white"
                  />
                </TouchableOpacity>
              ) : (
                <View className="bg-black/60 px-6 py-3 rounded-xl">
                  <Text className="text-white text-lg">
                    {isPlaying ? "▶ Playing" : "⏸ Paused"}
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom Bar */}
            <View className="px-6 pb-6">
              {/* Progress */}
              <View className="flex-row items-center mb-4">
                <Text className="text-white text-sm w-12">
                  {formatTime(position)}
                </Text>
                <View className="flex-1 h-1 mx-3 bg-white/30 rounded-full">
                  <View
                    className="h-1 bg-purple-500 rounded-full"
                    style={{
                      width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                    }}
                  />
                </View>
                <Text className="text-white text-sm w-12 text-right">
                  {formatTime(duration)}
                </Text>
              </View>

              {/* Reactions */}
              <View className="flex-row justify-center space-x-3">
                {showReactions ? (
                  REACTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => sendReaction(emoji)}
                      className="w-14 h-14 bg-white/20 rounded-full items-center justify-center"
                    >
                      <Text className="text-3xl">{emoji}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowReactions(true)}
                    className="flex-row items-center bg-purple-500/80 px-6 py-3 rounded-full"
                  >
                    <Text className="text-2xl mr-2">😊</Text>
                    <Text className="text-white font-bold">React</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

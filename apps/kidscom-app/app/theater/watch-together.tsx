/**
 * Watch Together Screen
 *
 * Synchronized video watching with a family member over video call.
 * Features:
 * - Synchronized playback with host controls
 * - Guest sync polling with drift correction
 * - Reconnect logic with exponential backoff
 * - Content progress tracking (resume from last position)
 * - Emoji reactions
 * - Video error handling with retry
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
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

// Emoji reactions
const REACTIONS = ["😂", "😍", "😮", "😢", "👍", "👎"];

// Sync constants
const HOST_SYNC_INTERVAL_MS = 2000;
const GUEST_SYNC_INTERVAL_MS = 2000;
const GUEST_DRIFT_THRESHOLD_MS = 3000; // Seek if >3s out of sync
const PROGRESS_SAVE_INTERVAL_MS = 30000; // Save progress every 30s
const MAX_BACKOFF_MS = 16000;
const DISCONNECT_BANNER_THRESHOLD = 3;

export default function WatchTogetherScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    contentId: string;
    contactName?: string;
  }>();

  const videoRef = useRef<Video>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const guestSyncRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const positionRef = useRef(0); // Avoid stale closure in intervals

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

  // Error & reconnect state
  const [videoError, setVideoError] = useState(false);
  const [syncFailures, setSyncFailures] = useState(0);
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false);
  const backoffRef = useRef(HOST_SYNC_INTERVAL_MS);

  // Keep positionRef in sync
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        if (params.sessionId) {
          const data = await child.theater.joinWatchTogetherSession(
            params.sessionId
          );
          setSession(data);
          setIsHost(false);

          // Resume from saved progress if available
          const progress = await child.theater.getWatchProgress(data.content_id);
          if (progress && !progress.completed && progress.progress_seconds > 0) {
            setTimeout(() => {
              videoRef.current?.setPositionAsync(progress.progress_seconds * 1000);
            }, 500);
          }
        } else if (params.contentId && __DEV__) {
          // Demo mode: only available in development
          setSession({
            id: "demo-session",
            content_id: params.contentId,
            content: {
              id: params.contentId,
              title: "Watch Together Video",
              description: "",
              thumbnail_url: "",
              content_url: "",
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
        } else if (params.contentId && !__DEV__) {
          Alert.alert("Error", "No session ID provided", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
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

  // Host: sync playback state to server with exponential backoff on failure
  useEffect(() => {
    if (!isHost || !session || session.id === "demo-session") return;

    const syncState = async () => {
      try {
        await child.theater.updateWatchTogetherState(session.id, {
          position_seconds: Math.floor(positionRef.current / 1000),
          is_playing: isPlaying,
        });
        // Reset on success
        backoffRef.current = HOST_SYNC_INTERVAL_MS;
        setSyncFailures(0);
        setShowDisconnectBanner(false);
      } catch {
        const newFailures = syncFailures + 1;
        setSyncFailures(newFailures);
        if (newFailures >= DISCONNECT_BANNER_THRESHOLD) {
          setShowDisconnectBanner(true);
        }
        // Exponential backoff: 2s → 4s → 8s → 16s max
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
      }
    };

    syncIntervalRef.current = setInterval(syncState, backoffRef.current);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [isHost, session, isPlaying, syncFailures]);

  // Guest: poll server state and sync playback
  useEffect(() => {
    if (isHost || !session || session.id === "demo-session") return;

    const pollServerState = async () => {
      try {
        const data = await child.theater.joinWatchTogetherSession(session.id);
        const serverPositionMs = data.current_position_seconds * 1000;
        const drift = Math.abs(positionRef.current - serverPositionMs);

        // Seek if drift exceeds threshold
        if (drift > GUEST_DRIFT_THRESHOLD_MS) {
          await videoRef.current?.setPositionAsync(serverPositionMs);
        }

        // Sync play/pause state
        if (data.is_playing && !isPlaying) {
          await videoRef.current?.playAsync();
        } else if (!data.is_playing && isPlaying) {
          await videoRef.current?.pauseAsync();
        }

        setSyncFailures(0);
        setShowDisconnectBanner(false);
      } catch {
        const newFailures = syncFailures + 1;
        setSyncFailures(newFailures);
        if (newFailures >= DISCONNECT_BANNER_THRESHOLD) {
          setShowDisconnectBanner(true);
        }
      }
    };

    guestSyncRef.current = setInterval(pollServerState, GUEST_SYNC_INTERVAL_MS);

    return () => {
      if (guestSyncRef.current) clearInterval(guestSyncRef.current);
    };
  }, [isHost, session, isPlaying, syncFailures]);

  // Content progress tracking (save every 30s)
  useEffect(() => {
    if (!session || session.id === "demo-session") return;

    progressIntervalRef.current = setInterval(() => {
      const posSeconds = Math.floor(positionRef.current / 1000);
      if (posSeconds > 0) {
        child.theater
          .updateWatchProgress(session.content_id, posSeconds)
          .catch(() => {});
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      // Save final progress on unmount
      const finalPos = Math.floor(positionRef.current / 1000);
      if (finalPos > 0) {
        child.theater
          .updateWatchProgress(session.content_id, finalPos)
          .catch(() => {});
      }
    };
  }, [session]);

  // Handle playback status
  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error("Video playback error:", status.error);
        setVideoError(true);
      }
      setIsBuffering(true);
      return;
    }

    setVideoError(false);
    setIsBuffering(status.isBuffering);
    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis || 0);

    if (status.didJustFinish) {
      // Save completed progress
      if (session && session.id !== "demo-session") {
        const durationSeconds = Math.floor((status.durationMillis || 0) / 1000);
        child.theater
          .updateWatchProgress(session.content_id, durationSeconds, true)
          .catch(() => {});
      }
      handleClose();
    }
  }, [session]);

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

  // Retry video load
  const handleRetryVideo = async () => {
    setVideoError(false);
    setIsBuffering(true);
    try {
      await videoRef.current?.unloadAsync();
      const videoUrl = session?.content.content_url || "";
      await videoRef.current?.loadAsync({ uri: videoUrl }, { shouldPlay: true });
    } catch {
      setVideoError(true);
    }
  };

  // Send reaction
  const sendReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveReaction(emoji);
    setShowReactions(false);

    setTimeout(() => {
      setActiveReaction(null);
    }, 2000);

    if (session && session.id !== "demo-session") {
      child.kidcoms.sendTheaterMessage(session.id, {
        type: "emoji",
        content: emoji,
      }).catch(() => {});
    }
  };

  // Close session
  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (session && session.id !== "demo-session") {
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

  const videoUrl = session?.content.content_url || "";

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      {/* Disconnect Banner */}
      {showDisconnectBanner && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: "rgba(239,68,68,0.9)", paddingVertical: 8, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="cloud-offline" size={18} color="white" />
          <Text style={{ color: "white", marginLeft: 8, fontWeight: "bold" }}>
            Connection lost — retrying...
          </Text>
        </View>
      )}

      {/* Video Error Overlay */}
      {videoError && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={{ color: "white", fontSize: 20, fontWeight: "bold", marginTop: 16 }}>
            Video couldn't load
          </Text>
          <Text style={{ color: "#a78bfa", fontSize: 16, marginTop: 8, textAlign: "center", paddingHorizontal: 40 }}>
            There was a problem playing this video. Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            onPress={handleRetryVideo}
            style={{ marginTop: 24, backgroundColor: "#8b5cf6", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 9999 }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClose}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: "#a78bfa", fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

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
        {isBuffering && !videoError && (
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
                  Watch Together
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
                    {isPlaying ? "Playing" : "Paused"}
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

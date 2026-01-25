/**
 * Video Call Screen for My Circle App
 * For circle members (grandparents, aunts, uncles) to call children
 */

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useDailyCall, VideoView } from "@commonground/daily-video";
import { useAuth } from "@/providers/AuthProvider";

export default function CallScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { connectedChildren } = useAuth();

  const {
    callState,
    participants,
    localParticipant,
    isVideoOn,
    isAudioOn,
    callDuration,
    error,
    initiateCall,
    endCall,
    toggleVideo,
    toggleAudio,
    switchCamera,
  } = useDailyCall();

  const [showControls, setShowControls] = useState(true);

  const child = connectedChildren.find((c) => c.id === childId);

  // Initialize call
  useEffect(() => {
    if (childId && child?.family_file_id) {
      initiateCall(childId, "child", child.family_file_id);
    }
  }, [childId, child]);

  // Handle call end
  useEffect(() => {
    if (callState === "ended") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 500);
    }
  }, [callState]);

  // Auto-hide controls
  useEffect(() => {
    if (callState === "connected") {
      const timer = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callState]);

  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await endCall();
  };

  const handleToggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleVideo();
  };

  const handleToggleAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleAudio();
  };

  const handleSwitchCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchCamera();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const remoteParticipant = participants[0];

  // Loading state
  if (callState === "idle" || callState === "connecting") {
    return (
      <LinearGradient colors={["#0ea5e9", "#0284c7"]} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.statusText}>Connecting...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Error state
  if (callState === "error") {
    return (
      <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <Ionicons name="warning" size={64} color="white" />
          <Text style={styles.statusText}>{error || "Call failed"}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote Video (full screen) */}
      <TouchableOpacity
        style={styles.remoteVideoContainer}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        {remoteParticipant && remoteParticipant.isVideoOn ? (
          <VideoView
            participant={remoteParticipant}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <LinearGradient
            colors={
              callState === "connected"
                ? ["#22c55e", "#16a34a"]
                : ["#0ea5e9", "#0284c7"]
            }
            style={styles.waitingContainer}
          >
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>
                {child?.age && child.age < 10 ? "👧" : "🧑"}
              </Text>
            </View>
            <Text style={styles.waitingText}>{child?.name || "Child"}</Text>
            <Text style={styles.waitingSubtext}>
              {callState === "ringing"
                ? "Ringing..."
                : callState === "connected"
                ? "Camera is off"
                : "Connecting..."}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* Local Video (picture-in-picture) */}
      {localParticipant && isVideoOn && (
        <TouchableOpacity
          style={styles.localVideoContainer}
          onPress={handleSwitchCamera}
        >
          <VideoView
            participant={localParticipant}
            style={styles.localVideo}
            mirror
            objectFit="cover"
          />
          <View style={styles.switchCameraHint}>
            <Ionicons name="camera-reverse" size={14} color="white" />
          </View>
        </TouchableOpacity>
      )}

      {/* Top Bar */}
      {showControls && (
        <SafeAreaView style={styles.topBar}>
          <View style={styles.topBarContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-down" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.durationContainer}>
              <Text style={styles.durationText}>
                {callState === "connected"
                  ? formatDuration(callDuration)
                  : callState === "ringing"
                  ? "Ringing..."
                  : "Connecting..."}
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </SafeAreaView>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <SafeAreaView style={styles.bottomBar}>
          <View style={styles.controlsRow}>
            {/* Mute */}
            <TouchableOpacity
              style={[styles.controlButton, !isAudioOn && styles.controlButtonActive]}
              onPress={handleToggleAudio}
            >
              <Ionicons
                name={isAudioOn ? "mic" : "mic-off"}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* Camera */}
            <TouchableOpacity
              style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
              onPress={handleToggleVideo}
            >
              <Ionicons
                name={isVideoOn ? "videocam" : "videocam-off"}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
              <Ionicons
                name="call"
                size={32}
                color="white"
                style={{ transform: [{ rotate: "135deg" }] }}
              />
            </TouchableOpacity>

            {/* Switch Camera */}
            <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>

            {/* Speaker */}
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="volume-high" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "white",
    fontSize: 18,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  remoteVideo: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 60,
  },
  waitingText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  waitingSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
  },
  localVideoContainer: {
    position: "absolute",
    top: 100,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
  },
  localVideo: {
    flex: 1,
  },
  switchCameraHint: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  durationContainer: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  controlButtonActive: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
});

/**
 * Video Call Screen for Kidscom App
 * Child-friendly design with large buttons and playful animations
 */

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useDailyCall, VideoView } from "@commonground/daily-video";
import { useCircleContacts } from "@/hooks/useCircleContacts";

export default function CallScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { contacts } = useCircleContacts();

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

  const [pulseAnim] = useState(new Animated.Value(1));

  const contact = contacts.find((c) => c.id === contactId);

  // Pulse animation for ringing state
  useEffect(() => {
    if (callState === "ringing") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [callState, pulseAnim]);

  // Initialize call
  useEffect(() => {
    if (contactId && contact?.family_file_id) {
      initiateCall(contactId, "circle", contact.family_file_id);
    }
  }, [contactId, contact]);

  // Handle call end
  useEffect(() => {
    if (callState === "ended") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 500);
    }
  }, [callState]);

  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await endCall();
  };

  const handleToggleVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleVideo();
  };

  const handleToggleAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleAudio();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getContactEmoji = (relationship?: string): string => {
    switch (relationship?.toLowerCase()) {
      case "grandparent":
        return "👴";
      case "aunt":
        return "👩";
      case "uncle":
        return "👨";
      default:
        return "😊";
    }
  };

  const remoteParticipant = participants[0];

  // Loading state
  if (callState === "idle" || callState === "connecting") {
    return (
      <LinearGradient colors={["#8b5cf6", "#a855f7"]} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Setting up your call... 📞</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Error state
  if (callState === "error") {
    return (
      <LinearGradient colors={["#ef4444", "#f87171"]} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <Text style={styles.errorEmoji}>😔</Text>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Ringing state
  if (callState === "ringing") {
    return (
      <LinearGradient colors={["#8b5cf6", "#a855f7"]} style={styles.container}>
        <SafeAreaView style={styles.centerContent}>
          <Animated.View
            style={[styles.callingAvatar, { transform: [{ scale: pulseAnim }] }]}
          >
            <Text style={styles.callingEmoji}>
              {getContactEmoji(contact?.relationship)}
            </Text>
          </Animated.View>
          <Text style={styles.callingText}>
            Calling {contact?.display_name || contact?.name || "Family"}...
          </Text>
          <Text style={styles.callingSubtext}>Waiting for them to answer</Text>

          <TouchableOpacity style={styles.cancelCallButton} onPress={handleEndCall}>
            <Ionicons
              name="call"
              size={36}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Connected state
  return (
    <LinearGradient colors={["#22c55e", "#4ade80"]} style={styles.container}>
      {/* Remote Video */}
      <View style={styles.remoteVideoContainer}>
        {remoteParticipant && remoteParticipant.isVideoOn ? (
          <VideoView
            participant={remoteParticipant}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingEmoji}>
              {getContactEmoji(contact?.relationship)}
            </Text>
            <Text style={styles.waitingText}>
              {contact?.display_name || contact?.name || "Family"}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (small) */}
      {localParticipant && isVideoOn && (
        <TouchableOpacity style={styles.localVideoContainer} onPress={switchCamera}>
          <VideoView
            participant={localParticipant}
            style={styles.localVideo}
            mirror
            objectFit="cover"
          />
          <View style={styles.switchCameraHint}>
            <Ionicons name="camera-reverse" size={16} color="white" />
          </View>
        </TouchableOpacity>
      )}

      {/* Top Status Bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.statusContainer}>
          <View style={styles.connectedBadge}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>
      </SafeAreaView>

      {/* Bottom Controls - Child-friendly large buttons */}
      <SafeAreaView style={styles.bottomBar}>
        <View style={styles.controlsContainer}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlButton, !isAudioOn && styles.controlButtonOff]}
            onPress={handleToggleAudio}
          >
            <Ionicons
              name={isAudioOn ? "mic" : "mic-off"}
              size={32}
              color="white"
            />
            <Text style={styles.controlLabel}>
              {isAudioOn ? "Sound On" : "Sound Off"}
            </Text>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Text style={styles.endCallEmoji}>👋</Text>
            <Text style={styles.endCallText}>Say Bye</Text>
          </TouchableOpacity>

          {/* Camera Button */}
          <TouchableOpacity
            style={[styles.controlButton, !isVideoOn && styles.controlButtonOff]}
            onPress={handleToggleVideo}
          >
            <Ionicons
              name={isVideoOn ? "videocam" : "videocam-off"}
              size={32}
              color="white"
            />
            <Text style={styles.controlLabel}>
              {isVideoOn ? "Camera On" : "Camera Off"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "white",
    fontSize: 20,
    marginTop: 16,
    fontWeight: "600",
  },
  errorEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  errorTitle: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: "white",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  backButtonText: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "bold",
  },
  callingAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  callingEmoji: {
    fontSize: 80,
  },
  callingText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  callingSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    marginBottom: 48,
  },
  cancelCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#22c55e",
  },
  waitingEmoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  waitingText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  localVideoContainer: {
    position: "absolute",
    top: 120,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 3,
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
    borderRadius: 12,
    padding: 4,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ade80",
    marginRight: 8,
  },
  connectedText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  durationText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  controlButton: {
    width: 80,
    height: 100,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonOff: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  controlLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  endCallButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  endCallEmoji: {
    fontSize: 36,
  },
  endCallText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
});

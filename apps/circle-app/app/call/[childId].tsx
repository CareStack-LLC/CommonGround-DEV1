import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";

type CallState = "connecting" | "ringing" | "connected" | "ended" | "declined";

export default function CallScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { connectedChildren } = useAuth();
  const [callState, setCallState] = useState<CallState>("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const child = connectedChildren.find((c) => c.id === childId);

  useEffect(() => {
    initiateCall();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "connected") {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const initiateCall = async () => {
    // Simulate call connection
    setCallState("connecting");

    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCallState("ringing");

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCallState("connected");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEndCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCallState("ended");
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const toggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCameraOff(!isCameraOff);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <LinearGradient
      colors={
        callState === "connected"
          ? ["#22c55e", "#16a34a"]
          : ["#0ea5e9", "#0284c7"]
      }
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4">
          <TouchableOpacity
            onPress={handleEndCall}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="chevron-down" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Contact Info */}
        <View className="flex-1 items-center justify-center">
          {/* Avatar */}
          <View className="w-32 h-32 bg-white rounded-full items-center justify-center mb-6 shadow-2xl">
            <Text className="text-6xl">{child?.age && child.age < 10 ? "👧" : "🧑"}</Text>
          </View>

          {/* Name */}
          <Text className="text-4xl font-bold text-white text-center mb-2">
            {child?.name || "Child"}
          </Text>

          {/* Call Status */}
          <View className="flex-row items-center">
            {callState === "connecting" && (
              <>
                <ActivityIndicator color="white" size="small" />
                <Text className="text-white/80 text-xl ml-2">Connecting...</Text>
              </>
            )}
            {callState === "ringing" && (
              <Text className="text-white/80 text-xl">Ringing...</Text>
            )}
            {callState === "connected" && (
              <Text className="text-white text-2xl font-bold">
                {formatDuration(callDuration)}
              </Text>
            )}
            {callState === "ended" && (
              <Text className="text-white/80 text-xl">Call Ended</Text>
            )}
          </View>
        </View>

        {/* Video Preview Area */}
        {callState === "connected" && (
          <View className="flex-1 mx-4 mb-4 bg-black/20 rounded-3xl overflow-hidden items-center justify-center">
            {isCameraOff ? (
              <View className="items-center">
                <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.5)" />
                <Text className="text-white/50 mt-2">Camera is off</Text>
              </View>
            ) : (
              <Text className="text-white/60 text-lg">Video will appear here</Text>
            )}

            {/* Self-view */}
            <View className="absolute bottom-4 right-4 w-24 h-32 bg-black/40 rounded-2xl items-center justify-center">
              <Text className="text-white/60 text-sm">You</Text>
            </View>
          </View>
        )}

        {/* Call Controls */}
        <View className="pb-12 px-8">
          <View className="flex-row justify-center items-center">
            {/* Mute Button */}
            <TouchableOpacity
              className={`w-16 h-16 rounded-full items-center justify-center mx-4 ${
                isMuted ? "bg-red-500" : "bg-white/20"
              }`}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? "mic-off" : "mic"}
                size={28}
                color="white"
              />
            </TouchableOpacity>

            {/* End Call Button */}
            <TouchableOpacity
              className="w-20 h-20 bg-red-500 rounded-full items-center justify-center mx-4 shadow-xl"
              onPress={handleEndCall}
            >
              <Ionicons
                name="call"
                size={36}
                color="white"
                style={{ transform: [{ rotate: "135deg" }] }}
              />
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              className={`w-16 h-16 rounded-full items-center justify-center mx-4 ${
                isCameraOff ? "bg-red-500" : "bg-white/20"
              }`}
              onPress={toggleCamera}
            >
              <Ionicons
                name={isCameraOff ? "videocam-off" : "videocam"}
                size={28}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {/* Additional Controls */}
          {callState === "connected" && (
            <View className="flex-row justify-center mt-6">
              <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mx-2">
                <Ionicons name="camera-reverse" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mx-2">
                <Ionicons name="volume-high" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

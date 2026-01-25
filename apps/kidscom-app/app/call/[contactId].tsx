import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useDailyCall } from "@/hooks/useDailyCall";
import { useCircleContacts } from "@/hooks/useCircleContacts";

type CallState = "connecting" | "ringing" | "connected" | "ended";

export default function CallScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const { contacts } = useCircleContacts();
  const { session, isLoading, error, startCall, endCall } = useDailyCall();
  const [callState, setCallState] = useState<CallState>("connecting");
  const [callDuration, setCallDuration] = useState(0);

  const contact = contacts.find((c) => c.id === contactId);

  useEffect(() => {
    if (contactId) {
      initiateCall();
    }
  }, [contactId]);

  useEffect(() => {
    if (session) {
      setCallState("ringing");
      // Simulate connection after 2 seconds (in real app, this would be from Daily.co events)
      const timer = setTimeout(() => {
        setCallState("connected");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [session]);

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
    if (contactId) {
      const success = await startCall(contactId);
      if (!success) {
        setCallState("ended");
      }
    }
  };

  const handleEndCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    endCall();
    setCallState("ended");
    setTimeout(() => {
      router.back();
    }, 500);
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

  if (isLoading) {
    return (
      <LinearGradient colors={["#8b5cf6", "#a855f7"]} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white text-xl mt-4">Setting up your call...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={["#ef4444", "#f87171"]} className="flex-1">
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">😔</Text>
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Oops!
          </Text>
          <Text className="text-white/80 text-lg text-center mb-8">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-white px-8 py-4 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-red-500 font-bold text-lg">Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={
        callState === "connected"
          ? ["#22c55e", "#4ade80"]
          : ["#8b5cf6", "#a855f7"]
      }
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        {/* Contact Info */}
        <View className="flex-1 items-center justify-center">
          {/* Avatar */}
          <View className="w-40 h-40 bg-white rounded-full items-center justify-center mb-6 shadow-2xl">
            <Text className="text-7xl">
              {getContactEmoji(contact?.relationship)}
            </Text>
          </View>

          {/* Name */}
          <Text className="text-4xl font-bold text-white text-center mb-2">
            {contact?.display_name || contact?.name || "Contact"}
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
          </View>
        </View>

        {/* Video Preview Area (placeholder for Daily.co video) */}
        {callState === "connected" && (
          <View className="flex-1 mx-4 mb-4 bg-black/20 rounded-3xl overflow-hidden items-center justify-center">
            <Text className="text-white/60 text-lg">Video will appear here</Text>
            {/* In real implementation, Daily.co video component goes here */}
          </View>
        )}

        {/* Call Controls */}
        <View className="pb-12 px-8">
          <View className="flex-row justify-center space-x-8">
            {/* Mute Button */}
            <TouchableOpacity
              className="w-16 h-16 bg-white/20 rounded-full items-center justify-center"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="mic" size={28} color="white" />
            </TouchableOpacity>

            {/* End Call Button */}
            <TouchableOpacity
              className="w-20 h-20 bg-red-500 rounded-full items-center justify-center shadow-xl"
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={36} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>

            {/* Camera Button */}
            <TouchableOpacity
              className="w-16 h-16 bg-white/20 rounded-full items-center justify-center"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="camera" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

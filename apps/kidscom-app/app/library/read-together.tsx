/**
 * Read Together Screen
 *
 * Synchronized book reading with a family member over video call.
 * Features:
 * - PDF book viewing
 * - Picture-in-picture video call
 * - Page sync between participants
 * - Emoji reactions
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import * as Haptics from "expo-haptics";

import { useCircleContacts, type CircleContact } from "@/hooks/useCircleContacts";
import { useDailyCall, VideoView } from "@commonground/daily-video";

// Emoji reactions for reading
const REACTIONS = ["📖", "😊", "😮", "😢", "👍", "❤️", "🎉", "🤔"];

type ScreenState = "select-contact" | "calling" | "reading";

export default function ReadTogetherScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    title: string;
    contentUrl: string;
    contactId?: string;
    contactName?: string;
  }>();

  const { contacts, isLoading: contactsLoading } = useCircleContacts();
  const {
    callState,
    participants,
    localParticipant,
    isVideoOn,
    isAudioOn,
    initiateCall,
    endCall,
    toggleVideo,
    toggleAudio,
  } = useDailyCall();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [screenState, setScreenState] = useState<ScreenState>(
    params.contactId ? "calling" : "select-contact"
  );
  const [selectedContact, setSelectedContact] = useState<CircleContact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [activeReaction, setActiveReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // PDF viewer URL using Google Docs viewer
  const isPDF = params.contentUrl?.endsWith(".pdf");
  const pdfViewerUrl = isPDF
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(params.contentUrl || "")}`
    : params.contentUrl;

  // Auto-start call if contact was passed
  useEffect(() => {
    if (params.contactId && params.contactName) {
      setSelectedContact({
        id: params.contactId,
        contact_id: params.contactId,
        name: params.contactName,
        display_name: params.contactName,
      });
      setScreenState("calling");
    }
  }, [params.contactId, params.contactName]);

  // Pulse animation for calling state
  useEffect(() => {
    if (screenState === "calling" && callState !== "connected") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [screenState, callState, pulseAnim]);

  // Start call when contact is selected
  useEffect(() => {
    if (screenState === "calling" && selectedContact && callState === "idle") {
      // Family file id would come from child's auth context
      const familyFileId = selectedContact.family_file_id || "child-context";
      initiateCall(
        selectedContact.contact_id || selectedContact.id,
        "parent",
        familyFileId
      );
    }
  }, [screenState, selectedContact, callState, initiateCall]);

  // Handle call state changes
  useEffect(() => {
    if (callState === "connected") {
      setScreenState("reading");
    } else if (callState === "ended" && screenState === "reading") {
      handleClose();
    } else if (callState === "error") {
      Alert.alert(
        "Call Failed",
        "Couldn't connect the call. Try again?",
        [
          { text: "Go Back", onPress: handleClose },
          { text: "Try Again", onPress: () => setScreenState("select-contact") },
        ]
      );
    }
  }, [callState, screenState]);

  const handleSelectContact = (contact: CircleContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedContact(contact);
    setScreenState("calling");
  };

  const handleClose = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (callState === "connected" || callState === "connecting" || callState === "ringing") {
      await endCall();
    }
    router.back();
  };

  const sendReaction = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveReaction(emoji);
    setShowReactions(false);
    setTimeout(() => setActiveReaction(null), 2000);
  };

  const getContactEmoji = (contact?: CircleContact | null) => {
    if (!contact) return "👤";
    const rel = contact.relationship?.toLowerCase() || "";
    if (rel === "mom" || rel === "parent_a") return "👩";
    if (rel === "dad" || rel === "parent_b") return "👨";
    if (rel.includes("grand")) return "👴";
    return "👤";
  };

  const remoteParticipant = participants[0];

  // Contact Selection Screen
  if (screenState === "select-contact") {
    return (
      <LinearGradient colors={["#f59e0b", "#fbbf24", "#fcd34d"]} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center px-4 pt-4">
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1 ml-4">
              <Text className="text-2xl font-bold text-white">Read Together</Text>
              <Text className="text-amber-100">Choose who to read with!</Text>
            </View>
          </View>

          {/* Book Preview */}
          <View className="mx-6 mt-6 bg-white/20 rounded-2xl p-4">
            <View className="flex-row items-center">
              <Text className="text-5xl mr-4">📚</Text>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg" numberOfLines={2}>
                  {params.title || "Book"}
                </Text>
                <Text className="text-amber-100">Ready to read!</Text>
              </View>
            </View>
          </View>

          {/* Contact List */}
          <View className="flex-1 px-6 mt-6">
            <Text className="text-white font-bold text-lg mb-4">
              Who do you want to read with? 📖
            </Text>

            {contactsLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="white" />
              </View>
            ) : contacts.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-6xl mb-4">😔</Text>
                <Text className="text-white text-center">
                  No contacts available right now
                </Text>
              </View>
            ) : (
              contacts
                .filter((c) => c.can_video_call !== false)
                .map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    onPress={() => handleSelectContact(contact)}
                    className="flex-row items-center bg-white rounded-2xl p-4 mb-3"
                  >
                    <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center">
                      <Text className="text-3xl">{getContactEmoji(contact)}</Text>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-gray-800 font-bold text-lg">
                        {contact.display_name || contact.name}
                      </Text>
                      <Text className="text-gray-500">{contact.relationship}</Text>
                    </View>
                    <View className="bg-amber-500 px-4 py-2 rounded-full">
                      <Text className="text-white font-bold">Read!</Text>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </View>

          {/* Solo Read Option */}
          <View className="px-6 pb-6">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace({
                  pathname: "/library/reader",
                  params: {
                    itemId: params.itemId,
                    title: params.title,
                    contentUrl: params.contentUrl,
                    contentType: "book",
                  },
                });
              }}
              className="bg-white/30 rounded-2xl p-4 items-center"
            >
              <Text className="text-white font-bold text-lg">
                📖 Read by myself instead
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Calling Screen
  if (screenState === "calling" && callState !== "connected") {
    return (
      <LinearGradient colors={["#8b5cf6", "#a855f7"]} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Animated.View
            style={[
              {
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 24,
              },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={{ fontSize: 80 }}>{getContactEmoji(selectedContact)}</Text>
          </Animated.View>

          <Text className="text-white text-2xl font-bold mb-2">
            Calling {selectedContact?.display_name || selectedContact?.name}...
          </Text>
          <Text className="text-purple-200 text-lg mb-8">
            Getting ready to read together!
          </Text>

          <View className="flex-row items-center bg-white/20 px-6 py-3 rounded-full mb-8">
            <Text className="text-3xl mr-2">📚</Text>
            <Text className="text-white font-bold" numberOfLines={1}>
              {params.title}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            className="w-16 h-16 bg-red-500 rounded-full items-center justify-center"
          >
            <Ionicons
              name="call"
              size={28}
              color="white"
              style={{ transform: [{ rotate: "135deg" }] }}
            />
          </TouchableOpacity>
          <Text className="text-purple-200 mt-3">Cancel</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Reading Together Screen
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" />

      {/* PDF Viewer */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
        style={{ flex: 1 }}
      >
        {isLoading && (
          <View className="absolute inset-0 items-center justify-center bg-amber-50 z-10">
            <ActivityIndicator size="large" color="#d97706" />
            <Text className="text-amber-800 text-lg mt-4">Loading book...</Text>
          </View>
        )}

        {webViewError ? (
          <View className="flex-1 items-center justify-center bg-amber-50 px-6">
            <Text className="text-6xl mb-4">😕</Text>
            <Text className="text-amber-800 text-xl text-center mb-2">
              Couldn't load the book
            </Text>
            <Text className="text-amber-600 text-center mb-6">{webViewError}</Text>
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
              setWebViewError(e.nativeEvent.description || "Failed to load");
              setIsLoading(false);
            }}
            scalesPageToFit
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        )}
      </TouchableOpacity>

      {/* Reaction Animation */}
      {activeReaction && (
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <Text style={{ fontSize: 100 }}>{activeReaction}</Text>
        </View>
      )}

      {/* Video Call PIP */}
      {remoteParticipant && (
        <View
          style={{
            position: "absolute",
            top: 100,
            right: 16,
            width: 120,
            height: 90,
            borderRadius: 12,
            overflow: "hidden",
            borderWidth: 3,
            borderColor: "#8b5cf6",
            backgroundColor: "#1f2937",
          }}
        >
          {remoteParticipant.isVideoOn ? (
            <VideoView
              participant={remoteParticipant}
              style={{ flex: 1 }}
              objectFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text style={{ fontSize: 40 }}>{getContactEmoji(selectedContact)}</Text>
            </View>
          )}
          {/* Call indicator */}
          <View
            style={{
              position: "absolute",
              bottom: 4,
              left: 4,
              backgroundColor: "#22c55e",
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "white",
                marginRight: 4,
              }}
            />
            <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
              Live
            </Text>
          </View>
        </View>
      )}

      {/* Local Video (small) */}
      {localParticipant && isVideoOn && (
        <View
          style={{
            position: "absolute",
            top: 196,
            right: 16,
            width: 60,
            height: 80,
            borderRadius: 8,
            overflow: "hidden",
            borderWidth: 2,
            borderColor: "white",
          }}
        >
          <VideoView
            participant={localParticipant}
            style={{ flex: 1 }}
            mirror
            objectFit="cover"
          />
        </View>
      )}

      {/* Controls */}
      {showControls && (
        <>
          {/* Top Bar */}
          <SafeAreaView
            style={{ position: "absolute", top: 0, left: 0, right: 0 }}
            edges={["top"]}
          >
            <View className="flex-row items-center justify-between px-4 py-2 bg-amber-500/90">
              <TouchableOpacity
                onPress={handleClose}
                className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

              <View className="flex-1 mx-4">
                <Text className="text-white font-bold text-center" numberOfLines={1}>
                  {params.title || "Book"}
                </Text>
                <Text className="text-amber-100 text-center text-xs">
                  Reading with {selectedContact?.display_name || selectedContact?.name}
                </Text>
              </View>

              {/* Call Controls */}
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleAudio();
                  }}
                  className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
                    isAudioOn ? "bg-white/20" : "bg-red-500"
                  }`}
                >
                  <Ionicons
                    name={isAudioOn ? "mic" : "mic-off"}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleVideo();
                  }}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isVideoOn ? "bg-white/20" : "bg-red-500"
                  }`}
                >
                  <Ionicons
                    name={isVideoOn ? "videocam" : "videocam-off"}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Bottom Bar - Reactions */}
          <SafeAreaView
            style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
            edges={["bottom"]}
          >
            <View className="px-4 py-3 bg-amber-100/90">
              <View className="flex-row justify-center items-center space-x-2">
                {showReactions ? (
                  <>
                    {REACTIONS.map((emoji) => (
                      <TouchableOpacity
                        key={emoji}
                        onPress={() => sendReaction(emoji)}
                        className="w-12 h-12 bg-white rounded-full items-center justify-center shadow"
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setShowReactions(false)}
                      className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setShowReactions(true)}
                      className="flex-row items-center bg-amber-500 px-5 py-3 rounded-full"
                    >
                      <Text style={{ fontSize: 20, marginRight: 8 }}>😊</Text>
                      <Text className="text-white font-bold">React</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleClose}
                      className="flex-row items-center bg-red-500 px-5 py-3 rounded-full ml-3"
                    >
                      <Ionicons name="exit-outline" size={20} color="white" />
                      <Text className="text-white font-bold ml-2">Done</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </SafeAreaView>
        </>
      )}

      {/* Hint */}
      {showControls && !isLoading && !webViewError && (
        <View
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View className="bg-black/50 px-4 py-2 rounded-full">
            <Text className="text-white text-sm">
              📖 Pinch to zoom • Swipe to turn pages
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

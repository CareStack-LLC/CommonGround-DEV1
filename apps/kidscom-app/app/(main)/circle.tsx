import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";

import { useCircleContacts, CircleContact } from "@/hooks/useCircleContacts";

export default function CircleScreen() {
  const { contacts, isLoading, refresh } = useCircleContacts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <LinearGradient
      colors={["#ec4899", "#f472b6", "#f9a8d4"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-6">
            <Text className="text-4xl font-bold text-white text-center">
              My Circle 👨‍👩‍👧‍👦
            </Text>
            <Text className="text-lg text-pink-200 text-center mt-2">
              Tap someone to call them!
            </Text>
          </View>

          {/* Contact Grid */}
          <View className="px-4">
            {contacts.length === 0 && !isLoading ? (
              <View className="items-center py-12">
                <Text className="text-6xl mb-4">😢</Text>
                <Text className="text-white text-xl text-center">
                  No contacts yet!
                </Text>
                <Text className="text-pink-200 text-center mt-2">
                  Ask a parent to add people to your circle
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-center">
                {contacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ContactCard({ contact }: { contact: CircleContact }) {
  // Check parent-set permissions
  const canCall = contact.can_video_call !== false;
  const isWithinTime = contact.is_within_allowed_time !== false;
  const requiresParent = contact.require_parent_present === true;

  // Contact is available if they can call AND it's within allowed time
  const isAvailable = canCall && isWithinTime;

  const handleCall = () => {
    if (!isAvailable) return;
    router.push(`/call/${contact.id}`);
  };

  return (
    <TouchableOpacity
      className="w-40 m-2"
      onPress={handleCall}
      activeOpacity={isAvailable ? 0.8 : 1}
      disabled={!isAvailable}
    >
      <View className={`bg-white rounded-3xl p-4 items-center shadow-xl ${!isAvailable ? 'opacity-60' : ''}`}>
        {/* Avatar */}
        <View className="relative">
          <View className={`w-24 h-24 rounded-full items-center justify-center mb-3 ${isAvailable ? 'bg-pink-100' : 'bg-gray-200'}`}>
            {contact.avatar_url ? (
              <Image
                source={{ uri: contact.avatar_url }}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <Text className="text-5xl">{getContactEmoji(contact.relationship)}</Text>
            )}
          </View>
          {/* Online indicator - only show if contact is available */}
          {contact.is_online && isAvailable && (
            <View className="absolute bottom-3 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
          )}
          {/* Requires parent indicator */}
          {requiresParent && isAvailable && (
            <View className="absolute top-0 right-0 w-7 h-7 bg-orange-500 rounded-full border-2 border-white items-center justify-center">
              <Text className="text-xs">👨‍👩‍👧</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text className="text-lg font-bold text-gray-800 text-center">
          {contact.display_name || contact.name}
        </Text>

        {/* Relationship */}
        {contact.relationship && (
          <Text className="text-sm text-pink-500 text-center capitalize">
            {contact.relationship}
          </Text>
        )}

        {/* Status Messages */}
        {!canCall && (
          <Text className="text-xs text-gray-400 text-center mt-1">
            🚫 Calling not allowed
          </Text>
        )}
        {canCall && !isWithinTime && (
          <Text className="text-xs text-orange-500 text-center mt-1">
            ⏰ Not available now
          </Text>
        )}
        {requiresParent && isAvailable && (
          <Text className="text-xs text-orange-500 text-center mt-1">
            👨‍👩‍👧 Parent needed
          </Text>
        )}

        {/* Call Button */}
        <TouchableOpacity
          className={`mt-3 px-6 py-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
          onPress={handleCall}
          disabled={!isAvailable}
        >
          <Text className={`font-bold ${isAvailable ? 'text-white' : 'text-gray-500'}`}>
            {isAvailable ? '📞 Call' : '🔒 Locked'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getContactEmoji(relationship?: string): string {
  switch (relationship?.toLowerCase()) {
    case "grandparent":
      return "👴";
    case "grandmother":
      return "👵";
    case "grandfather":
      return "👴";
    case "aunt":
      return "👩";
    case "uncle":
      return "👨";
    case "parent":
    case "mom":
    case "mother":
      return "👩";
    case "dad":
    case "father":
      return "👨";
    case "sibling":
    case "brother":
      return "👦";
    case "sister":
      return "👧";
    case "cousin":
      return "🧒";
    default:
      return "😊";
  }
}

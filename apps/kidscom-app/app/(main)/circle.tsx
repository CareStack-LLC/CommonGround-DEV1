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
      className="flex-1"
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
  const handleCall = () => {
    router.push(`/call/${contact.id}`);
  };

  return (
    <TouchableOpacity
      className="w-40 m-2"
      onPress={handleCall}
      activeOpacity={0.8}
    >
      <View className="bg-white rounded-3xl p-4 items-center shadow-xl">
        {/* Avatar */}
        <View className="relative">
          <View className="w-24 h-24 rounded-full bg-pink-100 items-center justify-center mb-3">
            {contact.avatar_url ? (
              <Image
                source={{ uri: contact.avatar_url }}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <Text className="text-5xl">{getContactEmoji(contact.relationship)}</Text>
            )}
          </View>
          {/* Online indicator */}
          {contact.is_online && (
            <View className="absolute bottom-3 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
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

        {/* Call Button */}
        <TouchableOpacity
          className="mt-3 bg-green-500 px-6 py-2 rounded-full"
          onPress={handleCall}
        >
          <Text className="text-white font-bold">📞 Call</Text>
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

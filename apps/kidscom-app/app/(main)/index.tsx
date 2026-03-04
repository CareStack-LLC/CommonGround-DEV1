import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useChildAuth } from "@/providers/ChildAuthProvider";
import { useCircleContacts } from "@/hooks/useCircleContacts";

export default function HomeScreen() {
  const { child } = useChildAuth();
  const { contacts } = useCircleContacts();

  const firstName = child?.first_name || "Friend";

  // Get top 3 contacts for quick call
  const quickCallContacts = contacts.slice(0, 3);

  return (
    <LinearGradient
      colors={["#8b5cf6", "#a855f7", "#c084fc"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <View className="px-6 pt-4 pb-8">
            <Text className="text-5xl font-bold text-white text-center">
              Hey {firstName}! 👋
            </Text>
            <Text className="text-xl text-purple-200 text-center mt-2">
              Who do you want to talk to?
            </Text>
          </View>

          {/* Quick Call Section */}
          {quickCallContacts.length > 0 && (
            <View className="px-6 mb-8">
              <View className="flex-row justify-center space-x-4">
                {quickCallContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    className="items-center"
                    onPress={() => router.push(`/call/${contact.id}`)}
                  >
                    <View className="w-24 h-24 rounded-full bg-white shadow-xl items-center justify-center mb-2">
                      {contact.avatar_url ? (
                        <Image
                          source={{ uri: contact.avatar_url }}
                          className="w-20 h-20 rounded-full"
                        />
                      ) : (
                        <Text className="text-4xl">{getContactEmoji(contact.relationship)}</Text>
                      )}
                    </View>
                    <Text className="text-white font-bold text-lg">
                      {contact.display_name || contact.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Fun Activity Cards */}
          <View className="px-6">
            <ActivityCard
              emoji="📞"
              title="Call Someone"
              subtitle="Talk to your family!"
              colors={["#ec4899", "#f472b6"]}
              onPress={() => router.push("/(main)/circle")}
            />

            <ActivityCard
              emoji="🎬"
              title="Watch Together"
              subtitle="Movie time with family!"
              colors={["#f97316", "#fb923c"]}
              onPress={() => router.push("/(main)/theater")}
            />

            <ActivityCard
              emoji="🎮"
              title="Play Games"
              subtitle="Fun games to play!"
              colors={["#06b6d4", "#22d3ee"]}
              onPress={() => router.push("/(main)/arcade")}
            />

            <ActivityCard
              emoji="📚"
              title="My Library"
              subtitle="Stories and more!"
              colors={["#84cc16", "#a3e635"]}
              onPress={() => router.push("/(main)/library")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function ActivityCard({
  emoji,
  title,
  subtitle,
  colors,
  onPress,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  colors: string[];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="mb-4 overflow-hidden rounded-3xl shadow-xl"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24, flexDirection: "row", alignItems: "center" }}
      >
        <View className="w-16 h-16 bg-white/30 rounded-2xl items-center justify-center">
          <Text className="text-4xl">{emoji}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-2xl font-bold text-white">{title}</Text>
          <Text className="text-white/80 text-lg">{subtitle}</Text>
        </View>
        <Text className="text-3xl">→</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function getContactEmoji(relationship?: string): string {
  switch (relationship?.toLowerCase()) {
    case "grandparent":
      return "👴";
    case "aunt":
    case "uncle":
      return "🧑";
    case "parent":
      return "👨";
    case "sibling":
      return "👧";
    default:
      return "😊";
  }
}

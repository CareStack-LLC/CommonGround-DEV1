import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import * as Haptics from "expo-haptics";

import { useAuth } from "@/providers/AuthProvider";

export default function HomeScreen() {
  const { user, connectedChildren, refreshChildren } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshChildren();
    setRefreshing(false);
  };

  const handleCallChild = (childId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/call/${childId}`);
  };

  const onlineChildren = connectedChildren.filter((c) => c.is_online);
  const offlineChildren = connectedChildren.filter((c) => !c.is_online);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["#0ea5e9", "#38bdf8"]}
          className="px-6 pt-4 pb-8 rounded-b-3xl"
        >
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-sky-100 text-base">Welcome back,</Text>
              <Text className="text-white text-2xl font-bold">
                {user?.name || "Friend"}
              </Text>
            </View>
            <TouchableOpacity
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
              onPress={() => router.push("/(tabs)/settings")}
            >
              <Ionicons name="person" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View className="flex-row bg-white/20 rounded-2xl p-4">
            <View className="flex-1 items-center">
              <Text className="text-white text-3xl font-bold">
                {connectedChildren.length}
              </Text>
              <Text className="text-sky-100">Connected</Text>
            </View>
            <View className="w-px bg-white/30" />
            <View className="flex-1 items-center">
              <Text className="text-white text-3xl font-bold">
                {onlineChildren.length}
              </Text>
              <Text className="text-sky-100">Online Now</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Online Children */}
        {onlineChildren.length > 0 && (
          <View className="px-6 mt-6">
            <View className="flex-row items-center mb-4">
              <View className="w-3 h-3 bg-green-500 rounded-full mr-2" />
              <Text className="text-lg font-bold text-gray-800">
                Available Now
              </Text>
            </View>

            {onlineChildren.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onCall={() => handleCallChild(child.id)}
              />
            ))}
          </View>
        )}

        {/* Offline Children */}
        {offlineChildren.length > 0 && (
          <View className="px-6 mt-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">
              {onlineChildren.length > 0 ? "Others" : "Your Circle"}
            </Text>

            {offlineChildren.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onCall={() => handleCallChild(child.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {connectedChildren.length === 0 && (
          <View className="px-6 mt-12 items-center">
            <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              No Connections Yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Ask a parent to add you to their family's circle using your email
              or an invitation code.
            </Text>
          </View>
        )}

        {/* Recent Activity */}
        <View className="px-6 mt-8">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Recent Activity
          </Text>

          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <ActivityItem
              icon="videocam"
              iconColor="#22c55e"
              title="Video call with Emma"
              subtitle="Yesterday at 4:30 PM"
            />
            <ActivityItem
              icon="image"
              iconColor="#8b5cf6"
              title="Shared 3 photos with Lucas"
              subtitle="2 days ago"
            />
            <ActivityItem
              icon="chatbubble"
              iconColor="#0ea5e9"
              title="Message from Emma"
              subtitle="3 days ago"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChildCard({
  child,
  onCall,
}: {
  child: {
    id: string;
    name: string;
    avatar_url?: string;
    age: number;
    is_online: boolean;
  };
  onCall: () => void;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-center">
        {/* Avatar */}
        <View className="relative">
          <View className="w-16 h-16 bg-primary-100 rounded-full items-center justify-center">
            {child.avatar_url ? (
              <Image
                source={{ uri: child.avatar_url }}
                className="w-14 h-14 rounded-full"
              />
            ) : (
              <Text className="text-3xl">
                {child.age < 10 ? "👧" : "🧑"}
              </Text>
            )}
          </View>
          {child.is_online && (
            <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Info */}
        <View className="flex-1 ml-4">
          <Text className="text-lg font-bold text-gray-800">{child.name}</Text>
          <Text className="text-gray-500">
            {child.is_online ? (
              <Text className="text-green-500">Available to chat</Text>
            ) : (
              "Currently offline"
            )}
          </Text>
        </View>

        {/* Call Button */}
        <TouchableOpacity
          className={`px-5 py-3 rounded-xl ${
            child.is_online ? "bg-green-500" : "bg-gray-200"
          }`}
          onPress={onCall}
          disabled={!child.is_online}
        >
          <View className="flex-row items-center">
            <Ionicons
              name="videocam"
              size={20}
              color={child.is_online ? "white" : "#9ca3af"}
            />
            <Text
              className={`ml-2 font-bold ${
                child.is_online ? "text-white" : "text-gray-400"
              }`}
            >
              Call
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActivityItem({
  icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0">
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-gray-800 font-medium">{title}</Text>
        <Text className="text-gray-400 text-sm">{subtitle}</Text>
      </View>
    </View>
  );
}

/**
 * Circle Contacts List Screen
 * Manage family circle - grandparents, aunts, uncles, etc.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";

interface CircleContact {
  id: string;
  contact_name: string;
  contact_email?: string;
  relationship_type?: string;
  room_number?: number;
  is_active: boolean;
  is_verified: boolean;
  photo_url?: string;
}

interface RoomInfo {
  assigned_count: number;
  available_count: number;
}

export default function CircleScreen() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const familyFileId = user?.family_file_id || "demo-family";

  const fetchData = useCallback(async () => {
    try {
      // Fetch rooms for count info
      const roomsResponse = await parent.myCircle.getRooms(familyFileId);
      setRoomInfo({
        assigned_count: roomsResponse.assigned_count,
        available_count: roomsResponse.available_count,
      });

      // Get contacts from rooms
      const assignedContacts = roomsResponse.items
        .filter((room) => room.assigned_to_id)
        .map((room) => ({
          id: room.assigned_to_id!,
          contact_name: room.assigned_contact_name || "Unknown",
          relationship_type: room.assigned_contact_relationship,
          room_number: room.room_number,
          is_active: room.is_active,
          is_verified: true,
        }));

      setContacts(assignedContacts);
    } catch (error) {
      console.error("Failed to fetch circle data:", error);
      // Demo data
      setContacts([
        {
          id: "1",
          contact_name: "Grandma Rose",
          contact_email: "grandma@email.com",
          relationship_type: "grandparent",
          room_number: 3,
          is_active: true,
          is_verified: true,
        },
        {
          id: "2",
          contact_name: "Uncle Mike",
          contact_email: "mike@email.com",
          relationship_type: "uncle",
          room_number: 4,
          is_active: true,
          is_verified: false,
        },
      ]);
      setRoomInfo({ assigned_count: 2, available_count: 6 });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getRelationshipEmoji = (relationship?: string) => {
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
      case "cousin":
        return "🧒";
      case "godparent":
        return "✨";
      default:
        return "👤";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-secondary-500 mt-4">Loading circle...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "My Circle",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/circle/invite")}
              className="mr-4"
            >
              <Ionicons name="add-circle" size={28} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Room Status Banner */}
        {roomInfo && (
          <View className="mx-6 mt-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-100 dark:bg-primary-800 rounded-full items-center justify-center">
                <Ionicons name="people" size={24} color="#2563eb" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-primary-700 dark:text-primary-300 font-bold text-lg">
                  Family Circle
                </Text>
                <Text className="text-primary-600 dark:text-primary-400">
                  {roomInfo.assigned_count} contacts • {roomInfo.available_count} rooms available
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="flex-row mx-6 mt-4 space-x-3">
          <TouchableOpacity
            className="flex-1 bg-white dark:bg-secondary-800 rounded-xl p-4 items-center"
            onPress={() => router.push("/circle/logs")}
          >
            <View className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center">
              <Ionicons name="list" size={20} color="#16a34a" />
            </View>
            <Text className="text-secondary-900 dark:text-white font-medium mt-2">
              View Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-white dark:bg-secondary-800 rounded-xl p-4 items-center"
            onPress={() => router.push("/circle/invite")}
          >
            <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Ionicons name="person-add" size={20} color="#2563eb" />
            </View>
            <Text className="text-secondary-900 dark:text-white font-medium mt-2">
              Add Contact
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contacts List */}
        <View className="px-6 mt-6">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Circle Members ({contacts.length})
          </Text>

          {contacts.length === 0 ? (
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-8 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-secondary-500 mt-4 text-center">
                No circle members yet.{"\n"}Invite grandparents, aunts, uncles, and more!
              </Text>
              <TouchableOpacity
                className="mt-4 bg-primary-600 px-6 py-3 rounded-xl"
                onPress={() => router.push("/circle/invite")}
              >
                <Text className="text-white font-semibold">Invite Someone</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white dark:bg-secondary-800 rounded-xl overflow-hidden">
              {contacts.map((contact, index) => (
                <TouchableOpacity
                  key={contact.id}
                  className={`flex-row items-center px-4 py-4 ${
                    index < contacts.length - 1
                      ? "border-b border-secondary-100 dark:border-secondary-700"
                      : ""
                  }`}
                  onPress={() => router.push(`/circle/${contact.id}`)}
                >
                  <View className="w-14 h-14 bg-secondary-100 dark:bg-secondary-700 rounded-full items-center justify-center">
                    <Text className="text-3xl">
                      {getRelationshipEmoji(contact.relationship_type)}
                    </Text>
                  </View>

                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center">
                      <Text className="text-secondary-900 dark:text-white font-semibold text-lg">
                        {contact.contact_name}
                      </Text>
                      {!contact.is_verified && (
                        <View className="ml-2 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          <Text className="text-yellow-700 dark:text-yellow-300 text-xs">
                            Pending
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-secondary-500 dark:text-secondary-400 capitalize">
                      {contact.relationship_type || "Family Member"}
                    </Text>
                    {contact.room_number && (
                      <Text className="text-secondary-400 dark:text-secondary-500 text-sm">
                        Room {contact.room_number}
                      </Text>
                    )}
                  </View>

                  <View className="items-end">
                    <View
                      className={`w-3 h-3 rounded-full ${
                        contact.is_active ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <Text className="text-secondary-400 text-xs mt-1">
                      {contact.is_active ? "Active" : "Paused"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#9ca3af"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View className="mx-6 mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex-row">
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-700 dark:text-blue-300 font-medium">
              Parental Controls
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-sm mt-1">
              Tap any contact to set call times, duration limits, chat permissions,
              and require supervision.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

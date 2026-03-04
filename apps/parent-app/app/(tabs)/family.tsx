import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

export default function FamilyScreen() {
  const { user } = useAuth();
  const { familyFile, children, coParent, circleContacts, isLoading, refresh } = useFamilyFile();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Family File Header */}
        <View className="px-6 py-6 bg-white dark:bg-secondary-800 mb-4">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl items-center justify-center">
              <Ionicons name="people" size={32} color="#2563eb" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold text-secondary-900 dark:text-white">
                {familyFile?.title || "Your Family"}
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                Family File #{familyFile?.family_file_number || "---"}
              </Text>
            </View>
          </View>
        </View>

        {/* Co-Parent Section */}
        <View className="px-6 mb-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Co-Parent
          </Text>
          {coParent ? (
            <TouchableOpacity className="card flex-row items-center">
              <View className="w-14 h-14 bg-secondary-200 dark:bg-secondary-700 rounded-full items-center justify-center">
                <Text className="text-secondary-600 dark:text-secondary-300 font-bold text-xl">
                  {coParent.first_name?.charAt(0) || "?"}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-secondary-900 dark:text-white font-semibold">
                  {coParent.first_name} {coParent.last_name}
                </Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  {coParent.email}
                </Text>
              </View>
              <View className="flex-row space-x-2">
                <TouchableOpacity className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
                  <Ionicons name="chatbubble" size={20} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity className="w-10 h-10 bg-success-50 dark:bg-success-500/10 rounded-full items-center justify-center">
                  <Ionicons name="videocam" size={20} color="#22c55e" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="card items-center py-8">
              <Ionicons name="person-add-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No co-parent connected
              </Text>
              <TouchableOpacity className="mt-4">
                <Text className="text-primary-600 font-medium">
                  + Invite Co-Parent
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Children Section */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
              Children
            </Text>
            <TouchableOpacity>
              <Text className="text-primary-600 text-sm">+ Add Child</Text>
            </TouchableOpacity>
          </View>
          {children && children.length > 0 ? (
            <View className="space-y-3">
              {children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </View>
          ) : (
            <View className="card items-center py-8">
              <Ionicons name="happy-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No children added
              </Text>
              <TouchableOpacity className="mt-4">
                <Text className="text-primary-600 font-medium">
                  + Add Child
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* My Circle Section */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
              My Circle
            </Text>
            <TouchableOpacity>
              <Text className="text-primary-600 text-sm">Manage</Text>
            </TouchableOpacity>
          </View>
          {circleContacts && circleContacts.length > 0 ? (
            <View className="space-y-3">
              {circleContacts.map((contact) => (
                <CircleContactCard key={contact.id} contact={contact} />
              ))}
            </View>
          ) : (
            <View className="card items-center py-8">
              <Ionicons name="people-circle-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No circle contacts
              </Text>
              <Text className="text-secondary-400 dark:text-secondary-500 text-sm text-center mt-1 px-4">
                Add trusted contacts who can communicate with your children
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChildCard({ child }: { child: { id: string; first_name: string; date_of_birth?: string } }) {
  const age = child.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(child.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <TouchableOpacity className="card flex-row items-center">
      <View className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
        <Text className="text-primary-600 font-bold text-xl">
          {child.first_name.charAt(0)}
        </Text>
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-secondary-900 dark:text-white font-semibold">
          {child.first_name}
        </Text>
        {age !== null && (
          <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
            {age} years old
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function CircleContactCard({ contact }: { contact: { id: string; name: string; relationship: string } }) {
  return (
    <TouchableOpacity className="card flex-row items-center">
      <View className="w-12 h-12 bg-secondary-200 dark:bg-secondary-700 rounded-full items-center justify-center">
        <Text className="text-secondary-600 dark:text-secondary-300 font-bold">
          {contact.name.charAt(0)}
        </Text>
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-secondary-900 dark:text-white font-medium">
          {contact.name}
        </Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
          {contact.relationship}
        </Text>
      </View>
      <View className="bg-success-50 dark:bg-success-500/10 px-2 py-1 rounded">
        <Text className="text-success-600 dark:text-success-500 text-xs">
          Approved
        </Text>
      </View>
    </TouchableOpacity>
  );
}

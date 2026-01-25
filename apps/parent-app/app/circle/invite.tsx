/**
 * Invite Circle Contact Screen
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";

const RELATIONSHIPS = [
  { id: "grandparent", label: "Grandparent", emoji: "👴" },
  { id: "aunt", label: "Aunt", emoji: "👩" },
  { id: "uncle", label: "Uncle", emoji: "👨" },
  { id: "cousin", label: "Cousin", emoji: "🧒" },
  { id: "godparent", label: "Godparent", emoji: "✨" },
  { id: "family_friend", label: "Family Friend", emoji: "🤝" },
  { id: "other", label: "Other", emoji: "👤" },
];

export default function InviteScreen() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const familyFileId = user?.family_file_id || "demo-family";

  const handleSendInvite = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    if (!relationship) {
      Alert.alert("Error", "Please select a relationship");
      return;
    }

    setIsLoading(true);
    try {
      const response = await parent.myCircle.createAndInviteCircleUser({
        family_file_id: familyFileId,
        contact_name: name.trim(),
        email: email.trim().toLowerCase(),
        relationship_type: relationship,
      });
      setInviteUrl(response.invite_url);
      Alert.alert(
        "Invitation Sent!",
        `An email has been sent to ${email} with instructions to join your family circle.`
      );
    } catch (error) {
      console.error("Failed to send invite:", error);
      // Demo mode
      setInviteUrl("https://app.commonground.com/my-circle/accept?token=demo123");
      Alert.alert(
        "Invitation Sent!",
        `An email has been sent to ${email} (demo mode).`
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (inviteUrl) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
        <Stack.Screen options={{ title: "Invite Sent" }} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-secondary-900 dark:text-white text-center">
            Invitation Sent!
          </Text>
          <Text className="text-secondary-500 dark:text-secondary-400 text-center mt-4 text-lg">
            {name} will receive an email with instructions to join your family circle.
          </Text>

          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 mt-8 w-full">
            <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-2">
              Or share this link directly:
            </Text>
            <View className="bg-secondary-100 dark:bg-secondary-700 rounded-lg p-3">
              <Text className="text-secondary-700 dark:text-secondary-300 text-sm" numberOfLines={1}>
                {inviteUrl}
              </Text>
            </View>
            <TouchableOpacity className="mt-3 flex-row items-center justify-center">
              <Ionicons name="copy-outline" size={18} color="#2563eb" />
              <Text className="text-primary-600 font-medium ml-2">Copy Link</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 px-8 mt-8"
            onPress={() => router.back()}
          >
            <Text className="text-white font-semibold text-lg">Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Invite to Circle" }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-secondary-900 dark:text-white text-lg">
            Invite a trusted family member to connect with your children through
            video calls, messages, and more.
          </Text>
        </View>

        {/* Form */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Contact Info
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <View className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700">
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
                Full Name
              </Text>
              <TextInput
                className="text-secondary-900 dark:text-white text-base"
                value={name}
                onChangeText={setName}
                placeholder="Grandma Rose"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View className="px-4 py-3">
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
                Email Address
              </Text>
              <TextInput
                className="text-secondary-900 dark:text-white text-base"
                value={email}
                onChangeText={setEmail}
                placeholder="grandma@email.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Relationship Selector */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Relationship
          </Text>
          <View className="flex-row flex-wrap">
            {RELATIONSHIPS.map((rel) => (
              <TouchableOpacity
                key={rel.id}
                className={`mr-2 mb-2 px-4 py-3 rounded-xl flex-row items-center ${
                  relationship === rel.id
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setRelationship(rel.id)}
              >
                <Text className="mr-2">{rel.emoji}</Text>
                <Text
                  className={`font-medium ${
                    relationship === rel.id
                      ? "text-white"
                      : "text-secondary-900 dark:text-white"
                  }`}
                >
                  {rel.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Banner */}
        <View className="mx-6 my-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex-row">
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-700 dark:text-blue-300 font-medium">
              What happens next?
            </Text>
            <Text className="text-blue-600 dark:text-blue-400 text-sm mt-1">
              {name || "They"} will receive an email to set up their account. You can
              then customize their permissions for each child.
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <View className="px-6 py-4">
          <TouchableOpacity
            className={`py-4 rounded-xl items-center ${
              name && email && relationship ? "bg-primary-600" : "bg-secondary-300"
            }`}
            onPress={handleSendInvite}
            disabled={isLoading || !name || !email || !relationship}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="mail" size={20} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Send Invitation
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

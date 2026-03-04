/**
 * Edit Profile Screen
 */

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";
import { parent } from "@commonground/api-client";

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }

    setIsSaving(true);
    try {
      await parent.auth.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      await refreshUser?.();
      Alert.alert("Success", "Your profile has been updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isSaving} className="mr-4">
              {isSaving ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text className="text-primary-600 font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar */}
        <View className="items-center py-8 bg-white dark:bg-secondary-800">
          <View className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
            <Text className="text-primary-600 font-bold text-4xl">
              {firstName.charAt(0) || user?.first_name?.charAt(0) || "U"}
            </Text>
          </View>
          <TouchableOpacity className="mt-3">
            <Text className="text-primary-600 font-medium">Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View className="px-6 py-6">
          <View className="bg-white dark:bg-secondary-800 rounded-xl overflow-hidden">
            <FormField
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              autoCapitalize="words"
            />
            <FormField
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              autoCapitalize="words"
            />
            <FormField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 555-5555"
              keyboardType="phone-pad"
              isLast
            />
          </View>
        </View>

        {/* Email (read-only) */}
        <View className="px-6">
          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4">
            <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
              Email Address
            </Text>
            <View className="flex-row items-center">
              <Text className="text-secondary-900 dark:text-white flex-1">
                {user?.email}
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="lock-closed" size={14} color="#94a3b8" />
                <Text className="text-secondary-400 text-xs ml-1">Verified</Text>
              </View>
            </View>
          </View>
          <Text className="text-secondary-500 text-sm mt-2 px-2">
            Contact support to change your email address
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "words" | "sentences";
  isLast?: boolean;
}) {
  return (
    <View
      className={`px-4 py-3 ${
        !isLast ? "border-b border-secondary-100 dark:border-secondary-700" : ""
      }`}
    >
      <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
        {label}
      </Text>
      <TextInput
        className="text-secondary-900 dark:text-white text-base"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

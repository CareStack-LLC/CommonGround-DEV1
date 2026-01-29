/**
 * Register Screen for My Circle App
 *
 * Circle is invitation-only, so this screen explains that users need an invitation
 * and provides options to enter an invitation code or check their email.
 */

import { View, Text, TouchableOpacity } from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-8">
          {/* Icon */}
          <View className="items-center mb-8">
            <LinearGradient
              colors={["#0ea5e9", "#38bdf8"]}
              className="w-24 h-24 rounded-full items-center justify-center"
            >
              <Ionicons name="mail-unread" size={48} color="white" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text className="text-3xl font-bold text-gray-800 text-center mb-4">
            Invitation Required
          </Text>

          {/* Explanation */}
          <Text className="text-gray-500 text-center mb-8 text-lg">
            My Circle is invitation-only. A parent must invite you to connect
            with their children.
          </Text>

          {/* How it works */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-8">
            <Text className="font-bold text-gray-800 mb-4">How to join:</Text>

            <View className="flex-row items-start mb-3">
              <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center mr-3">
                <Text className="text-primary-700 font-bold">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-700">
                  Ask a parent to invite you through their CommonGround app
                </Text>
              </View>
            </View>

            <View className="flex-row items-start mb-3">
              <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center mr-3">
                <Text className="text-primary-700 font-bold">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-700">
                  Check your email for the invitation link
                </Text>
              </View>
            </View>

            <View className="flex-row items-start">
              <View className="w-8 h-8 bg-primary-100 rounded-full items-center justify-center mr-3">
                <Text className="text-primary-700 font-bold">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-700">
                  Click the link or enter your invitation code here
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            className="bg-warmth-500 py-4 rounded-xl items-center mb-4"
            onPress={() => router.push("/(auth)/invitation")}
          >
            <Text className="text-white font-bold text-lg">
              I Have an Invitation Code
            </Text>
          </TouchableOpacity>

          {/* Already have account */}
          <View className="flex-row justify-center mt-4">
            <Text className="text-gray-500">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-bold">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Footer note */}
        <View className="px-6 pb-8">
          <View className="bg-blue-50 rounded-xl p-4 flex-row items-start">
            <Ionicons
              name="information-circle"
              size={24}
              color="#0284c7"
              style={{ marginRight: 12 }}
            />
            <Text className="flex-1 text-blue-700 text-sm">
              For security and child safety, only parents can add members to
              their family's circle.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

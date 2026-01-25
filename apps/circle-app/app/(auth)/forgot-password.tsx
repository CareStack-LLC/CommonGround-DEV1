import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSent(true);
  };

  if (isSent) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <Ionicons name="mail" size={40} color="#22c55e" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
              Check Your Email
            </Text>
            <Text className="text-gray-500 text-center mb-8">
              We've sent password reset instructions to {email}
            </Text>
            <TouchableOpacity
              className="bg-primary-500 py-4 px-8 rounded-xl"
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text className="text-white font-bold text-lg">
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="pt-8">
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Forgot Password?
            </Text>
            <Text className="text-gray-500 mb-8">
              No worries! Enter your email and we'll send you reset instructions.
            </Text>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-600">{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Email</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-800"
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              className="bg-primary-500 py-4 rounded-xl items-center shadow-md"
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

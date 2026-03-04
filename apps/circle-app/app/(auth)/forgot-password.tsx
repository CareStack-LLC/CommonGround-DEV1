/**
 * Forgot Password Screen for My Circle App
 *
 * Sends password reset email to circle users
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { circle } from "@/lib/api";

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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await circle.auth.forgotPassword(email.trim());
      setIsSent(true);
    } catch (err: any) {
      console.error("[ForgotPassword] Error:", err);
      // Don't show specific errors for security - always show success
      // The backend also always returns success to prevent email enumeration
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
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
            <Text className="text-gray-500 text-center mb-2">
              If an account exists for {email}, we've sent password reset
              instructions.
            </Text>
            <Text className="text-gray-400 text-sm text-center mb-8">
              The link will expire in 1 hour.
            </Text>
            <TouchableOpacity
              className="bg-primary-500 py-4 px-8 rounded-xl"
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text className="text-white font-bold text-lg">
                Back to Sign In
              </Text>
            </TouchableOpacity>

            {/* Resend option */}
            <TouchableOpacity
              className="mt-6"
              onPress={() => {
                setIsSent(false);
                setEmail("");
              }}
            >
              <Text className="text-primary-600 font-medium">
                Didn't receive the email? Try again
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
              No worries! Enter your email and we'll send you reset
              instructions.
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
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl items-center shadow-md ${
                isLoading ? "bg-primary-400" : "bg-primary-500"
              }`}
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

            {/* Back to login link */}
            <TouchableOpacity
              className="mt-6 items-center"
              onPress={() => router.back()}
            >
              <Text className="text-gray-500">
                Remember your password?{" "}
                <Text className="text-primary-600 font-bold">Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // TODO: Implement password reset API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900">
        <View className="flex-1 px-6 pt-8 items-center justify-center">
          <View className="w-20 h-20 bg-success-500 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark" size={40} color="white" />
          </View>
          <Text className="text-2xl font-bold text-secondary-900 dark:text-white text-center">
            Check Your Email
          </Text>
          <Text className="text-secondary-500 dark:text-secondary-400 text-center mt-3 px-4">
            We've sent password reset instructions to {email}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="btn-primary mt-8 w-full">
              <Text className="text-white text-center font-semibold text-lg">
                Back to Login
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-8">
          {/* Back Button */}
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="flex-row items-center mb-6">
              <Ionicons name="arrow-back" size={24} color="#2563eb" />
              <Text className="text-primary-600 ml-1">Back to login</Text>
            </TouchableOpacity>
          </Link>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-secondary-900 dark:text-white">
              Reset Password
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 mt-2">
              Enter your email and we'll send you instructions to reset your
              password
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Email
              </Text>
              <TextInput
                className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700"
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {error && (
              <View className="bg-danger-50 dark:bg-danger-500/10 p-3 rounded-lg">
                <Text className="text-danger-600 dark:text-danger-500 text-sm">
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              className={`btn-primary mt-4 ${isLoading ? "opacity-70" : ""}`}
              onPress={handleSubmit}
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
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

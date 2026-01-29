/**
 * Reset Password Screen for My Circle App
 *
 * Handles password reset after clicking link from email
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { circle } from "@/lib/api";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setTokenError("No reset token provided. Please request a new password reset link.");
        setIsValidating(false);
        return;
      }

      try {
        const info = await circle.auth.getResetTokenInfo(token);
        if (info.valid) {
          setUserEmail(info.email);
        } else {
          setTokenError("This reset link is invalid or has expired. Please request a new one.");
        }
      } catch (err: any) {
        console.error("[ResetPassword] Token validation error:", err);
        if (err?.message?.includes("expired")) {
          setTokenError("This reset link has expired. Please request a new one.");
        } else {
          setTokenError("This reset link is invalid or has expired. Please request a new one.");
        }
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const handleResetPassword = async () => {
    setError("");

    if (!password) {
      setError("Please enter a new password");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await circle.auth.resetPassword(token!, password, confirmPassword);
      setIsReset(true);
    } catch (err: any) {
      console.error("[ResetPassword] Error:", err);
      if (err?.message?.includes("expired")) {
        setError("This reset link has expired. Please request a new one.");
      } else if (err?.message?.includes("match")) {
        setError("Passwords do not match");
      } else {
        setError(err?.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-gray-500 mt-4">Validating reset link...</Text>
      </SafeAreaView>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="close-circle" size={40} color="#ef4444" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            Invalid Link
          </Text>
          <Text className="text-gray-500 text-center mb-8">{tokenError}</Text>
          <TouchableOpacity
            className="bg-primary-500 py-4 px-8 rounded-xl mb-4"
            onPress={() => router.push("/(auth)/forgot-password")}
          >
            <Text className="text-white font-bold text-lg">
              Request New Link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-primary-600 font-medium">Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  if (isReset) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            Password Reset!
          </Text>
          <Text className="text-gray-500 text-center mb-8">
            Your password has been reset successfully. You can now sign in with
            your new password.
          </Text>
          <TouchableOpacity
            className="bg-primary-500 py-4 px-8 rounded-xl"
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text className="text-white font-bold text-lg">Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Reset form
  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-4">
            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            <View className="pt-8">
              <Text className="text-3xl font-bold text-gray-800 mb-2">
                Reset Password
              </Text>
              <Text className="text-gray-500 mb-2">
                Create a new password for your account.
              </Text>
              {userEmail && (
                <Text className="text-primary-600 font-medium mb-8">
                  {userEmail}
                </Text>
              )}

              {/* Error Message */}
              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <Text className="text-red-600">{error}</Text>
                </View>
              ) : null}

              {/* New Password Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  New Password
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                  />
                  <TextInput
                    className="flex-1 py-4 px-3 text-base text-gray-800"
                    placeholder="Enter new password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-400 text-sm mt-1">
                  Must be at least 8 characters
                </Text>
              </View>

              {/* Confirm Password Input */}
              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  Confirm Password
                </Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                  />
                  <TextInput
                    className="flex-1 py-4 px-3 text-base text-gray-800"
                    placeholder="Confirm new password"
                    placeholderTextColor="#9ca3af"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
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
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

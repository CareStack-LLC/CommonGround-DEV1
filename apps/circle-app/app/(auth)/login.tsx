import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    const success = await login(email.trim(), password);

    if (!success) {
      setError("Invalid email or password");
    }
  };

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
          {/* Header with gradient */}
          <LinearGradient
            colors={["#0ea5e9", "#38bdf8"]}
            className="px-6 pt-8 pb-12 rounded-b-3xl"
          >
            <View className="items-center">
              <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-4 shadow-lg">
                <Text className="text-4xl">👨‍👩‍👧‍👦</Text>
              </View>
              <Text className="text-3xl font-bold text-white">My Circle</Text>
              <Text className="text-sky-100 text-lg mt-1">
                Stay connected with family
              </Text>
            </View>
          </LinearGradient>

          {/* Login Form */}
          <View className="flex-1 px-6 pt-8">
            <Text className="text-2xl font-bold text-gray-800 mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-500 mb-6">
              Sign in to connect with your loved ones
            </Text>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-600">{error}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View className="mb-4">
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

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-800"
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity className="self-end mb-6">
                <Text className="text-primary-600 font-medium">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Link>

            {/* Login Button */}
            <TouchableOpacity
              className="bg-primary-500 py-4 rounded-xl items-center shadow-md"
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Invitation Code Link */}
            <Link href="/(auth)/invitation" asChild>
              <TouchableOpacity className="mt-4 py-4 rounded-xl items-center border-2 border-warmth-500">
                <Text className="text-warmth-600 font-bold text-lg">
                  I have an invitation code
                </Text>
              </TouchableOpacity>
            </Link>

            {/* Register Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-gray-500">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-bold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

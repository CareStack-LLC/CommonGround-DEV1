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
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/providers/AuthProvider";

const RELATIONSHIPS = [
  { id: "grandparent", label: "Grandparent", emoji: "👴" },
  { id: "aunt_uncle", label: "Aunt/Uncle", emoji: "👩" },
  { id: "family_friend", label: "Family Friend", emoji: "🤝" },
  { id: "other", label: "Other", emoji: "👤" },
];

export default function RegisterScreen() {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [relationship, setRelationship] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!relationship) {
      setError("Please select your relationship");
      return;
    }

    const success = await register(name.trim(), email.trim(), password);

    if (!success) {
      setError("Registration failed. Please try again.");
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-6 pt-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View className="px-6 pt-4">
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Join My Circle
            </Text>
            <Text className="text-gray-500 mb-6">
              Create an account to connect with your family
            </Text>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-600">{error}</Text>
              </View>
            ) : null}

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Your Name</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="person-outline" size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-800"
                  placeholder="Enter your name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

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

            {/* Relationship Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
                Your Relationship
              </Text>
              <View className="flex-row flex-wrap">
                {RELATIONSHIPS.map((rel) => (
                  <TouchableOpacity
                    key={rel.id}
                    className={`mr-2 mb-2 px-4 py-3 rounded-xl border-2 ${
                      relationship === rel.id
                        ? "bg-primary-50 border-primary-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                    onPress={() => setRelationship(rel.id)}
                  >
                    <Text
                      className={`font-medium ${
                        relationship === rel.id
                          ? "text-primary-700"
                          : "text-gray-600"
                      }`}
                    >
                      {rel.emoji} {rel.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-800"
                  placeholder="Create a password"
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

            {/* Confirm Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">
                Confirm Password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-4 px-3 text-base text-gray-800"
                  placeholder="Confirm your password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              className="bg-primary-500 py-4 rounded-xl items-center shadow-md"
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-bold">Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

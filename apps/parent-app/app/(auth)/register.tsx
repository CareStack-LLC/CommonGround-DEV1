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

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleRegister = async () => {
    setLocalError("");

    if (!firstName || !lastName || !email || !password) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    const success = await register(email, password, firstName, lastName);
    if (success) {
      router.replace("/(tabs)");
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-8 pb-8">
            {/* Back Button */}
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity className="flex-row items-center mb-6">
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="#2563eb"
                />
                <Text className="text-primary-600 ml-1">Back to login</Text>
              </TouchableOpacity>
            </Link>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-secondary-900 dark:text-white">
                Create Account
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400 mt-2">
                Join CommonGround to make co-parenting easier
              </Text>
            </View>

            {/* Registration Form */}
            <View className="space-y-4">
              {/* Name Fields */}
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    First Name
                  </Text>
                  <TextInput
                    className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700"
                    placeholder="First name"
                    placeholderTextColor="#94a3b8"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Last Name
                  </Text>
                  <TextInput
                    className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700"
                    placeholder="Last name"
                    placeholderTextColor="#94a3b8"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              <View>
                <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700 pr-12"
                    placeholder="Create a password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-xs text-secondary-500 mt-1">
                  At least 8 characters
                </Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Confirm Password
                </Text>
                <TextInput
                  className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700"
                  placeholder="Confirm your password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>

              {/* Error Message */}
              {displayError && (
                <View className="bg-danger-50 dark:bg-danger-500/10 p-3 rounded-lg">
                  <Text className="text-danger-600 dark:text-danger-500 text-sm">
                    {displayError}
                  </Text>
                </View>
              )}

              {/* Register Button */}
              <TouchableOpacity
                className={`btn-primary mt-4 ${isLoading ? "opacity-70" : ""}`}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold text-lg">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text className="text-center text-xs text-secondary-500 dark:text-secondary-400 mt-6">
              By creating an account, you agree to our{" "}
              <Text className="text-primary-600">Terms of Service</Text> and{" "}
              <Text className="text-primary-600">Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

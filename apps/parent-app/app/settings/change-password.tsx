/**
 * Change Password Screen
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

import { parent } from "@commonground/api-client";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return { minLength, hasUppercase, hasLowercase, hasNumber };
  };

  const passwordChecks = validatePassword(newPassword);
  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasUppercase &&
    passwordChecks.hasLowercase &&
    passwordChecks.hasNumber;

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (!isPasswordValid) {
      Alert.alert("Error", "New password does not meet requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    setIsSaving(true);
    try {
      await parent.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert("Success", "Your password has been updated", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Change Password" }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 py-6">
          {/* Current Password */}
          <View className="bg-white dark:bg-secondary-800 rounded-xl mb-6">
            <View className="px-4 py-3">
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
                Current Password
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 text-secondary-900 dark:text-white text-base"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                  <Ionicons
                    name={showCurrent ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* New Password */}
          <View className="bg-white dark:bg-secondary-800 rounded-xl mb-4">
            <View className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700">
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
                New Password
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 text-secondary-900 dark:text-white text-base"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View className="px-4 py-3">
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm mb-1">
                Confirm New Password
              </Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 text-secondary-900 dark:text-white text-base"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Password Requirements */}
          <View className="mb-6">
            <Text className="text-secondary-700 dark:text-secondary-300 font-medium mb-3">
              Password Requirements
            </Text>
            <PasswordCheck
              label="At least 8 characters"
              isValid={passwordChecks.minLength}
            />
            <PasswordCheck
              label="One uppercase letter"
              isValid={passwordChecks.hasUppercase}
            />
            <PasswordCheck
              label="One lowercase letter"
              isValid={passwordChecks.hasLowercase}
            />
            <PasswordCheck
              label="One number"
              isValid={passwordChecks.hasNumber}
            />
            {confirmPassword.length > 0 && (
              <PasswordCheck
                label="Passwords match"
                isValid={newPassword === confirmPassword}
              />
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`py-4 rounded-xl flex-row items-center justify-center ${
              isPasswordValid && newPassword === confirmPassword && currentPassword
                ? "bg-primary-600"
                : "bg-secondary-300 dark:bg-secondary-700"
            }`}
            onPress={handleSubmit}
            disabled={
              isSaving ||
              !isPasswordValid ||
              newPassword !== confirmPassword ||
              !currentPassword
            }
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#ffffff" />
                <Text className="text-white font-semibold text-lg ml-2">
                  Update Password
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordCheck({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons
        name={isValid ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={isValid ? "#16a34a" : "#94a3b8"}
      />
      <Text
        className={`ml-2 ${
          isValid
            ? "text-green-600 dark:text-green-400"
            : "text-secondary-500 dark:text-secondary-400"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

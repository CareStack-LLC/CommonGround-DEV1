/**
 * Invitation Screen for My Circle App
 *
 * Handles invitation code entry, verification, and account setup.
 * Circle is invitation-only - users must have a valid invitation code from a parent.
 */

import { useState, useRef } from "react";
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
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { circle } from "@/lib/api";
import { useAuth } from "@/src/providers/AuthProvider";

const CODE_LENGTH = 6;

interface InviteDetails {
  email: string;
  contactName: string;
  relationshipType: string;
  inviteExpiresAt: string;
}

export default function InvitationScreen() {
  const { acceptInvite, isLoading: authLoading } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [inviteToken, setInviteToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);

  // Password setup state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];

    // Handle paste of full code
    if (text.length > 1) {
      const pastedCode = text.slice(0, CODE_LENGTH).split("");
      pastedCode.forEach((char, i) => {
        if (i < CODE_LENGTH) {
          newCode[i] = char.toUpperCase();
        }
      });
      setCode(newCode);
      inputRefs.current[CODE_LENGTH - 1]?.focus();

      if (pastedCode.length === CODE_LENGTH) {
        verifyCode(newCode.join(""));
      }
      return;
    }

    newCode[index] = text.toUpperCase();
    setCode(newCode);

    // Move to next input
    if (text && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when complete
    if (index === CODE_LENGTH - 1 && text) {
      const fullCode = newCode.join("");
      if (fullCode.length === CODE_LENGTH) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setError("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const info = await circle.auth.getInviteInfo(fullCode);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteToken(fullCode);
      setInviteDetails({
        email: info.email,
        contactName: info.contact_name,
        relationshipType: info.relationship_type,
        inviteExpiresAt: info.invite_expires_at,
      });
    } catch (err: any) {
      console.error("[Invitation] Verify error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (err?.message?.includes("expired")) {
        setError("This invitation has expired. Please ask for a new invitation.");
      } else if (err?.message?.includes("not found") || err?.message?.includes("invalid")) {
        setError("Invalid invitation code. Please check and try again.");
      } else if (err?.message?.includes("already")) {
        setError("This invitation has already been used. Please sign in instead.");
      } else {
        setError(err?.message || "Failed to verify invitation. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    setError("");

    // Validate password
    if (!password) {
      setError("Please enter a password");
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

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const success = await acceptInvite(inviteToken, password);

      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to main app - auth state is already updated
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError("Failed to create account. Please try again.");
      }
    } catch (err: any) {
      console.error("[Invitation] Accept error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (err?.message?.includes("expired")) {
        setError("This invitation has expired. Please ask for a new invitation.");
      } else if (err?.message?.includes("match")) {
        setError("Passwords do not match");
      } else {
        setError(err?.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelationship = (type: string): string => {
    const mapping: Record<string, string> = {
      grandparent: "Grandparent",
      aunt_uncle: "Aunt/Uncle",
      family_friend: "Family Friend",
      other: "Family Circle Member",
    };
    return mapping[type] || type;
  };

  const getRelationshipEmoji = (type: string): string => {
    const mapping: Record<string, string> = {
      grandparent: "👵",
      aunt_uncle: "👨‍👩‍👧",
      family_friend: "🤝",
      other: "💕",
    };
    return mapping[type] || "👋";
  };

  // Invitation verified - show account setup form
  if (inviteDetails) {
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
                onPress={() => {
                  setInviteDetails(null);
                  setInviteToken("");
                  setCode(Array(CODE_LENGTH).fill(""));
                  setPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
                className="w-10 h-10 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>

              <View className="pt-4">
                {/* Success Header */}
                <View className="items-center mb-6">
                  <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                    <Text className="text-4xl">🎉</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                    You're Invited!
                  </Text>
                </View>

                {/* Invitation Details Card */}
                <View className="bg-primary-50 rounded-2xl p-5 mb-6">
                  <View className="flex-row items-center mb-3">
                    <View className="w-12 h-12 bg-primary-200 rounded-full items-center justify-center">
                      <Text className="text-2xl">
                        {getRelationshipEmoji(inviteDetails.relationshipType)}
                      </Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="font-bold text-gray-800 text-lg">
                        {inviteDetails.contactName}
                      </Text>
                      <Text className="text-gray-500">
                        {formatRelationship(inviteDetails.relationshipType)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 text-sm">
                    As a member of their circle, you'll be able to video call, send
                    messages, and share photos safely.
                  </Text>
                </View>

                {/* Account Setup Form */}
                <Text className="text-lg font-bold text-gray-800 mb-4">
                  Create Your Account
                </Text>

                {/* Email (readonly) */}
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">Email</Text>
                  <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-xl px-4 py-4">
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                    <Text className="flex-1 px-3 text-base text-gray-600">
                      {inviteDetails.email}
                    </Text>
                    <Ionicons name="lock-closed" size={16} color="#9ca3af" />
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <Text className="text-red-600">{error}</Text>
                  </View>
                ) : null}

                {/* Password Input */}
                <View className="mb-4">
                  <Text className="text-gray-700 font-medium mb-2">Password</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#9ca3af"
                    />
                    <TextInput
                      className="flex-1 py-4 px-3 text-base text-gray-800"
                      placeholder="Create a password"
                      placeholderTextColor="#9ca3af"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!isSubmitting}
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
                      placeholder="Confirm your password"
                      placeholderTextColor="#9ca3af"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      editable={!isSubmitting}
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

                {/* Submit Button */}
                <TouchableOpacity
                  className={`py-4 rounded-xl items-center shadow-md mb-4 ${
                    isSubmitting ? "bg-primary-400" : "bg-primary-500"
                  }`}
                  onPress={handleAcceptInvite}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      Create Account & Join
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  className="py-4 items-center"
                  onPress={() => router.back()}
                  disabled={isSubmitting}
                >
                  <Text className="text-gray-500">Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Code entry screen
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

          <View className="flex-1 pt-8">
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-warmth-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="ticket-outline" size={40} color="#f97316" />
              </View>
              <Text className="text-3xl font-bold text-gray-800 mb-2">
                Enter Invitation Code
              </Text>
              <Text className="text-gray-500 text-center">
                Enter the code from your invitation email
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-600 text-center">{error}</Text>
              </View>
            ) : null}

            {/* Code Input */}
            <View className="flex-row justify-center mb-8">
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  className={`w-12 h-14 mx-1 text-center text-2xl font-bold rounded-xl border-2 ${
                    digit
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="default"
                  maxLength={index === 0 ? CODE_LENGTH : 1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              ))}
            </View>

            {/* Loading Indicator */}
            {isLoading && (
              <View className="items-center">
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text className="text-gray-500 mt-2">Verifying code...</Text>
              </View>
            )}

            {/* Already have account link */}
            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-500">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text className="text-primary-600 font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View className="bg-gray-50 rounded-2xl p-4 mt-auto mb-8">
              <Text className="text-gray-600 text-center text-sm">
                Don't have a code? Ask a parent to invite you to their family's
                circle through the CommonGround Parent app.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

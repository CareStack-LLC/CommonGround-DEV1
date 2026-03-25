/**
 * Setup Link Screen
 *
 * Alternative to setup code entry. Child opens a link shared by parent,
 * parent authenticates on the device as a security gate, then child
 * can access KidSpace.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useChildAuth } from "@/providers/ChildAuthProvider";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

type LinkStatus = "checking" | "valid" | "needs_parent_auth" | "parent_auth" | "verified" | "error";

export default function SetupLinkScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const { setupDevice } = useChildAuth();

  const [token, setToken] = useState(params.token || "");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(params.token ? "checking" : "error");
  const [childName, setChildName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Parent auth fields
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");

  // Check link when token is available
  useEffect(() => {
    if (params.token) {
      checkLink(params.token);
    }
  }, [params.token]);

  const checkLink = async (linkToken: string) => {
    setIsLoading(true);
    setLinkStatus("checking");
    try {
      const res = await fetch(`${API_BASE}/api/v1/my-circle/device-setup/link/${linkToken}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.detail || "Invalid setup link");
        setLinkStatus("error");
        return;
      }

      setChildName(data.child_name);
      if (data.parent_verified) {
        setLinkStatus("verified");
      } else {
        setLinkStatus("needs_parent_auth");
      }
    } catch {
      setErrorMessage("Could not verify setup link. Check your internet connection.");
      setLinkStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = () => {
    if (token.length > 10) {
      // Extract token from URL if user pasted a full URL
      const urlMatch = token.match(/setup\/([A-Za-z0-9_-]+)/);
      const extractedToken = urlMatch ? urlMatch[1] : token;
      setToken(extractedToken);
      checkLink(extractedToken);
    }
  };

  const handleParentAuth = async () => {
    if (!parentEmail || !parentPassword) {
      Alert.alert("Missing Info", "Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      // First, authenticate parent to get JWT
      const authRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parentEmail, password: parentPassword }),
      });
      const authData = await authRes.json();

      if (!authRes.ok) {
        Alert.alert("Authentication Failed", authData.detail || "Invalid email or password.");
        return;
      }

      const parentToken = authData.access_token;

      // Now verify parent on the setup link
      const verifyRes = await fetch(
        `${API_BASE}/api/v1/my-circle/device-setup/link/${token}/verify-parent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${parentToken}`,
          },
        }
      );
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        Alert.alert("Verification Failed", verifyData.detail || "Could not verify parent.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLinkStatus("verified");
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/my-circle/device-setup/link/${token}/activate`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.detail || "Could not activate device.");
        return;
      }

      // Set up device with returned data
      await setupDevice({
        family_file_id: data.family_file_id,
        username: data.username,
        child_name: data.child_name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/login");
    } catch {
      Alert.alert("Error", "Something went wrong during activation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Token entry screen (when no token provided via deep link)
  if (!params.token && linkStatus === "error" && !errorMessage) {
    return (
      <SafeAreaView className="flex-1 bg-purple-600">
        <View className="flex-row items-center px-4 pt-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 items-center justify-center px-8"
        >
          <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6">
            <Ionicons name="link" size={48} color="#9333ea" />
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-4">
            Setup Link
          </Text>
          <Text className="text-lg text-purple-200 text-center mb-8">
            Paste the setup link your parent sent you
          </Text>
          <TextInput
            className="bg-white/20 text-white text-lg w-full p-4 rounded-2xl mb-4 border border-white/30"
            placeholder="Paste link or token here..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            className="bg-white py-4 px-8 rounded-full w-full items-center"
            onPress={handleManualTokenSubmit}
          >
            <Text className="text-purple-600 font-bold text-lg">Verify Link</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-purple-600">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 items-center justify-center px-8"
      >
        {/* Loading */}
        {isLoading && linkStatus === "checking" && (
          <View className="items-center">
            <ActivityIndicator size="large" color="white" />
            <Text className="text-white text-lg mt-4">Checking setup link...</Text>
          </View>
        )}

        {/* Error */}
        {linkStatus === "error" && errorMessage && (
          <View className="items-center">
            <View className="w-24 h-24 bg-red-500/30 rounded-full items-center justify-center mb-6">
              <Ionicons name="close-circle" size={48} color="white" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-4">
              Link Invalid
            </Text>
            <Text className="text-lg text-purple-200 text-center mb-8">
              {errorMessage}
            </Text>
            <TouchableOpacity
              className="bg-white py-4 px-8 rounded-full"
              onPress={() => router.back()}
            >
              <Text className="text-purple-600 font-bold text-lg">Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Needs Parent Auth */}
        {linkStatus === "needs_parent_auth" && (
          <View className="items-center w-full">
            <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6">
              <Ionicons name="shield-checkmark" size={48} color="#9333ea" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-2">
              Hi {childName}!
            </Text>
            <Text className="text-lg text-purple-200 text-center mb-8">
              A parent needs to verify their identity before you can use KidSpace on this device.
            </Text>

            <TouchableOpacity
              className="bg-white py-4 px-8 rounded-full w-full items-center"
              onPress={() => setLinkStatus("parent_auth")}
            >
              <Text className="text-purple-600 font-bold text-lg">
                Parent: Tap to Verify
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parent Auth Form */}
        {linkStatus === "parent_auth" && (
          <View className="items-center w-full">
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-6">
              <Ionicons name="lock-closed" size={36} color="white" />
            </View>
            <Text className="text-2xl font-bold text-white text-center mb-2">
              Parent Verification
            </Text>
            <Text className="text-purple-200 text-center mb-6">
              Sign in with your CommonGround account to authorize this device for {childName}.
            </Text>

            <TextInput
              className="bg-white/20 text-white text-lg w-full p-4 rounded-2xl mb-3 border border-white/30"
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={parentEmail}
              onChangeText={setParentEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              className="bg-white/20 text-white text-lg w-full p-4 rounded-2xl mb-6 border border-white/30"
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={parentPassword}
              onChangeText={setParentPassword}
              secureTextEntry
            />

            <TouchableOpacity
              className="bg-white py-4 px-8 rounded-full w-full items-center mb-4"
              onPress={handleParentAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#9333ea" />
              ) : (
                <Text className="text-purple-600 font-bold text-lg">Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setLinkStatus("needs_parent_auth")}>
              <Text className="text-purple-200">Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Verified - Ready to Activate */}
        {linkStatus === "verified" && (
          <View className="items-center">
            <View className="w-24 h-24 bg-green-500/30 rounded-full items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            </View>
            <Text className="text-3xl font-bold text-white text-center mb-2">
              All Set, {childName}!
            </Text>
            <Text className="text-lg text-purple-200 text-center mb-8">
              Your parent has verified this device. Tap below to finish setup and start using KidSpace!
            </Text>
            <TouchableOpacity
              className="bg-white py-4 px-8 rounded-full"
              onPress={handleActivate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#9333ea" />
              ) : (
                <Text className="text-purple-600 font-bold text-lg">Start KidSpace</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

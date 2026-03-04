/**
 * Device Setup Screen
 *
 * Allows parents to configure a child's device by entering a setup code
 * or scanning a QR code. The setup code contains the family_file_id and username.
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
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useChildAuth } from "@/providers/ChildAuthProvider";

const CODE_LENGTH = 8;

export default function SetupScreen() {
  const { setupDevice } = useChildAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
      // Call API to validate setup code and get device setup info
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/my-circle/device-setup/${fullCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid setup code");
      }

      const data = await response.json();

      // Save device setup
      await setupDevice({
        family_file_id: data.family_file_id,
        username: data.username,
        child_name: data.child_name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Setup Complete!",
        `This device is now set up for ${data.child_name || "your child"}. They can log in with their PIN.`,
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (err: any) {
      console.error("[Setup] Error:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (err?.message?.includes("expired")) {
        setError("This setup code has expired. Please get a new code from the parent app.");
      } else if (err?.message?.includes("not found") || err?.message?.includes("invalid")) {
        setError("Invalid setup code. Please check and try again.");
      } else if (err?.message?.includes("already")) {
        setError("This setup code has already been used.");
      } else {
        setError(err?.message || "Failed to set up device. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-purple-600">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          {/* Header */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-12 h-12 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>

          <View className="flex-1 pt-8">
            {/* Icon and Title */}
            <View className="items-center mb-8">
              <View className="w-24 h-24 bg-white rounded-full items-center justify-center mb-6 shadow-xl">
                <Text className="text-5xl">🔑</Text>
              </View>
              <Text className="text-3xl font-bold text-white text-center mb-2">
                Enter Setup Code
              </Text>
              <Text className="text-lg text-purple-200 text-center">
                Type the code from the parent app
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-pink-500/30 rounded-2xl p-4 mb-4">
                <Text className="text-white text-center">{error}</Text>
              </View>
            ) : null}

            {/* Code Input */}
            <View className="flex-row justify-center flex-wrap mb-8">
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  className={`w-11 h-14 mx-1 mb-2 text-center text-2xl font-bold rounded-xl border-2 ${
                    digit
                      ? "border-white bg-white text-purple-600"
                      : "border-purple-400 bg-purple-500/50 text-white"
                  }`}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="default"
                  maxLength={index === 0 ? CODE_LENGTH : 1}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isLoading}
                  placeholderTextColor="#a78bfa"
                />
              ))}
            </View>

            {/* Loading Indicator */}
            {isLoading && (
              <View className="items-center mb-6">
                <ActivityIndicator size="large" color="white" />
                <Text className="text-purple-200 mt-3">Setting up device...</Text>
              </View>
            )}

            {/* Info Box */}
            <View className="bg-white/20 rounded-2xl p-5 mt-auto mb-8">
              <View className="flex-row items-start mb-3">
                <Ionicons name="information-circle" size={24} color="white" />
                <Text className="flex-1 text-white ml-3">
                  Get the setup code from the parent's CommonGround app under
                  Circle Settings.
                </Text>
              </View>
              <Text className="text-purple-200 text-sm">
                The code is 8 characters and expires after 24 hours.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

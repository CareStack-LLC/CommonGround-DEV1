import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const CODE_LENGTH = 6;

export default function InvitationScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteDetails, setInviteDetails] = useState<{
    familyName: string;
    childName: string;
    invitedBy: string;
  } | null>(null);

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

    // Simulate API verification
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Demo: Accept any 6-character code
    if (fullCode.length === CODE_LENGTH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteDetails({
        familyName: "Johnson Family",
        childName: "Emma",
        invitedBy: "Sarah Johnson",
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("Invalid invitation code. Please check and try again.");
    }

    setIsLoading(false);
  };

  const handleAcceptInvite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In real app, this would link the circle member to the family
    router.replace("/(auth)/register");
  };

  if (inviteDetails) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity
            onPress={() => {
              setInviteDetails(null);
              setCode(Array(CODE_LENGTH).fill(""));
            }}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <View className="flex-1 items-center justify-center px-4">
            <View className="w-24 h-24 bg-primary-100 rounded-full items-center justify-center mb-6">
              <Text className="text-5xl">🎉</Text>
            </View>

            <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
              You're Invited!
            </Text>

            <Text className="text-gray-500 text-center mb-8">
              {inviteDetails.invitedBy} has invited you to connect with{" "}
              <Text className="font-bold">{inviteDetails.childName}</Text> from
              the {inviteDetails.familyName}
            </Text>

            <View className="bg-primary-50 rounded-2xl p-6 w-full mb-8">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 bg-primary-200 rounded-full items-center justify-center">
                  <Text className="text-2xl">👧</Text>
                </View>
                <View className="ml-4">
                  <Text className="font-bold text-gray-800 text-lg">
                    {inviteDetails.childName}
                  </Text>
                  <Text className="text-gray-500">
                    {inviteDetails.familyName}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-600 text-sm">
                As a member of their circle, you'll be able to video call, send
                messages, and share photos with {inviteDetails.childName}.
              </Text>
            </View>

            <TouchableOpacity
              className="bg-primary-500 py-4 px-8 rounded-xl w-full items-center shadow-md mb-4"
              onPress={handleAcceptInvite}
            >
              <Text className="text-white font-bold text-lg">
                Accept & Create Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-4"
              onPress={() => router.back()}
            >
              <Text className="text-gray-500">Maybe Later</Text>
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

          <View className="flex-1 pt-8">
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-warmth-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="ticket-outline" size={40} color="#f97316" />
              </View>
              <Text className="text-3xl font-bold text-gray-800 mb-2">
                Enter Invitation Code
              </Text>
              <Text className="text-gray-500 text-center">
                Enter the 6-character code sent by a family member
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

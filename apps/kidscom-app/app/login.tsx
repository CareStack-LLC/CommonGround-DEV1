import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useChildAuth } from "@/providers/ChildAuthProvider";

const PIN_LENGTH = 4;

export default function PinLoginScreen() {
  const { loginWithPin, isLoading, error, isDeviceConfigured, deviceSetup, isTokenExpired, child } = useChildAuth();
  const [pin, setPin] = useState<string[]>([]);
  const [shake] = useState(new Animated.Value(0));

  // Use child name from stored data if available (for returning users)
  const displayName = child?.first_name || deviceSetup?.child_name || "there";
  const isReturningUser = !!child && isTokenExpired;

  // Shake animation on error
  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setPin([]);
    }
  }, [error]);

  const handlePress = async (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPin = [...pin, digit];
    setPin(newPin);

    // Auto-submit when PIN is complete
    if (newPin.length === PIN_LENGTH) {
      const success = await loginWithPin(newPin.join(""));
      if (success) {
        router.replace("/(main)");
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin(pin.slice(0, -1));
    }
  };

  // Show setup screen if device isn't configured
  if (!isDeviceConfigured) {
    return (
      <SafeAreaView className="flex-1 bg-purple-600">
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-28 h-28 bg-white rounded-full items-center justify-center mb-6 shadow-xl">
            <Text className="text-6xl">📱</Text>
          </View>
          <Text className="text-3xl font-bold text-white text-center mb-4">
            Setup Needed
          </Text>
          <Text className="text-lg text-purple-200 text-center mb-8">
            Ask a parent to set up this device for you using their CommonGround app.
          </Text>

          <View className="bg-white/20 rounded-2xl p-6 w-full">
            <Text className="text-white font-bold text-lg mb-4">How to set up:</Text>
            <View className="flex-row items-start mb-3">
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center mr-3">
                <Text className="text-purple-600 font-bold">1</Text>
              </View>
              <Text className="flex-1 text-white">
                Open the parent's CommonGround app
              </Text>
            </View>
            <View className="flex-row items-start mb-3">
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center mr-3">
                <Text className="text-purple-600 font-bold">2</Text>
              </View>
              <Text className="flex-1 text-white">
                Go to Circle settings and tap "Set up child's device"
              </Text>
            </View>
            <View className="flex-row items-start">
              <View className="w-8 h-8 bg-white rounded-full items-center justify-center mr-3">
                <Text className="text-purple-600 font-bold">3</Text>
              </View>
              <Text className="flex-1 text-white">
                Scan the QR code or enter the setup code
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="mt-8 bg-white py-4 px-8 rounded-full"
            onPress={() => router.push("/setup")}
          >
            <Text className="text-purple-600 font-bold text-lg">
              Enter Setup Code
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-purple-600">
      <View className="flex-1 px-8 pt-12">
        {/* Fun Header */}
        <View className="items-center mb-12">
          <View className="w-28 h-28 bg-white rounded-full items-center justify-center mb-6 shadow-xl">
            <Text className="text-6xl">{isReturningUser ? "🔄" : "👋"}</Text>
          </View>
          <Text className="text-4xl font-bold text-white text-center">
            {isReturningUser ? `Welcome back, ${displayName}!` : `Hi ${displayName}!`}
          </Text>
          <Text className="text-xl text-purple-200 mt-2 text-center">
            {isReturningUser ? "Enter your PIN to continue" : "Enter your secret code"}
          </Text>
        </View>

        {/* PIN Dots */}
        <Animated.View
          className="flex-row justify-center mb-12"
          style={{ transform: [{ translateX: shake }] }}
        >
          {Array(PIN_LENGTH)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                className={`w-6 h-6 rounded-full mx-3 ${
                  pin.length > i ? "bg-white" : "bg-purple-400"
                }`}
              />
            ))}
        </Animated.View>

        {/* Error Message */}
        {error && (
          <View className="items-center mb-6">
            <Text className="text-pink-300 text-lg">
              Oops! Try again
            </Text>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View className="items-center mb-6">
            <ActivityIndicator color="white" size="large" />
          </View>
        )}

        {/* Number Pad */}
        <View className="items-center">
          {[[1, 2, 3], [4, 5, 6], [7, 8, 9], ["", 0, "del"]].map(
            (row, rowIndex) => (
              <View key={rowIndex} className="flex-row mb-4">
                {row.map((digit, colIndex) => {
                  if (digit === "") {
                    return <View key={colIndex} className="w-20 h-20 mx-3" />;
                  }

                  if (digit === "del") {
                    return (
                      <TouchableOpacity
                        key={colIndex}
                        className="w-20 h-20 mx-3 rounded-full bg-purple-500 items-center justify-center"
                        onPress={handleDelete}
                        disabled={isLoading}
                      >
                        <Ionicons name="backspace" size={32} color="white" />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={colIndex}
                      className="w-20 h-20 mx-3 rounded-full bg-white items-center justify-center shadow-lg"
                      onPress={() => handlePress(String(digit))}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <Text className="text-4xl font-bold text-purple-600">
                        {digit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}
        </View>

        {/* Fun Footer */}
        <View className="items-center mt-8">
          <Text className="text-purple-300 text-center">
            Ask a parent if you forgot your code!
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

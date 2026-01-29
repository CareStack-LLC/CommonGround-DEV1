import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Vibration,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useChildAuth } from "@/providers/ChildAuthProvider";

const PIN_LENGTH = 4;

// Demo account - Jayden Brown's KidsCom login
const DEMO_FAMILY_FILE_ID = "d491d4f6-da26-4b27-a12f-b8c52e9fbdab";
const DEMO_USERNAME = "SuperJayden";

export default function PinLoginScreen() {
  const { loginWithPin, isLoading, error } = useChildAuth();
  const [pin, setPin] = useState<string[]>([]);
  const [shake] = useState(new Animated.Value(0));

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
      const success = await loginWithPin(DEMO_FAMILY_FILE_ID, DEMO_USERNAME, newPin.join(""));
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

  return (
    <SafeAreaView className="flex-1 bg-purple-600">
      <View className="flex-1 px-8 pt-12">
        {/* Fun Header */}
        <View className="items-center mb-12">
          <View className="w-28 h-28 bg-white rounded-full items-center justify-center mb-6 shadow-xl">
            <Text className="text-6xl">👋</Text>
          </View>
          <Text className="text-4xl font-bold text-white text-center">
            Hi there!
          </Text>
          <Text className="text-xl text-purple-200 mt-2 text-center">
            Enter your secret code
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
              Oops! Try again 🔄
            </Text>
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
            Ask a parent if you forgot your code! 🔑
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

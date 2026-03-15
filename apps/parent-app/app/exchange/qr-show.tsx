/**
 * QR Code Display Screen
 *
 * Shows a QR code for the other parent to scan during custody exchange.
 * Features:
 * - Auto-refresh QR token before expiry
 * - Visual countdown timer
 * - Exchange details display
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import QRCode from "react-native-qrcode-svg";

import { parent } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = SCREEN_WIDTH * 0.7;

export default function QRShowScreen() {
  const { colors } = useTheme();
  const { instanceId, exchangeId } = useLocalSearchParams<{
    instanceId: string;
    exchangeId: string;
  }>();
  const { user } = useAuth();

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch QR token
  const fetchQRToken = useCallback(async () => {
    if (!instanceId) {
      setError("No exchange instance specified");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await parent.custody.getQRToken(instanceId);
      setQrToken(result.token);
      setExpiresAt(new Date(result.expires_at));
    } catch (err) {
      console.error("Failed to get QR token:", err);
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchQRToken();
  }, [fetchQRToken]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);

      // Auto-refresh 30 seconds before expiry
      if (remaining <= 30 && remaining > 0) {
        fetchQRToken();
      }

      // Clear interval when expired
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, fetchQRToken]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.secondary }}>
          Generating QR code...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: "#FEE2E2" }}
        >
          <Ionicons name="alert-circle" size={40} color="#DC2626" />
        </View>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.secondary }}>
          Error
        </Text>
        <Text className="text-center" style={{ color: colors.secondary }}>
          {error}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }}>
      <View className="flex-1 items-center justify-center px-6">
        {/* Header */}
        <View className="items-center mb-8">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Ionicons name="qr-code" size={32} color={colors.primary} />
          </View>
          <Text className="text-xl font-bold mb-2" style={{ color: colors.secondary }}>
            Exchange Confirmation
          </Text>
          <Text className="text-center" style={{ color: colors.secondary }}>
            Have your co-parent scan this code to confirm the custody exchange
          </Text>
        </View>

        {/* QR Code Container */}
        <View
          className="rounded-3xl p-6 mb-6 shadow-lg"
          style={{ backgroundColor: colors.background }}
        >
          {qrToken ? (
            <QRCode
              value={JSON.stringify({
                type: "custody_exchange",
                instance_id: instanceId,
                token: qrToken,
              })}
              size={QR_SIZE}
              color={colors.secondary}
              backgroundColor={colors.background}
            />
          ) : (
            <View
              style={{ width: QR_SIZE, height: QR_SIZE }}
              className="items-center justify-center"
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>

        {/* Timer */}
        <View
          className="flex-row items-center px-4 py-2 rounded-full"
          style={{
            backgroundColor: timeRemaining <= 60 ? "#FEF3C7" : `${colors.primary}20`,
          }}
        >
          <Ionicons
            name="time"
            size={18}
            color={timeRemaining <= 60 ? colors.accent : colors.primary}
          />
          <Text
            className="ml-2 font-semibold"
            style={{ color: timeRemaining <= 60 ? colors.accent : colors.primary }}
          >
            {timeRemaining > 0
              ? `Expires in ${formatTime(timeRemaining)}`
              : "Refreshing..."}
          </Text>
        </View>

        {/* Instructions */}
        <View className="mt-8 rounded-xl p-4" style={{ backgroundColor: colors.backgroundSecondary }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                How it works
              </Text>
              <Text className="text-sm" style={{ color: colors.secondary }}>
                1. Both parents should be at the exchange location{"\n"}
                2. The receiving parent scans this QR code{"\n"}
                3. Exchange is confirmed and logged automatically
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

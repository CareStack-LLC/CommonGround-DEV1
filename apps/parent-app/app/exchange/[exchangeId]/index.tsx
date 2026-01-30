/**
 * Exchange Detail Screen
 *
 * View custody exchange details and manage check-in.
 * Features:
 * - Exchange information display (time, location, children)
 * - Silent Handoff GPS check-in
 * - QR code confirmation
 * - Exchange status tracking
 * - Navigation to exchange location
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import {
  parent,
  type CustodyExchange,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  amberLight: "#FEF7ED",
  amberBorder: "#E8C4A0",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
  white: "#FFFFFF",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#F59E0B",
};

export default function ExchangeDetailScreen() {
  const { exchangeId } = useLocalSearchParams<{ exchangeId: string }>();
  const { user } = useAuth();

  const [exchange, setExchange] = useState<CustodyExchange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchExchangeData = useCallback(async () => {
    if (!exchangeId) return;

    try {
      const data = await parent.custody.getExchange(exchangeId);
      setExchange(data);
    } catch (error) {
      console.error("Failed to fetch exchange:", error);
      // Demo data for testing
      setExchange({
        id: exchangeId,
        family_file_id: "demo",
        from_parent: "parent_a",
        to_parent: "parent_b",
        scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        location_name: "Starbucks on Main St",
        location_address: "123 Main Street, City, ST 12345",
        location_lat: 34.0522,
        location_lng: -118.2437,
        geofence_radius_meters: 100,
        child_ids: ["child-1", "child-2"],
        is_recurring: true,
        recurrence_pattern: "weekly",
        silent_handoff_enabled: true,
        qr_confirmation_required: true,
        check_in_window_before_minutes: 30,
        check_in_window_after_minutes: 30,
        status: "scheduled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        children_names: ["Emma", "Lucas"],
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [exchangeId]);

  useEffect(() => {
    fetchExchangeData();
  }, [fetchExchangeData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExchangeData();
  }, [fetchExchangeData]);

  const handleCheckIn = async () => {
    if (!exchangeId || !exchange) return;

    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for check-in");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result = await parent.custody.checkInAtExchange({
        exchange_instance_id: exchangeId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        device_accuracy_meters: location.coords.accuracy || undefined,
      });

      if (result.in_geofence) {
        Alert.alert(
          "Check-In Successful",
          `You're at the exchange location! Distance: ${Math.round(result.distance_meters)}m`
        );
        await fetchExchangeData();
      } else {
        Alert.alert(
          "Not at Location",
          `You're ${Math.round(result.distance_meters)}m away from the exchange point. Please move closer.`
        );
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      Alert.alert("Check-In Failed", "Unable to verify your location. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const openInMaps = () => {
    if (!exchange?.location_lat || !exchange?.location_lng) return;

    const scheme = Platform.select({
      ios: "maps:",
      android: "geo:",
    });
    const url = Platform.select({
      ios: `${scheme}?q=${exchange.location_name || "Exchange Location"}&ll=${exchange.location_lat},${exchange.location_lng}`,
      android: `${scheme}${exchange.location_lat},${exchange.location_lng}?q=${exchange.location_lat},${exchange.location_lng}(${encodeURIComponent(exchange.location_name || "Exchange Location")})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${exchange.location_lat},${exchange.location_lng}`
        );
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isWithinCheckInWindow = () => {
    if (!exchange?.scheduled_at) return false;
    const now = new Date();
    const scheduled = new Date(exchange.scheduled_at);
    const windowStart = new Date(
      scheduled.getTime() - (exchange.check_in_window_before_minutes || 30) * 60000
    );
    const windowEnd = new Date(
      scheduled.getTime() + (exchange.check_in_window_after_minutes || 30) * 60000
    );
    return now >= windowStart && now <= windowEnd;
  };

  const isUpcoming = () => {
    if (!exchange?.scheduled_at) return false;
    return new Date(exchange.scheduled_at) > new Date();
  };

  const getStatusBadge = () => {
    if (!exchange) return null;

    const status = exchange.status;
    let bgColor = colors.sand;
    let textColor = colors.slate;
    let label = "Scheduled";

    switch (status) {
      case "completed":
        bgColor = "#DCFCE7";
        textColor = "#166534";
        label = "Completed";
        break;
      case "in_progress":
        bgColor = "#FEF3C7";
        textColor = "#92400E";
        label = "In Progress";
        break;
      case "missed":
        bgColor = "#FEE2E2";
        textColor = "#991B1B";
        label = "Missed";
        break;
      case "cancelled":
        bgColor = "#F1F5F9";
        textColor = "#64748B";
        label = "Cancelled";
        break;
      default:
        if (isWithinCheckInWindow()) {
          bgColor = "#FEF3C7";
          textColor = "#92400E";
          label = "Check-in Open";
        }
    }

    return (
      <View
        style={{
          backgroundColor: bgColor,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top"]}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.sage} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exchange) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top"]}>
        <Header />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="swap-horizontal-outline" size={64} color="#94a3b8" />
          <Text style={{ color: "#64748B", marginTop: 16 }}>Exchange not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top"]}>
      <Header />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        {/* Header Banner */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            padding: 20,
            borderRadius: 20,
            backgroundColor: colors.amber,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="swap-horizontal" size={28} color="white" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                Custody Exchange
              </Text>
              <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginTop: 2 }}>
                {exchange.from_parent === "parent_a" ? "You" : "Co-parent"} to{" "}
                {exchange.to_parent === "parent_a" ? "You" : "Co-parent"}
              </Text>
            </View>
            {getStatusBadge()}
          </View>

          {/* Children */}
          {exchange.children_names && exchange.children_names.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.25)",
              }}
            >
              <Ionicons name="people" size={18} color="white" />
              <Text style={{ color: "rgba(255,255,255,0.9)", marginLeft: 8, fontSize: 15 }}>
                {exchange.children_names.join(", ")}
              </Text>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: colors.amberLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="calendar" size={24} color={colors.amber} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ color: "#64748B", fontSize: 13 }}>When</Text>
              <Text style={{ color: colors.slate, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
                {formatDateTime(exchange.scheduled_at)}
              </Text>
            </View>
          </View>

          {/* Check-in Window */}
          {exchange.silent_handoff_enabled && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.sand,
              }}
            >
              <Ionicons name="time" size={16} color="#64748B" />
              <Text style={{ color: "#64748B", fontSize: 13, marginLeft: 8 }}>
                Check-in window: {exchange.check_in_window_before_minutes || 30} min before to{" "}
                {exchange.check_in_window_after_minutes || 30} min after
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        {(exchange.location_name || exchange.location_address) && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.amberLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="location" size={24} color={colors.amber} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ color: "#64748B", fontSize: 13 }}>Where</Text>
                <Text style={{ color: colors.slate, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
                  {exchange.location_name}
                </Text>
                {exchange.location_address && (
                  <Text style={{ color: "#64748B", fontSize: 14, marginTop: 4 }}>
                    {exchange.location_address}
                  </Text>
                )}
              </View>
              {exchange.location_lat && exchange.location_lng && (
                <TouchableOpacity
                  onPress={openInMaps}
                  style={{
                    backgroundColor: colors.sand,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons name="navigate" size={20} color={colors.sage} />
                </TouchableOpacity>
              )}
            </View>

            {/* Geofence Info */}
            {exchange.silent_handoff_enabled && exchange.geofence_radius_meters && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.sand,
                }}
              >
                <Ionicons name="radio-button-on" size={16} color={colors.sage} />
                <Text style={{ color: "#64748B", fontSize: 13, marginLeft: 8 }}>
                  GPS verification radius: {exchange.geofence_radius_meters}m
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recurring Info */}
        {exchange.is_recurring && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: colors.white,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#E8F0EC",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="repeat" size={24} color={colors.sage} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ color: "#64748B", fontSize: 13 }}>Recurrence</Text>
                <Text style={{ color: colors.slate, fontSize: 16, fontWeight: "600", marginTop: 2 }}>
                  {exchange.recurrence_pattern === "weekly"
                    ? "Every week"
                    : exchange.recurrence_pattern === "biweekly"
                    ? "Every 2 weeks"
                    : exchange.recurrence_pattern === "monthly"
                    ? "Every month"
                    : exchange.recurrence_pattern || "Recurring"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Features */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={{ color: colors.slate, fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Exchange Features
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {exchange.silent_handoff_enabled && (
              <FeatureBadge icon="navigate" label="Silent Drop GPS" color={colors.sage} />
            )}
            {exchange.qr_confirmation_required && (
              <FeatureBadge icon="qr-code" label="QR Confirmation" color={colors.amber} />
            )}
            {exchange.is_recurring && (
              <FeatureBadge icon="repeat" label="Recurring" color="#8B5CF6" />
            )}
          </View>
        </View>

        {/* Actions */}
        {exchange.silent_handoff_enabled && isUpcoming() && (
          <View style={{ marginHorizontal: 16, marginTop: 24 }}>
            {isWithinCheckInWindow() ? (
              <>
                {/* GPS Check-in Button */}
                <TouchableOpacity
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                  style={{
                    backgroundColor: colors.sage,
                    paddingVertical: 16,
                    borderRadius: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checkingIn ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="navigate" size={20} color="white" />
                      <Text style={{ color: "white", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
                        Check In at Location
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* QR Buttons */}
                {exchange.qr_confirmation_required && (
                  <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => router.push(`/exchange/qr-show?instanceId=${exchangeId}`)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: colors.sage,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="qr-code" size={18} color={colors.sage} />
                      <Text style={{ color: colors.sage, fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
                        Show QR
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push(`/exchange/qr-scan?instanceId=${exchangeId}`)}
                      style={{
                        flex: 1,
                        paddingVertical: 14,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: colors.sage,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="scan" size={18} color={colors.sage} />
                      <Text style={{ color: colors.sage, fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
                        Scan QR
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View
                style={{
                  backgroundColor: colors.sand,
                  paddingVertical: 16,
                  borderRadius: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="time" size={20} color="#64748B" />
                <Text style={{ color: "#64748B", fontSize: 15, fontWeight: "500", marginLeft: 8 }}>
                  Check-in opens {exchange.check_in_window_before_minutes || 30} min before
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Get Directions Button */}
        {exchange.location_lat && exchange.location_lng && (
          <TouchableOpacity
            onPress={openInMaps}
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              backgroundColor: colors.white,
              paddingVertical: 16,
              borderRadius: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.sand,
            }}
          >
            <Ionicons name="navigate-outline" size={20} color={colors.slate} />
            <Text style={{ color: colors.slate, fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              Get Directions
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        backgroundColor: colors.white,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.sage} />
        <Text style={{ color: colors.sage, fontSize: 16, marginLeft: 4 }}>Back</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: "600", color: colors.slate }}>Exchange</Text>
      <View style={{ width: 60 }} />
    </View>
  );
}

function FeatureBadge({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: `${color}15`,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
      }}
    >
      <Ionicons name={icon as any} size={14} color={color} />
      <Text style={{ color, fontSize: 13, fontWeight: "500", marginLeft: 6 }}>{label}</Text>
    </View>
  );
}

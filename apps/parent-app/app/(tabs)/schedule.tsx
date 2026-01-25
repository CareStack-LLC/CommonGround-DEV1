/**
 * Time Bridge Schedule Screen
 * Parenting time tracking, custody exchanges, and Silent Drops
 */

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { parent } from "@commonground/api-client";
import type {
  CustodySummary,
  CustodyExchange,
} from "@commonground/api-client/src/api/parent/custody";
import { useAuth } from "@/providers/AuthProvider";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [custodySummary, setCustodySummary] = useState<CustodySummary | null>(null);
  const [exchanges, setExchanges] = useState<CustodyExchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const familyFileId = user?.family_file_id || "demo-family";

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, exchangesData] = await Promise.all([
        parent.custody.getCustodySummary(familyFileId),
        parent.custody.getExchanges(familyFileId, { upcoming_only: true, limit: 5 }),
      ]);
      setCustodySummary(summaryData);
      setExchanges(exchangesData.items);
    } catch (error) {
      console.error("Failed to fetch custody data:", error);
      // Demo data
      setCustodySummary({
        family_file_id: familyFileId,
        current_custody_parent: "parent_a",
        current_custody_since: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        next_exchange: {
          id: "ex-1",
          scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          from_parent: "parent_a",
          to_parent: "parent_b",
          location_name: "Starbucks on Main St",
        },
        children: [
          { id: "child-1", name: "Emma", with_parent: "parent_a" },
          { id: "child-2", name: "Lucas", with_parent: "parent_a" },
        ],
        this_week_days: { parent_a: 4, parent_b: 3 },
        this_month_days: { parent_a: 15, parent_b: 15 },
      });
      setExchanges([
        {
          id: "ex-1",
          family_file_id: familyFileId,
          from_parent: "parent_a",
          to_parent: "parent_b",
          scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          location_name: "Starbucks on Main St",
          location_address: "123 Main St, City, ST 12345",
          location_lat: 34.0522,
          location_lng: -118.2437,
          geofence_radius_meters: 100,
          child_ids: ["child-1", "child-2"],
          is_recurring: true,
          recurrence_pattern: "weekly",
          silent_handoff_enabled: true,
          qr_confirmation_required: true,
          check_in_window_before_minutes: 15,
          check_in_window_after_minutes: 15,
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          children_names: ["Emma", "Lucas"],
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasExchange = (day: number | null) => {
    if (!day) return false;
    const date = new Date(currentMonth);
    date.setDate(day);
    return exchanges.some((ex) => {
      const exDate = new Date(ex.scheduled_at);
      return exDate.toDateString() === date.toDateString();
    });
  };

  const handleSilentDropCheckIn = async (exchange: CustodyExchange) => {
    setCheckingIn(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required for check-in");
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Check in
      const result = await parent.custody.checkInAtExchange({
        exchange_instance_id: exchange.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        device_accuracy_meters: location.coords.accuracy || undefined,
      });

      if (result.in_geofence) {
        Alert.alert(
          "Check-In Successful",
          `You're at the exchange location! Distance: ${Math.round(result.distance_meters)}m`
        );
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

  const days = getDaysInMonth(currentMonth);

  // Web design system colors - matching custody color coding
  const SAGE = "#4A6C58"; // Mom's custody / Your time
  const SLATE = "#475569"; // Dad's custody / Co-parent time
  const AMBER = "#D4A574"; // Attention/exchanges

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-sand-200 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color={SAGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-200 dark:bg-slate-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SAGE} />
        }
      >
        {/* Custody Status Banner - Sage Green (Your Time) or Slate (Their Time) */}
        {custodySummary && (
          <View
            className="mx-4 mt-4 rounded-3xl p-5 shadow-card"
            style={{
              backgroundColor: custodySummary.current_custody_parent === "parent_a" ? SAGE : SLATE,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white/70 text-sm">Current Custody</Text>
                <Text className="text-white text-2xl font-bold mt-1">
                  {custodySummary.current_custody_parent === "parent_a" ? "With You" : "With Co-Parent"}
                </Text>
                <View className="flex-row items-center mt-3">
                  {custodySummary.children.map((child, index) => (
                    <View key={child.id} className="flex-row items-center">
                      <View className="w-7 h-7 bg-white/25 rounded-full items-center justify-center">
                        <Text className="text-white text-xs font-medium">{child.name.charAt(0)}</Text>
                      </View>
                      {index < custodySummary.children.length - 1 && (
                        <Text className="text-white/40 mx-1">+</Text>
                      )}
                    </View>
                  ))}
                  <Text className="text-white/80 text-sm ml-2">
                    {custodySummary.children.map(c => c.name).join(", ")}
                  </Text>
                </View>
              </View>
              <View className="bg-white/20 rounded-2xl p-4">
                <Ionicons name="home" size={28} color="white" />
              </View>
            </View>

            {/* Time Stats - Custody Legend */}
            <View className="flex-row mt-4 pt-4 border-t border-white/20">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: SAGE }} />
                  <Text className="text-white/60 text-xs">Your Time</Text>
                </View>
                <Text className="text-white font-semibold text-lg">
                  {custodySummary.this_week_days.parent_a} days this week
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: SLATE }} />
                  <Text className="text-white/60 text-xs">Their Time</Text>
                </View>
                <Text className="text-white font-semibold text-lg">
                  {custodySummary.this_week_days.parent_b} days this week
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Next Exchange Card - Amber accent */}
        {custodySummary?.next_exchange && (
          <View
            className="mx-4 mt-4 rounded-2xl p-4 border"
            style={{ backgroundColor: "#FEF7ED", borderColor: "#E8C4A0" }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center"
                style={{ backgroundColor: "#FDE8D0" }}
              >
                <Ionicons name="swap-horizontal" size={24} color={AMBER} />
              </View>
              <View className="flex-1 ml-3">
                <Text style={{ color: "#7F5636" }} className="font-semibold">
                  Next Exchange
                </Text>
                <Text style={{ color: "#A47246" }} className="text-sm">
                  {new Date(custodySummary.next_exchange.scheduled_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                {custodySummary.next_exchange.location_name && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location" size={12} color={AMBER} />
                    <Text style={{ color: "#C08B5D" }} className="text-xs ml-1">
                      {custodySummary.next_exchange.location_name}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={AMBER} />
            </View>
          </View>
        )}

        {/* Calendar Header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-2">
          <TouchableOpacity onPress={() => navigateMonth(-1)} className="p-2">
            <Ionicons name="chevron-back" size={24} color={SAGE} />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-slate-800 dark:text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} className="p-2">
            <Ionicons name="chevron-forward" size={24} color={SAGE} />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View className="flex-row px-2 mb-2">
          {DAYS.map((day) => (
            <View key={day} className="flex-1 items-center py-2">
              <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid - Matching Web with Sage/Slate custody colors */}
        <View className="flex-row flex-wrap px-2 bg-cream dark:bg-slate-800 mx-4 rounded-2xl py-2">
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              className="w-[14.28%] aspect-square items-center justify-center p-1"
              onPress={() => {
                if (day) {
                  const newDate = new Date(currentMonth);
                  newDate.setDate(day);
                  setSelectedDate(newDate);
                }
              }}
              disabled={!day}
            >
              {day && (
                <View
                  className="w-10 h-10 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isSelected(day)
                      ? SAGE
                      : isToday(day)
                      ? "#E8F0EC"
                      : "transparent",
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: isSelected(day)
                        ? "white"
                        : isToday(day)
                        ? SAGE
                        : "#1e293b",
                    }}
                  >
                    {day}
                  </Text>
                  {hasExchange(day) && (
                    <View
                      className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: AMBER }}
                    />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custody Legend */}
        <View className="flex-row items-center justify-center mt-4 gap-6">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: SAGE }} />
            <Text className="text-slate-600 text-sm">Your Time</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: SLATE }} />
            <Text className="text-slate-600 text-sm">Their Time</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: AMBER }} />
            <Text className="text-slate-600 text-sm">Exchange</Text>
          </View>
        </View>

        {/* Upcoming Exchanges */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            Upcoming Exchanges
          </Text>

          {exchanges.length === 0 ? (
            <View className="bg-cream dark:bg-slate-800 rounded-2xl items-center py-8 shadow-card">
              <Ionicons name="swap-horizontal-outline" size={48} color="#94a3b8" />
              <Text className="text-slate-500 dark:text-slate-400 mt-3">
                No upcoming exchanges
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {exchanges.map((exchange) => (
                <ExchangeCard
                  key={exchange.id}
                  exchange={exchange}
                  onCheckIn={() => handleSilentDropCheckIn(exchange)}
                  checkingIn={checkingIn}
                  sageColor={SAGE}
                  amberColor={AMBER}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Event Button - Sage Green */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-elevated"
        style={{ backgroundColor: SAGE }}
        onPress={() => router.push("/exchange/create")}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ExchangeCard({
  exchange,
  onCheckIn,
  checkingIn,
  sageColor = "#4A6C58",
  amberColor = "#D4A574",
}: {
  exchange: CustodyExchange;
  onCheckIn: () => void;
  checkingIn: boolean;
  sageColor?: string;
  amberColor?: string;
}) {
  const isUpcoming = new Date(exchange.scheduled_at) > new Date();
  const isWithinWindow = (() => {
    const now = new Date();
    const scheduled = new Date(exchange.scheduled_at);
    const windowStart = new Date(scheduled.getTime() - exchange.check_in_window_before_minutes * 60000);
    const windowEnd = new Date(scheduled.getTime() + exchange.check_in_window_after_minutes * 60000);
    return now >= windowStart && now <= windowEnd;
  })();

  return (
    <View className="bg-cream dark:bg-slate-800 rounded-2xl p-4 shadow-card">
      <View className="flex-row items-start">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: "#FEF7ED" }}
        >
          <Ionicons name="swap-horizontal" size={24} color={amberColor} />
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-slate-800 dark:text-white font-semibold">
            Custody Exchange
          </Text>
          <Text className="text-slate-500 text-sm">
            {exchange.from_parent === "parent_a" ? "You" : "Co-parent"} to{" "}
            {exchange.to_parent === "parent_a" ? "You" : "Co-parent"}
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar" size={14} color="#64748b" />
            <Text className="text-slate-500 text-sm ml-1">
              {new Date(exchange.scheduled_at).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
          {exchange.location_name && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color={amberColor} />
              <Text className="text-slate-500 text-sm ml-1">
                {exchange.location_name}
              </Text>
            </View>
          )}

          {/* Children */}
          {exchange.children_names && exchange.children_names.length > 0 && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="people" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm ml-1">
                {exchange.children_names.join(", ")}
              </Text>
            </View>
          )}

          {/* Silent Drop Badge - Using Sage instead of Purple */}
          {exchange.silent_handoff_enabled && (
            <View className="flex-row items-center mt-2">
              <View
                className="px-2.5 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: "#E8F0EC" }}
              >
                <Ionicons name="navigate" size={12} color={sageColor} />
                <Text style={{ color: sageColor }} className="text-xs ml-1 font-medium">
                  Silent Drop GPS
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Check-in Button for Silent Drops - Sage Green */}
      {exchange.silent_handoff_enabled && isWithinWindow && (
        <TouchableOpacity
          className="mt-4 py-3.5 rounded-xl flex-row items-center justify-center"
          style={{ backgroundColor: sageColor }}
          onPress={onCheckIn}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="navigate" size={18} color="white" />
              <Text className="text-white font-semibold ml-2">Check In at Location</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {exchange.silent_handoff_enabled && !isWithinWindow && isUpcoming && (
        <View className="mt-4 bg-slate-100 dark:bg-slate-700 py-3 rounded-xl flex-row items-center justify-center">
          <Ionicons name="time" size={18} color="#64748b" />
          <Text className="text-slate-500 font-medium ml-2">
            Check-in opens {exchange.check_in_window_before_minutes} min before
          </Text>
        </View>
      )}
    </View>
  );
}

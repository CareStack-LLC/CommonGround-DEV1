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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Custody Status Banner */}
        {custodySummary && (
          <View className="mx-4 mt-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-green-100 text-sm">Current Custody</Text>
                <Text className="text-white text-xl font-bold mt-1">
                  {custodySummary.current_custody_parent === "parent_a" ? "With You" : "With Co-Parent"}
                </Text>
                <View className="flex-row items-center mt-2">
                  {custodySummary.children.map((child, index) => (
                    <View key={child.id} className="flex-row items-center">
                      <View className="w-6 h-6 bg-white/30 rounded-full items-center justify-center">
                        <Text className="text-white text-xs">{child.name.charAt(0)}</Text>
                      </View>
                      {index < custodySummary.children.length - 1 && (
                        <Text className="text-white/50 mx-1">+</Text>
                      )}
                    </View>
                  ))}
                  <Text className="text-green-100 text-sm ml-2">
                    {custodySummary.children.map(c => c.name).join(", ")}
                  </Text>
                </View>
              </View>
              <View className="bg-white/20 rounded-xl p-3">
                <Ionicons name="home" size={28} color="white" />
              </View>
            </View>

            {/* Time Stats */}
            <View className="flex-row mt-4 pt-3 border-t border-white/20">
              <View className="flex-1">
                <Text className="text-green-100 text-xs">This Week</Text>
                <Text className="text-white font-semibold">
                  {custodySummary.this_week_days.parent_a} / 7 days
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-green-100 text-xs">This Month</Text>
                <Text className="text-white font-semibold">
                  {custodySummary.this_month_days.parent_a} / 30 days
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Next Exchange Card */}
        {custodySummary?.next_exchange && (
          <View className="mx-4 mt-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 border border-orange-200 dark:border-orange-800">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full items-center justify-center">
                <Ionicons name="swap-horizontal" size={24} color="#f97316" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-orange-800 dark:text-orange-300 font-semibold">
                  Next Exchange
                </Text>
                <Text className="text-orange-600 dark:text-orange-400 text-sm">
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
                    <Ionicons name="location" size={12} color="#f97316" />
                    <Text className="text-orange-500 text-xs ml-1">
                      {custodySummary.next_exchange.location_name}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f97316" />
            </View>
          </View>
        )}

        {/* Calendar Header */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-2">
          <TouchableOpacity onPress={() => navigateMonth(-1)} className="p-2">
            <Ionicons name="chevron-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} className="p-2">
            <Ionicons name="chevron-forward" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View className="flex-row px-2 mb-2">
          {DAYS.map((day) => (
            <View key={day} className="flex-1 items-center py-2">
              <Text className="text-secondary-500 dark:text-secondary-400 text-xs font-medium">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap px-2">
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
                  className={`w-10 h-10 items-center justify-center rounded-full ${
                    isSelected(day)
                      ? "bg-primary-600"
                      : isToday(day)
                      ? "bg-primary-100 dark:bg-primary-900/30"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected(day)
                        ? "text-white"
                        : isToday(day)
                        ? "text-primary-600"
                        : "text-secondary-900 dark:text-white"
                    }`}
                  >
                    {day}
                  </Text>
                  {hasExchange(day) && (
                    <View className="absolute bottom-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Exchanges */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Upcoming Exchanges
          </Text>

          {exchanges.length === 0 ? (
            <View className="card items-center py-8">
              <Ionicons name="swap-horizontal-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
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
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Event Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        onPress={() => Alert.alert("Coming Soon", "Add exchange scheduling coming soon!")}
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
}: {
  exchange: CustodyExchange;
  onCheckIn: () => void;
  checkingIn: boolean;
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
    <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 shadow-sm">
      <View className="flex-row items-start">
        <View className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full items-center justify-center">
          <Ionicons name="swap-horizontal" size={24} color="#f97316" />
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-secondary-900 dark:text-white font-semibold">
            Custody Exchange
          </Text>
          <Text className="text-secondary-500 text-sm">
            {exchange.from_parent === "parent_a" ? "You" : "Co-parent"} to{" "}
            {exchange.to_parent === "parent_a" ? "You" : "Co-parent"}
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar" size={14} color="#64748b" />
            <Text className="text-secondary-500 text-sm ml-1">
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
              <Ionicons name="location" size={14} color="#64748b" />
              <Text className="text-secondary-500 text-sm ml-1">
                {exchange.location_name}
              </Text>
            </View>
          )}

          {/* Children */}
          {exchange.children_names && exchange.children_names.length > 0 && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="people" size={14} color="#64748b" />
              <Text className="text-secondary-500 text-sm ml-1">
                {exchange.children_names.join(", ")}
              </Text>
            </View>
          )}

          {/* Silent Drop Badge */}
          {exchange.silent_handoff_enabled && (
            <View className="flex-row items-center mt-2">
              <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="location" size={12} color="#9333ea" />
                <Text className="text-purple-600 dark:text-purple-400 text-xs ml-1 font-medium">
                  Silent Drop GPS Enabled
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Check-in Button for Silent Drops */}
      {exchange.silent_handoff_enabled && isWithinWindow && (
        <TouchableOpacity
          className="mt-4 bg-purple-600 py-3 rounded-xl flex-row items-center justify-center"
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
        <View className="mt-4 bg-secondary-100 dark:bg-secondary-700 py-3 rounded-xl flex-row items-center justify-center">
          <Ionicons name="time" size={18} color="#64748b" />
          <Text className="text-secondary-500 font-medium ml-2">
            Check-in opens {exchange.check_in_window_before_minutes} min before
          </Text>
        </View>
      )}
    </View>
  );
}

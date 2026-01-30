/**
 * Time Bridge Schedule Screen
 * Parenting time tracking, custody exchanges, events, and Silent Drops
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
import { router } from "expo-router";
import * as Location from "expo-location";

import {
  parent,
  type ScheduleEvent,
  type EventCategory,
  type CustodySummary,
  type CustodyExchange,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Category colors for events
const CATEGORY_COLORS: Record<EventCategory, string> = {
  medical: "#EF4444",
  school: "#3B82F6",
  sports: "#22C55E",
  therapy: "#EC4899",
  extracurricular: "#8B5CF6",
  social: "#F97316",
  travel: "#06B6D4",
  exchange: "#D4A574",
  other: "#6B7280",
};

const CATEGORY_ICONS: Record<EventCategory, string> = {
  medical: "medkit",
  school: "school",
  sports: "football",
  therapy: "heart",
  extracurricular: "musical-notes",
  social: "people",
  travel: "airplane",
  exchange: "swap-horizontal",
  other: "calendar",
};

export default function ScheduleScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [custodySummary, setCustodySummary] = useState<CustodySummary | null>(null);
  const [exchanges, setExchanges] = useState<CustodyExchange[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const familyFileId = familyFile?.id || null;

  // Web design system colors - matching custody color coding
  const SAGE = "#4A6C58"; // Mom's custody / Your time
  const SLATE = "#475569"; // Dad's custody / Co-parent time
  const AMBER = "#D4A574"; // Attention/exchanges

  const fetchData = useCallback(async () => {
    if (!familyFileId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get date range for current month
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const [summaryData, exchangesData, eventsData] = await Promise.all([
        parent.custody.getCustodySummary(familyFileId),
        parent.custody.getExchanges(familyFileId, { upcoming_only: false, limit: 50 }),
        parent.events.listEvents(familyFileId, {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        }),
      ]);
      setCustodySummary(summaryData);
      // API client now returns normalized array with scheduled_at field
      const normalizedExchanges = Array.isArray(exchangesData) ? exchangesData : [];
      console.log("[Schedule] Exchanges fetched:", normalizedExchanges.length);
      console.log("[Schedule] Exchange dates:", normalizedExchanges.map(e => ({
        id: e.id,
        scheduled_at: e.scheduled_at,
        date: e.scheduled_at ? new Date(e.scheduled_at).toDateString() : 'N/A'
      })));
      setExchanges(normalizedExchanges);
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData?.items || []);
    } catch (error) {
      console.error("Failed to fetch schedule data:", error);
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
      // Demo events
      setEvents([
        {
          id: "evt-1",
          family_file_id: familyFileId,
          creator_id: user?.id || "demo",
          title: "Emma's Soccer Practice",
          start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
          all_day: false,
          location: "Community Field",
          location_shared: true,
          visibility: "co_parent",
          event_category: "sports",
          child_ids: ["child-1"],
          children_names: ["Emma"],
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          my_rsvp_status: "going",
        },
        {
          id: "evt-2",
          family_file_id: familyFileId,
          creator_id: user?.id || "demo",
          title: "Lucas Doctor Appointment",
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          location: "Pediatric Clinic",
          location_shared: true,
          visibility: "co_parent",
          event_category: "medical",
          child_ids: ["child-2"],
          children_names: ["Lucas"],
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          my_rsvp_status: "no_response",
        },
        {
          id: "evt-3",
          family_file_id: familyFileId,
          creator_id: user?.id || "demo",
          title: "Parent-Teacher Conference",
          start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          location: "Elementary School",
          location_shared: true,
          visibility: "co_parent",
          event_category: "school",
          child_ids: ["child-1", "child-2"],
          children_names: ["Emma", "Lucas"],
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          my_rsvp_status: "maybe",
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId, currentMonth]);

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

  const getDateItems = (day: number | null): { hasExchange: boolean; eventCount: number; eventColor?: string } => {
    if (!day) return { hasExchange: false, eventCount: 0 };

    const date = new Date(currentMonth);
    date.setDate(day);
    const dateStr = date.toDateString();

    const hasExchange = exchanges.some((ex) => {
      const exDate = new Date(ex.scheduled_at);
      return exDate.toDateString() === dateStr;
    });

    const dayEvents = events.filter((evt) => {
      const evtDate = new Date(evt.start_time);
      return evtDate.toDateString() === dateStr;
    });

    return {
      hasExchange,
      eventCount: dayEvents.length,
      eventColor: dayEvents[0]?.event_category ? CATEGORY_COLORS[dayEvents[0].event_category] : undefined,
    };
  };

  const getSelectedDateItems = () => {
    const dateStr = selectedDate.toDateString();

    const dayExchanges = exchanges.filter((ex) => {
      const exDate = new Date(ex.scheduled_at);
      return exDate.toDateString() === dateStr;
    });

    const dayEvents = events.filter((evt) => {
      const evtDate = new Date(evt.start_time);
      return evtDate.toDateString() === dateStr;
    });

    return { exchanges: dayExchanges, events: dayEvents };
  };

  const handleSilentDropCheckIn = async (exchange: CustodyExchange) => {
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
  const selectedItems = getSelectedDateItems();

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
        {/* Custody Status Banner */}
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

            {/* Time Stats */}
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

        {/* Quick Actions */}
        <View className="flex-row mx-4 mt-4 space-x-2">
          <TouchableOpacity
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: "white" }}
            onPress={() => router.push("/custody/override")}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-2"
              style={{ backgroundColor: `${SAGE}15` }}
            >
              <Ionicons name="hand-left" size={20} color={SAGE} />
            </View>
            <Text className="text-xs font-medium" style={{ color: SLATE }}>
              Children{"\n"}With Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: "white" }}
            onPress={() => router.push("/events/create")}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-2"
              style={{ backgroundColor: `${SAGE}15` }}
            >
              <Ionicons name="calendar" size={20} color={SAGE} />
            </View>
            <Text className="text-xs font-medium text-center" style={{ color: SLATE }}>
              New{"\n"}Event
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: "white" }}
            onPress={() => router.push("/schedule/collections")}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-2"
              style={{ backgroundColor: `${SAGE}15` }}
            >
              <Ionicons name="time" size={20} color={SAGE} />
            </View>
            <Text className="text-xs font-medium text-center" style={{ color: SLATE }}>
              My Time{"\n"}Blocks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: "white" }}
            onPress={() => router.push("/exchange/create")}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mb-2"
              style={{ backgroundColor: `${AMBER}20` }}
            >
              <Ionicons name="swap-horizontal" size={20} color={AMBER} />
            </View>
            <Text className="text-xs font-medium text-center" style={{ color: SLATE }}>
              New{"\n"}Exchange
            </Text>
          </TouchableOpacity>
        </View>

        {/* Next Exchange Card */}
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

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap px-2 bg-cream dark:bg-slate-800 mx-4 rounded-2xl py-2">
          {days.map((day, index) => {
            const dateInfo = getDateItems(day);
            return (
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
                    {/* Dots for exchanges and events */}
                    <View className="absolute bottom-0.5 flex-row space-x-0.5">
                      {dateInfo.hasExchange && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: AMBER }}
                        />
                      )}
                      {dateInfo.eventCount > 0 && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: dateInfo.eventColor || SAGE }}
                        />
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Calendar Legend */}
        <View className="flex-row items-center justify-center mt-4 gap-4 flex-wrap px-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: AMBER }} />
            <Text className="text-slate-600 text-sm">Exchange</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#22C55E" }} />
            <Text className="text-slate-600 text-sm">Sports</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#EF4444" }} />
            <Text className="text-slate-600 text-sm">Medical</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: "#3B82F6" }} />
            <Text className="text-slate-600 text-sm">School</Text>
          </View>
        </View>

        {/* Selected Date Events */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {selectedItems.exchanges.length === 0 && selectedItems.events.length === 0 ? (
            <View className="bg-cream dark:bg-slate-800 rounded-2xl items-center py-8 shadow-card">
              <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
              <Text className="text-slate-500 dark:text-slate-400 mt-3">
                Nothing scheduled for this day
              </Text>
              <TouchableOpacity
                className="mt-4 px-4 py-2 rounded-xl flex-row items-center"
                style={{ backgroundColor: `${SAGE}15` }}
                onPress={() => router.push("/events/create")}
              >
                <Ionicons name="add" size={18} color={SAGE} />
                <Text className="ml-2 font-medium" style={{ color: SAGE }}>
                  Add Event
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {/* Events for selected date */}
              {selectedItems.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}

              {/* Exchanges for selected date */}
              {selectedItems.exchanges.map((exchange) => (
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

        {/* Upcoming Events Section */}
        {events.length > 0 && (
          <View className="mt-6 px-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-slate-800 dark:text-white">
                Upcoming Events
              </Text>
              <TouchableOpacity onPress={() => router.push("/events/create")}>
                <Text style={{ color: SAGE }} className="font-medium">
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Event FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-elevated"
        style={{ backgroundColor: SAGE }}
        onPress={() => router.push("/events/create")}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function EventCard({ event, compact = false }: { event: ScheduleEvent; compact?: boolean }) {
  const categoryColor = event.event_category ? CATEGORY_COLORS[event.event_category] : "#6B7280";
  const categoryIcon = event.event_category ? CATEGORY_ICONS[event.event_category] : "calendar";

  return (
    <TouchableOpacity
      className="bg-cream dark:bg-slate-800 rounded-2xl p-4 shadow-card"
      onPress={() => router.push(`/events/${event.id}`)}
    >
      <View className="flex-row items-start">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center"
          style={{ backgroundColor: `${categoryColor}15` }}
        >
          <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-slate-800 dark:text-white font-semibold">
            {event.title}
          </Text>
          {!compact && event.children_names && event.children_names.length > 0 && (
            <Text className="text-slate-500 text-sm">
              {event.children_names.join(", ")}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Ionicons name="time" size={14} color="#64748b" />
            <Text className="text-slate-500 text-sm ml-1">
              {event.all_day
                ? "All day"
                : new Date(event.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
            </Text>
          </View>
          {!compact && event.location && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="location" size={14} color={categoryColor} />
              <Text className="text-slate-500 text-sm ml-1">{event.location}</Text>
            </View>
          )}

          {/* RSVP Status Badge */}
          {event.my_rsvp_status && event.my_rsvp_status !== "no_response" && (
            <View className="flex-row items-center mt-2">
              <View
                className="px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor:
                    event.my_rsvp_status === "going"
                      ? "#DCFCE7"
                      : event.my_rsvp_status === "not_going"
                      ? "#FEE2E2"
                      : "#FEF3C7",
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{
                    color:
                      event.my_rsvp_status === "going"
                        ? "#166534"
                        : event.my_rsvp_status === "not_going"
                        ? "#991B1B"
                        : "#92400E",
                  }}
                >
                  {event.my_rsvp_status === "going"
                    ? "Going"
                    : event.my_rsvp_status === "not_going"
                    ? "Can't Go"
                    : "Maybe"}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
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
            <Ionicons name="time" size={14} color="#64748b" />
            <Text className="text-slate-500 text-sm ml-1">
              {new Date(exchange.scheduled_at).toLocaleTimeString("en-US", {
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

          {exchange.children_names && exchange.children_names.length > 0 && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="people" size={14} color="#64748b" />
              <Text className="text-slate-500 text-sm ml-1">
                {exchange.children_names.join(", ")}
              </Text>
            </View>
          )}

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

      {exchange.silent_handoff_enabled && isWithinWindow && (
        <View className="mt-4 space-y-2">
          <TouchableOpacity
            className="py-3.5 rounded-xl flex-row items-center justify-center"
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

          {exchange.qr_confirmation_required && (
            <View className="flex-row space-x-2">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl flex-row items-center justify-center border-2"
                style={{ borderColor: sageColor }}
                onPress={() => router.push(`/exchange/qr-show?instanceId=${exchange.id}`)}
              >
                <Ionicons name="qr-code" size={18} color={sageColor} />
                <Text className="font-medium ml-2" style={{ color: sageColor }}>
                  Show QR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl flex-row items-center justify-center border-2"
                style={{ borderColor: sageColor }}
                onPress={() => router.push(`/exchange/qr-scan?instanceId=${exchange.id}`)}
              >
                <Ionicons name="scan" size={18} color={sageColor} />
                <Text className="font-medium ml-2" style={{ color: sageColor }}>
                  Scan QR
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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

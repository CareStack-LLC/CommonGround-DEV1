/**
 * Events List Screen
 *
 * View all events with category filtering.
 * Features:
 * - List all upcoming events
 * - Filter by category
 * - Filter by child
 * - Search events
 * - Quick RSVP actions
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  parent,
  type ScheduleEvent,
  type EventCategory,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

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

const CATEGORIES: Array<{ id: EventCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "medical", label: "Medical" },
  { id: "school", label: "School" },
  { id: "sports", label: "Sports" },
  { id: "therapy", label: "Therapy" },
  { id: "extracurricular", label: "Activities" },
  { id: "social", label: "Social" },
  { id: "travel", label: "Travel" },
  { id: "other", label: "Other" },
];

export default function EventsListScreen() {
  const { user } = useAuth();
  const { familyFile, children } = useFamilyFile();

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | "all">("all");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const familyFileId = familyFile?.id || user?.family_file_id || "demo";

  const fetchEvents = useCallback(async () => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Next 3 months

      const data = await parent.events.listEvents(familyFileId, {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        category: selectedCategory === "all" ? undefined : selectedCategory,
        child_id: selectedChildId || undefined,
      });
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      // Demo data
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
        {
          id: "evt-4",
          family_file_id: familyFileId,
          creator_id: "coparent",
          title: "Emma's Piano Recital",
          start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          location: "Community Center",
          location_shared: true,
          visibility: "co_parent",
          event_category: "extracurricular",
          child_ids: ["child-1"],
          children_names: ["Emma"],
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          my_rsvp_status: "going",
          creator_name: "Co-Parent",
        },
        {
          id: "evt-5",
          family_file_id: familyFileId,
          creator_id: user?.id || "demo",
          title: "Lucas's Therapy Session",
          start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          all_day: false,
          location: "Child Therapy Center",
          location_shared: true,
          visibility: "co_parent",
          event_category: "therapy",
          child_ids: ["child-2"],
          children_names: ["Lucas"],
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          my_rsvp_status: "going",
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId, selectedCategory, selectedChildId, user?.id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
  }, [fetchEvents]);

  // Filter events by search query
  const filteredEvents = events.filter((event) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.children_names?.some((name) => name.toLowerCase().includes(query))
    );
  });

  // Group events by date
  const groupedEvents = filteredEvents.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    const date = new Date(event.start_time).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Events",
          headerRight: () => (
            <TouchableOpacity
              className="mr-2"
              onPress={() => router.push("/events/create")}
            >
              <Ionicons name="add-circle" size={28} color={colors.sage} />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
        {/* Search Bar */}
        <View className="px-4 pt-2 pb-3">
          <View className="flex-row items-center bg-white rounded-xl px-3 py-2">
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-2"
              style={{ color: colors.slate, fontSize: 16 }}
              placeholder="Search events..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter */}
        <View className="mb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <View className="flex-row space-x-2">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      selectedCategory === cat.id
                        ? cat.id === "all"
                          ? colors.sage
                          : CATEGORY_COLORS[cat.id as EventCategory]
                        : "white",
                  }}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: selectedCategory === cat.id ? "white" : colors.slate,
                    }}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Child Filter */}
        {children.length > 1 && (
          <View className="mb-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: !selectedChildId ? colors.sand : "white",
                    borderColor: colors.sand,
                  }}
                  onPress={() => setSelectedChildId(null)}
                >
                  <Text
                    className="text-sm"
                    style={{ color: !selectedChildId ? colors.sage : colors.slate }}
                  >
                    All Children
                  </Text>
                </TouchableOpacity>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    className="px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: selectedChildId === child.id ? colors.sand : "white",
                      borderColor: colors.sand,
                    }}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text
                      className="text-sm"
                      style={{ color: selectedChildId === child.id ? colors.sage : colors.slate }}
                    >
                      {child.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Events List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
          }
        >
          {sortedDates.length === 0 ? (
            <View className="bg-white rounded-2xl items-center py-12 mt-4">
              <Ionicons name="calendar-outline" size={64} color="#94a3b8" />
              <Text className="text-slate-500 mt-4 text-center">
                {searchQuery ? "No events match your search" : "No upcoming events"}
              </Text>
              <TouchableOpacity
                className="mt-4 px-4 py-2 rounded-xl"
                style={{ backgroundColor: colors.sage }}
                onPress={() => router.push("/events/create")}
              >
                <Text className="text-white font-medium">Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedDates.map((dateStr) => (
              <View key={dateStr} className="mt-4">
                <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
                  {formatDateHeader(dateStr)}
                </Text>
                <View className="space-y-2">
                  {groupedEvents[dateStr].map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function EventCard({ event }: { event: ScheduleEvent }) {
  const categoryColor = event.event_category ? CATEGORY_COLORS[event.event_category] : "#6B7280";
  const categoryIcon = event.event_category ? CATEGORY_ICONS[event.event_category] : "calendar";

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4"
      onPress={() => router.push(`/events/${event.id}` as any)}
    >
      <View className="flex-row">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${categoryColor}15` }}
        >
          <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
        </View>

        <View className="flex-1 ml-3">
          <Text className="font-semibold" style={{ color: colors.slate }}>
            {event.title}
          </Text>
          {event.children_names && event.children_names.length > 0 && (
            <Text className="text-sm text-slate-500">
              {event.children_names.join(", ")}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="time" size={14} color="#94a3b8" />
            <Text className="text-sm text-slate-500 ml-1">
              {event.all_day
                ? "All day"
                : new Date(event.start_time).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
            </Text>
          </View>
          {event.location && (
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="location" size={14} color={categoryColor} />
              <Text className="text-sm text-slate-500 ml-1">{event.location}</Text>
            </View>
          )}
        </View>

        <View className="items-end">
          {/* RSVP Badge */}
          {event.my_rsvp_status && event.my_rsvp_status !== "no_response" && (
            <View
              className="px-2 py-1 rounded-full"
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
          )}
          {event.my_rsvp_status === "no_response" && (
            <View
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: colors.sand }}
            >
              <Text className="text-xs font-medium" style={{ color: colors.slate }}>
                RSVP
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

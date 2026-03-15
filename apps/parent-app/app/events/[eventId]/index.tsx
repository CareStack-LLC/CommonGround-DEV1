/**
 * Event Detail Screen
 *
 * View event details and manage RSVP status.
 * Features:
 * - Event information display
 * - Category-specific details
 * - RSVP controls (going/not going/maybe)
 * - Attendance summary
 * - GPS check-in (if location set)
 * - Edit/delete options
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import {
  parent,
  type ScheduleEvent,
  type EventAttendance,
  type RSVPStatus,
  type EventCategory,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { BottomNavBar } from "@/components/BottomNavBar";
import { useTheme, categoryColors, categoryIcons } from "@/theme";

const CATEGORY_COLORS: Record<EventCategory, string> = categoryColors;

const CATEGORY_ICONS: Record<EventCategory, string> = categoryIcons;

const RSVP_OPTIONS: Array<{ status: RSVPStatus; label: string; icon: string; color: string }> = [
  { status: "going", label: "Going", icon: "checkmark-circle", color: "#22C55E" },
  { status: "maybe", label: "Maybe", icon: "help-circle", color: "#F59E0B" },
  { status: "not_going", label: "Can't Go", icon: "close-circle", color: "#EF4444" },
];

export default function EventDetailScreen() {
  const { colors } = useTheme();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<ScheduleEvent | null>(null);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingRSVP, setUpdatingRSVP] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    try {
      const [eventData, attendanceData] = await Promise.all([
        parent.events.getEvent(eventId),
        parent.events.getEventAttendance(eventId),
      ]);
      setEvent(eventData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error("Failed to fetch event:", error);
      // Demo data for testing
      setEvent({
        id: eventId,
        family_file_id: "demo",
        creator_id: user?.id || "demo",
        title: "Emma's Soccer Practice",
        description: "Weekly practice at the community field. Bring water and shin guards.",
        start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
        all_day: false,
        location: "Community Sports Complex",
        location_lat: 34.0522,
        location_lng: -118.2437,
        location_shared: true,
        visibility: "co_parent",
        event_category: "sports",
        category_data: {
          team_name: "Lightning Bolts",
          sport_type: "Soccer",
          coach_name: "Coach Martinez",
          uniform_required: true,
        },
        child_ids: ["child-1"],
        children_names: ["Emma"],
        status: "scheduled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator_name: "You",
        my_rsvp_status: "no_response",
        attendance_summary: {
          going: 1,
          not_going: 0,
          maybe: 0,
          no_response: 1,
        },
      });
      setAttendance([
        {
          id: "att-1",
          event_id: eventId,
          parent_id: user?.id || "demo",
          invited_role: "required",
          rsvp_status: "no_response",
          parent_name: "You",
        },
        {
          id: "att-2",
          event_id: eventId,
          parent_id: "coparent",
          invited_role: "optional",
          rsvp_status: "going",
          rsvp_note: "I can pick her up!",
          rsvp_at: new Date().toISOString(),
          parent_name: "Co-Parent",
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [eventId, user?.id]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEventData();
  }, [fetchEventData]);

  const handleRSVP = async (status: RSVPStatus) => {
    if (!eventId) return;

    setUpdatingRSVP(true);
    try {
      await parent.events.updateRSVP(eventId, { rsvp_status: status });
      setEvent((prev) => (prev ? { ...prev, my_rsvp_status: status } : null));
      Alert.alert("RSVP Updated", `You're marked as "${RSVP_OPTIONS.find((o) => o.status === status)?.label}"`);
      await fetchEventData();
    } catch (error) {
      console.error("Failed to update RSVP:", error);
      // Demo mode - just update locally
      setEvent((prev) => (prev ? { ...prev, my_rsvp_status: status } : null));
    } finally {
      setUpdatingRSVP(false);
    }
  };

  const handleCheckIn = async () => {
    if (!eventId || !event?.location_lat || !event?.location_lng) return;

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

      const result = await parent.events.checkInWithGPS(eventId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        device_accuracy: location.coords.accuracy || undefined,
      });

      if (result.in_geofence) {
        Alert.alert("Checked In!", "You've successfully checked in to this event.");
      } else {
        Alert.alert(
          "Not at Location",
          `You're ${Math.round(result.distance_from_location || 0)}m away from the event location.`
        );
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      Alert.alert("Check-In Failed", "Unable to verify your location. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to cancel this event? This action cannot be undone.",
      [
        { text: "Keep Event", style: "cancel" },
        {
          text: "Cancel Event",
          style: "destructive",
          onPress: async () => {
            try {
              await parent.events.deleteEvent(eventId!);
              Alert.alert("Event Cancelled", "The event has been removed from the calendar.");
              router.back();
            } catch (error) {
              console.error("Failed to delete event:", error);
              Alert.alert("Error", "Failed to cancel the event. Please try again.");
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (dateString: string, includeTime = true) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
    };
    if (includeTime) {
      options.hour = "numeric";
      options.minute = "2-digit";
    }
    return date.toLocaleDateString("en-US", options);
  };

  const getCategoryColor = () => {
    return event?.event_category ? CATEGORY_COLORS[event.event_category] : colors.primary;
  };

  const getCategoryIcon = () => {
    return event?.event_category ? CATEGORY_ICONS[event.event_category] : "calendar";
  };

  const isCreator = event?.creator_id === user?.id;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["top"]}>
        {/* Custom Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.backgroundSecondary,
            backgroundColor: colors.background,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.secondary }}>
            Event
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <BottomNavBar />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["top"]}>
        {/* Custom Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.backgroundSecondary,
            backgroundColor: colors.background,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 4 }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.secondary }}>
            Event
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <View className="flex-1 items-center justify-center">
          <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
          <Text className="text-slate-500 mt-4">Event not found</Text>
        </View>
        <BottomNavBar />
      </SafeAreaView>
    );
  }

  const showMenu = () => {
    const options = isCreator
      ? ["Edit Event", "Cancel Event", "Cancel"]
      : ["Cancel"];

    Alert.alert(
      "Event Options",
      undefined,
      isCreator
        ? [
            { text: "Edit Event", onPress: () => router.push(`/events/${eventId}/edit`) },
            { text: "Cancel Event", style: "destructive", onPress: handleDelete },
            { text: "Cancel", style: "cancel" },
          ]
        : [{ text: "Cancel", style: "cancel" }]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.backgroundSecondary,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: colors.secondary }}>
          Event
        </Text>
        <TouchableOpacity onPress={showMenu} style={{ padding: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header Banner */}
        <View className="p-4 mx-4 mt-4 rounded-2xl" style={{ backgroundColor: getCategoryColor() }}>
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
              <Ionicons name={getCategoryIcon() as any} size={28} color="white" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-white/70 text-sm capitalize">
                {event.event_category?.replace("_", " ") || "Event"}
              </Text>
              <Text className="text-white text-xl font-bold">{event.title}</Text>
            </View>
          </View>

          {/* Children */}
          {event.children_names && event.children_names.length > 0 && (
            <View className="flex-row items-center mt-3 pt-3 border-t border-white/20">
              <Ionicons name="people" size={16} color="white" />
              <Text className="text-white/90 ml-2">{event.children_names.join(", ")}</Text>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4">
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: `${getCategoryColor()}15` }}
            >
              <Ionicons name="calendar" size={24} color={getCategoryColor()} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-slate-500 text-sm">When</Text>
              <Text className="font-semibold" style={{ color: colors.secondary }}>
                {formatDateTime(event.start_time, !event.all_day)}
              </Text>
              {event.end_time && !event.all_day && (
                <Text className="text-slate-500 text-sm">
                  until {new Date(event.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </Text>
              )}
              {event.all_day && <Text className="text-slate-500 text-sm">All day</Text>}
            </View>
          </View>
        </View>

        {/* Location */}
        {event.location && (
          <View className="mx-4 mt-3 rounded-xl bg-white p-4">
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${getCategoryColor()}15` }}
              >
                <Ionicons name="location" size={24} color={getCategoryColor()} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-slate-500 text-sm">Where</Text>
                <Text className="font-semibold" style={{ color: colors.secondary }}>
                  {event.location}
                </Text>
              </View>
              {event.location_lat && event.location_lng && (
                <TouchableOpacity
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: colors.backgroundSecondary }}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="navigate" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View className="mx-4 mt-3 rounded-xl bg-white p-4">
            <Text className="text-slate-500 text-sm mb-2">Notes</Text>
            <Text style={{ color: colors.secondary }}>{event.description}</Text>
          </View>
        )}

        {/* Category-Specific Details */}
        {event.category_data && Object.keys(event.category_data).length > 0 && (
          <View className="mx-4 mt-3 rounded-xl bg-white p-4">
            <Text className="text-slate-500 text-sm mb-3">Details</Text>
            {event.category_data.provider_name && (
              <DetailRow icon="person" label="Provider" value={event.category_data.provider_name} />
            )}
            {event.category_data.appointment_type && (
              <DetailRow icon="medical" label="Type" value={event.category_data.appointment_type} />
            )}
            {event.category_data.school_name && (
              <DetailRow icon="school" label="School" value={event.category_data.school_name} />
            )}
            {event.category_data.teacher_name && (
              <DetailRow icon="person" label="Teacher" value={event.category_data.teacher_name} />
            )}
            {event.category_data.team_name && (
              <DetailRow icon="people" label="Team" value={event.category_data.team_name} />
            )}
            {event.category_data.sport_type && (
              <DetailRow icon="football" label="Sport" value={event.category_data.sport_type} />
            )}
            {event.category_data.coach_name && (
              <DetailRow icon="person" label="Coach" value={event.category_data.coach_name} />
            )}
            {event.category_data.uniform_required !== undefined && (
              <DetailRow
                icon="shirt"
                label="Uniform"
                value={event.category_data.uniform_required ? "Required" : "Not required"}
              />
            )}
            {event.category_data.cost !== undefined && (
              <DetailRow icon="cash" label="Cost" value={`$${event.category_data.cost}`} />
            )}
            {event.category_data.contact_phone && (
              <DetailRow icon="call" label="Phone" value={event.category_data.contact_phone} />
            )}
          </View>
        )}

        {/* RSVP Section */}
        <View className="mx-4 mt-4">
          <Text className="font-semibold mb-3" style={{ color: colors.secondary }}>
            Your Response
          </Text>
          <View className="flex-row space-x-2">
            {RSVP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.status}
                className="flex-1 rounded-xl py-3 items-center"
                style={{
                  backgroundColor: event.my_rsvp_status === option.status ? option.color : "white",
                  borderWidth: event.my_rsvp_status === option.status ? 0 : 2,
                  borderColor: colors.backgroundSecondary,
                }}
                onPress={() => handleRSVP(option.status)}
                disabled={updatingRSVP}
              >
                {updatingRSVP && event.my_rsvp_status !== option.status ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={event.my_rsvp_status === option.status ? "white" : option.color}
                    />
                    <Text
                      className="text-sm mt-1 font-medium"
                      style={{
                        color: event.my_rsvp_status === option.status ? "white" : colors.secondary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Attendance Summary */}
        {attendance.length > 0 && (
          <View className="mx-4 mt-4 rounded-xl bg-white p-4">
            <Text className="font-semibold mb-3" style={{ color: colors.secondary }}>
              Responses ({attendance.length})
            </Text>
            {attendance.map((att) => (
              <View key={att.id} className="flex-row items-center py-2 border-b border-slate-100 last:border-0">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.backgroundSecondary }}
                >
                  <Text className="font-semibold" style={{ color: colors.secondary }}>
                    {att.parent_name?.charAt(0) || "?"}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-medium" style={{ color: colors.secondary }}>
                    {att.parent_name || "Unknown"}
                  </Text>
                  {att.rsvp_note && (
                    <Text className="text-sm text-slate-500">{att.rsvp_note}</Text>
                  )}
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      att.rsvp_status === "going"
                        ? "#DCFCE7"
                        : att.rsvp_status === "not_going"
                        ? "#FEE2E2"
                        : att.rsvp_status === "maybe"
                        ? "#FEF3C7"
                        : colors.backgroundSecondary,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        att.rsvp_status === "going"
                          ? "#166534"
                          : att.rsvp_status === "not_going"
                          ? "#991B1B"
                          : att.rsvp_status === "maybe"
                          ? "#92400E"
                          : colors.secondary,
                    }}
                  >
                    {att.rsvp_status === "no_response"
                      ? "Pending"
                      : att.rsvp_status === "not_going"
                      ? "Can't Go"
                      : att.rsvp_status.charAt(0).toUpperCase() + att.rsvp_status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        {isCreator && (
          <View className="mx-4 mt-4 flex-row space-x-2">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl flex-row items-center justify-center border-2"
              style={{ borderColor: colors.primary }}
              onPress={() => router.push(`/events/${eventId}/edit`)}
            >
              <Ionicons name="pencil" size={18} color={colors.primary} />
              <Text className="font-semibold ml-2" style={{ color: colors.primary }}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
              style={{ backgroundColor: "#FEE2E2" }}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color="#DC2626" />
              <Text className="font-semibold ml-2" style={{ color: "#DC2626" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Created By */}
        <View className="mx-4 mt-4 pt-4 border-t" style={{ borderColor: colors.backgroundSecondary }}>
          <Text className="text-center text-sm text-slate-400">
            Created by {event.creator_name || "Unknown"}
            {event.visibility === "private" && " (Private)"}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center py-2 border-b border-slate-100 last:border-0">
      <Ionicons name={icon as any} size={18} color={colors.textMuted} />
      <Text className="text-slate-500 ml-2 w-20">{label}</Text>
      <Text className="flex-1 font-medium" style={{ color: colors.secondary }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Time Bridge Schedule Screen
 *
 * Simplified calendar: events, exchanges, swap requests.
 * No collections or time blocks. Agreement exchange header at top.
 */

import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";

import {
  parent,
  type ScheduleEvent,
  type CustodySummary,
  type CustodyExchange,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useTheme, categoryColors, categoryIcons } from "@/theme";
import { Card, Badge, SkeletonLoader } from "@/components/ui";
import { AgreementExchangeHeader } from "@/components/schedule/AgreementExchangeHeader";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const { colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [custodySummary, setCustodySummary] = useState<CustodySummary | null>(null);
  const [exchanges, setExchanges] = useState<CustodyExchange[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const familyFileId = familyFile?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyFileId) { setIsLoading(false); return; }
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const [summaryData, exchangesData, eventsData] = await Promise.all([
        parent.custody.getCustodySummary(familyFileId),
        parent.custody.getExchanges(familyFileId, { upcoming_only: false, limit: 50 }),
        parent.events.listEvents(familyFileId, { start_date: startDate.toISOString(), end_date: endDate.toISOString() }),
      ]);
      setCustodySummary(summaryData);
      setExchanges(Array.isArray(exchangesData) ? exchangesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData?.items || []);
    } catch (error) {
      console.error("Failed to fetch schedule data:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId, currentMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
  }, [fetchData]);

  // ── Calendar helpers ──────────────────────────────────────────────

  const getDaysInMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
    return days;
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isTodayDate = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return day === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
  };

  const getDateItems = (day: number | null) => {
    if (!day) return { hasExchange: false, eventCount: 0 };
    const date = new Date(currentMonth);
    date.setDate(day);
    const dateStr = date.toDateString();
    const hasExchange = exchanges.some((ex) => new Date(ex.scheduled_at).toDateString() === dateStr);
    const dayEvents = events.filter((evt) => new Date(evt.start_time).toDateString() === dateStr);
    return {
      hasExchange,
      eventCount: dayEvents.length,
      eventColor: dayEvents[0]?.event_category ? categoryColors[dayEvents[0].event_category as keyof typeof categoryColors] : undefined,
    };
  };

  const getSelectedDateItems = () => {
    const dateStr = selectedDate.toDateString();
    return {
      exchanges: exchanges.filter((ex) => new Date(ex.scheduled_at).toDateString() === dateStr),
      events: events.filter((evt) => new Date(evt.start_time).toDateString() === dateStr),
    };
  };

  const handleSilentDropCheckIn = async (exchange: CustodyExchange) => {
    setCheckingIn(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Denied", "Location permission is required for check-in"); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const result = await parent.custody.checkInAtExchange({
        exchange_instance_id: exchange.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        device_accuracy_meters: location.coords.accuracy || undefined,
      });
      if (result.in_geofence) {
        Alert.alert("Check-In Successful", `You're at the exchange location! Distance: ${Math.round(result.distance_meters)}m`);
      } else {
        Alert.alert("Not at Location", `You're ${Math.round(result.distance_meters)}m away. Please move closer.`);
      }
    } catch {
      Alert.alert("Check-In Failed", "Unable to verify your location. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const days = getDaysInMonth(currentMonth);
  const selectedItems = getSelectedDateItems();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: 20 }} edges={["top"]}>
        <SkeletonLoader variant="card" count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Agreement Exchange Header ──────────────────────────── */}
        <AgreementExchangeHeader familyFileId={familyFileId} />

        {/* ── Custody Status Banner ─────────────────────────────── */}
        {custodySummary && (
          <View style={{
            marginHorizontal: 16, marginTop: 12, borderRadius: 20, padding: 20,
            backgroundColor: custodySummary.current_custody_parent === "parent_a" ? colors.primary : colors.secondary,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Current Custody</Text>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 4 }}>
                  {custodySummary.current_custody_parent === "parent_a" ? "With You" : "With Co-Parent"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
                  {custodySummary.children.map((child) => (
                    <View key={child.id} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{child.name.charAt(0)}</Text>
                    </View>
                  ))}
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginLeft: 4 }}>
                    {custodySummary.children.map((c) => c.name).join(", ")}
                  </Text>
                </View>
              </View>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="home" size={26} color="#fff" />
              </View>
            </View>
            <View style={{ flexDirection: "row", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Your Time</Text>
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16, marginTop: 2 }}>
                  {custodySummary.this_week_days.parent_a} days this week
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Their Time</Text>
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16, marginTop: 2 }}>
                  {custodySummary.this_week_days.parent_b} days this week
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Quick Actions (simplified — no collections/time blocks) ─ */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 12, gap: 8 }}>
          {[
            { icon: "calendar" as const, label: "New\nEvent", onPress: () => router.push("/events/create") },
            { icon: "swap-horizontal" as const, label: "Swap\nRequest", onPress: () => router.push("/(tabs)/schedule") },
            { icon: "location" as const, label: "New\nExchange", onPress: () => router.push("/exchange/create"), accent: true },
            { icon: "hand-left" as const, label: "Children\nWith Me", onPress: () => router.push("/custody/override") },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={{
                flex: 1, backgroundColor: colors.cardBackground, borderRadius: 14,
                padding: 12, alignItems: "center", borderWidth: 1, borderColor: colors.cardBorder,
              }}
              onPress={action.onPress}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
                backgroundColor: action.accent ? colors.accentLight : colors.primaryLight,
              }}>
                <Ionicons name={action.icon} size={20} color={action.accent ? colors.accent : colors.primary} />
              </View>
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary, textAlign: "center", marginTop: 6 }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Next Exchange Card ─────────────────────────────────── */}
        {custodySummary?.next_exchange && (
          <TouchableOpacity
            style={{
              marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16,
              backgroundColor: colors.accentLight, borderWidth: 1, borderColor: colors.accent + "40",
            }}
            onPress={() => router.push(`/exchange/${custodySummary.next_exchange!.id}`)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accent + "25", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="swap-horizontal" size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: "600", color: colors.textPrimary }}>Next Exchange</Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {new Date(custodySummary.next_exchange.scheduled_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </Text>
                {custodySummary.next_exchange.location_name && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
                    <Ionicons name="location" size={12} color={colors.accent} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{custodySummary.next_exchange.location_name}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.accent} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Calendar Header ────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary }}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Day Names ──────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", paddingHorizontal: 8, marginBottom: 8 }}>
          {DAYS.map((day) => (
            <View key={day} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>{day}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar Grid ──────────────────────────────────────── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, backgroundColor: colors.surfaceElevated, marginHorizontal: 16, borderRadius: 16, paddingVertical: 8 }}>
          {days.map((day, index) => {
            const dateInfo = getDateItems(day);
            return (
              <TouchableOpacity
                key={index}
                style={{ width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 }}
                onPress={() => { if (day) { const d = new Date(currentMonth); d.setDate(day); setSelectedDate(d); } }}
                disabled={!day}
              >
                {day && (
                  <View style={{
                    width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12,
                    backgroundColor: isSelected(day) ? colors.primary : isTodayDate(day) ? colors.primaryLight : "transparent",
                  }}>
                    <Text style={{
                      fontSize: 14, fontWeight: "500",
                      color: isSelected(day) ? colors.textInverse : isTodayDate(day) ? colors.primary : colors.textPrimary,
                    }}>{day}</Text>
                    <View style={{ position: "absolute", bottom: 2, flexDirection: "row", gap: 2 }}>
                      {dateInfo.hasExchange && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }} />}
                      {dateInfo.eventCount > 0 && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dateInfo.eventColor || colors.primary }} />}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Legend ──────────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12, gap: 16, flexWrap: "wrap", paddingHorizontal: 16 }}>
          {(["Exchange", "Sports", "Medical", "School"] as const).map((label) => {
            const colorMap: Record<string, string> = { Exchange: colors.accent, Sports: categoryColors.sports, Medical: categoryColors.medical, School: categoryColors.school };
            return (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colorMap[label] }} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Selected Date Events ───────────────────────────────── */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>

          {selectedItems.exchanges.length === 0 && selectedItems.events.length === 0 ? (
            <Card>
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12 }}>Nothing scheduled</Text>
                <TouchableOpacity
                  style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.primaryLight, flexDirection: "row", alignItems: "center", gap: 6 }}
                  onPress={() => router.push("/events/create")}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={{ fontWeight: "500", color: colors.primary }}>Add Event</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {selectedItems.events.map((event) => <EventCard key={event.id} event={event} />)}
              {selectedItems.exchanges.map((exchange) => (
                <ExchangeCard key={exchange.id} exchange={exchange} onCheckIn={() => handleSilentDropCheckIn(exchange)} checkingIn={checkingIn} />
              ))}
            </View>
          )}
        </View>

        {/* ── Upcoming Events ────────────────────────────────────── */}
        {events.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary }}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => router.push("/events/create")}>
                <Text style={{ color: colors.primary, fontWeight: "500" }}>+ Add</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 12 }}>
              {events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} compact />)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={{
          position: "absolute", bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        }}
        onPress={() => router.push("/events/create")}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── EventCard ───────────────────────────────────────────────────────

function EventCard({ event, compact = false }: { event: ScheduleEvent; compact?: boolean }) {
  const { colors } = useTheme();
  const evtColor = event.event_category ? categoryColors[event.event_category as keyof typeof categoryColors] || "#6B7280" : "#6B7280";
  const evtIcon = event.event_category ? (categoryIcons as Record<string, string>)[event.event_category] || "calendar" : "calendar";

  return (
    <Card onPress={() => router.push(`/events/${event.id}`)}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: evtColor + "15", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={evtIcon as any} size={24} color={evtColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: "600", fontSize: 15 }}>{event.title}</Text>
          {!compact && event.children_names && event.children_names.length > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{event.children_names.join(", ")}</Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
            <Ionicons name="time" size={14} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {event.all_day ? "All day" : new Date(event.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </View>
          {!compact && event.location && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
              <Ionicons name="location" size={14} color={evtColor} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{event.location}</Text>
            </View>
          )}
          {event.my_rsvp_status && event.my_rsvp_status !== "no_response" && (
            <View style={{ marginTop: 8 }}>
              <Badge
                label={event.my_rsvp_status === "going" ? "Going" : event.my_rsvp_status === "not_going" ? "Can't Go" : "Maybe"}
                variant={event.my_rsvp_status === "going" ? "success" : event.my_rsvp_status === "not_going" ? "danger" : "warning"}
                size="sm"
              />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

// ── ExchangeCard ────────────────────────────────────────────────────

function ExchangeCard({ exchange, onCheckIn, checkingIn }: { exchange: CustodyExchange; onCheckIn: () => void; checkingIn: boolean }) {
  const { colors } = useTheme();
  const isUpcoming = new Date(exchange.scheduled_at) > new Date();
  const isWithinWindow = (() => {
    const now = new Date();
    const scheduled = new Date(exchange.scheduled_at);
    const windowStart = new Date(scheduled.getTime() - exchange.check_in_window_before_minutes * 60000);
    const windowEnd = new Date(scheduled.getTime() + exchange.check_in_window_after_minutes * 60000);
    return now >= windowStart && now <= windowEnd;
  })();

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accentLight, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="swap-horizontal" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Custody Exchange</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {exchange.from_parent === "parent_a" ? "You" : "Co-parent"} to {exchange.to_parent === "parent_a" ? "You" : "Co-parent"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
            <Ionicons name="time" size={14} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {new Date(exchange.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </View>
          {exchange.location_name && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{exchange.location_name}</Text>
            </View>
          )}
          {exchange.children_names && exchange.children_names.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
              <Ionicons name="people" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{exchange.children_names.join(", ")}</Text>
            </View>
          )}
          {exchange.silent_handoff_enabled && (
            <View style={{ marginTop: 8 }}>
              <Badge label="Silent Drop GPS" variant="success" icon="navigate" size="sm" />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      {exchange.silent_handoff_enabled && isWithinWindow && (
        <View style={{ marginTop: 16, gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            onPress={onCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? <ActivityIndicator color={colors.textInverse} size="small" /> : (
              <><Ionicons name="navigate" size={18} color={colors.textInverse} /><Text style={{ color: colors.textInverse, fontWeight: "600" }}>Check In at Location</Text></>
            )}
          </TouchableOpacity>
          {exchange.qr_confirmation_required && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                onPress={() => router.push(`/exchange/qr-show?instanceId=${exchange.id}`)}
              >
                <Ionicons name="qr-code" size={18} color={colors.primary} />
                <Text style={{ fontWeight: "500", color: colors.primary }}>Show QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
                onPress={() => router.push(`/exchange/qr-scan?instanceId=${exchange.id}`)}
              >
                <Ionicons name="scan" size={18} color={colors.primary} />
                <Text style={{ fontWeight: "500", color: colors.primary }}>Scan QR</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {exchange.silent_handoff_enabled && !isWithinWindow && isUpcoming && (
        <View style={{ marginTop: 16, backgroundColor: colors.secondaryLight, paddingVertical: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Ionicons name="time" size={18} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Check-in opens {exchange.check_in_window_before_minutes} min before</Text>
        </View>
      )}
    </Card>
  );
}

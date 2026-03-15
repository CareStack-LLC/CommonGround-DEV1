/**
 * Dashboard Screen — Parent Command Center
 *
 * At-a-glance view of all children, custody status, action items,
 * upcoming events, and quick actions. Fully themed with light/dark mode.
 */

import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { differenceInDays, differenceInHours, format, isToday } from "date-fns";

import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useTheme, categoryColors, categoryIcons } from "@/theme";
import { Card, Badge, Avatar, SectionHeader, SkeletonLoader } from "@/components/ui";

// ── Types ───────────────────────────────────────────────────────────

interface ChildCustodyStatus {
  child_id: string;
  child_first_name: string;
  child_last_name?: string;
  with_current_user: boolean;
  current_parent_id: string;
  current_parent_name: string;
  next_action?: "pickup" | "dropoff";
  next_exchange_id?: string;
  next_exchange_time?: string;
  next_exchange_location?: string;
  hours_remaining?: number;
  time_with_current_parent_hours?: number;
  days_with_current_parent?: number;
  custody_started_at?: string;
  progress_percentage: number;
  needs_initial_checkin?: boolean;
}

interface CustodyStatusResponse {
  family_file_id: string;
  case_id?: string;
  current_user_id: string;
  coparent_id?: string;
  coparent_name?: string;
  children: ChildCustodyStatus[];
  agreement_active_days?: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_category?: string;
  start_time: string;
  location?: string;
  is_exchange?: boolean;
  child_names?: string[];
  viewer_role?: string;
  other_parent_name?: string;
}

interface DashboardSummary {
  pending_expenses_count: number;
  unread_messages_count: number;
  pending_agreements_count: number;
  active_quick_accords_count: number;
  upcoming_events: UpcomingEvent[];
  recent_activities: Array<{
    id: string;
    activity_type: string;
    title: string;
    created_at: string;
  }>;
  unread_activity_count: number;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatTimeBadge(dateString: string): { text: string; subtext: string } {
  const date = new Date(dateString);
  const now = new Date();
  const hoursUntil = differenceInHours(date, now);
  const daysUntil = differenceInDays(date, now);

  if (hoursUntil < 24) return { text: `${hoursUntil}h`, subtext: isToday(date) ? "Today" : "Tomorrow" };
  if (daysUntil < 7) return { text: `${daysUntil}d`, subtext: format(date, "EEE") };
  return { text: `${daysUntil}d`, subtext: format(date, "MMM d") };
}

function formatActivityTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "now";
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return format(date, "MMM d");
}

function getEventIcon(category?: string): keyof typeof Ionicons.glyphMap {
  return (categoryIcons as Record<string, keyof typeof Ionicons.glyphMap>)[category || "other"] || "calendar";
}

function getEventColor(category?: string): string {
  return (categoryColors as Record<string, string>)[category || "other"] || "#6B7280";
}

// ── Main Component ──────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user } = useAuth();
  const { familyFile, children, refresh } = useFamilyFile();
  const { colors, isDark } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [custodyStatus, setCustodyStatus] = useState<CustodyStatusResponse | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const familyFileId = familyFile?.id;

  const getToken = async () => {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync("auth_token");
  };

  const fetchDashboard = useCallback(async () => {
    if (!familyFileId) { setIsLoading(false); return; }
    try {
      const token = await getToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const [dashboardResponse, custodyResponse] = await Promise.all([
        fetch(`${apiUrl}/api/v1/dashboard/summary/${familyFileId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/v1/exchanges/family-file/${familyFileId}/custody-status`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (dashboardResponse.ok) setDashboardData(await dashboardResponse.json() as DashboardSummary);
      if (custodyResponse.ok) setCustodyStatus(await custodyResponse.json() as CustodyStatusResponse);
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
      setDashboardData({
        pending_expenses_count: 0, unread_messages_count: 0, pending_agreements_count: 0,
        active_quick_accords_count: 0, upcoming_events: [], recent_activities: [], unread_activity_count: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [familyFileId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchDashboard()]);
    setRefreshing(false);
  }, [refresh, fetchDashboard]);

  const handleCheckIn = useCallback(async () => {
    if (!familyFileId || !children?.length) {
      Alert.alert("Error", "No children found to check in");
      return;
    }
    setCheckingIn(true);
    try {
      const token = await getToken();
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/exchanges/override-custody`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ family_file_id: familyFileId, child_ids: children.map((c) => c.id), notes: "Initial check-in to start custody tracking" }),
      });
      if (response.ok) {
        Alert.alert("Success", "Custody check-in recorded. Time tracking has started.");
        await fetchDashboard();
      } else {
        const errorData = (await response.json().catch(() => ({}))) as { detail?: string };
        Alert.alert("Error", errorData.detail || "Failed to check in");
      }
    } catch {
      Alert.alert("Error", "Failed to check in. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  }, [familyFileId, children, fetchDashboard]);

  const firstName = user?.first_name || "Parent";
  const pendingItemsCount =
    (dashboardData?.pending_expenses_count || 0) +
    (dashboardData?.pending_agreements_count || 0) +
    (dashboardData?.unread_messages_count || 0);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: "300", color: colors.textSecondary }}>
                {getGreeting()},
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "700", color: colors.primary }}>
                {firstName}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: colors.surface,
                alignItems: "center", justifyContent: "center",
                shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
              }}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 12 }}>
            <SkeletonLoader variant="card" count={3} />
          </View>
        ) : (
          <>
            {/* ── Children Overview Strip ────────────────────────── */}
            {children && children.length > 0 && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {children.map((child) => {
                    const custody = custodyStatus?.children?.find((c) => c.child_id === child.id);
                    const withMe = custody?.with_current_user !== false;
                    return (
                      <TouchableOpacity
                        key={child.id}
                        style={{
                          alignItems: "center",
                          backgroundColor: colors.cardBackground,
                          borderRadius: 16, padding: 12, minWidth: 90,
                          borderWidth: 1, borderColor: withMe ? colors.primary + "40" : colors.cardBorder,
                        }}
                        onPress={() => {
                          if (familyFileId) {
                            router.push({
                              pathname: "/call/[sessionId]",
                              params: { sessionId: "new", recipientId: child.id, recipientType: "child", familyFileId, recipientName: child.first_name, callType: "video" },
                            });
                          }
                        }}
                      >
                        <Avatar name={`${child.first_name} ${child.last_name || ""}`} size={44} color={withMe ? colors.primary : colors.secondary} />
                        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginTop: 6 }}>
                          {child.first_name}
                        </Text>
                        <Badge
                          label={withMe ? "With You" : "Co-Parent"}
                          variant={withMe ? "success" : "default"}
                          size="sm"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Custody Status Cards (per child) ───────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}>
              {custodyStatus?.children && custodyStatus.children.length > 0 ? (
                custodyStatus.children.map((child) => (
                  <CustodyCard
                    key={child.child_id}
                    child={child}
                    coparentName={custodyStatus.coparent_name}
                    agreementActiveDays={custodyStatus.agreement_active_days}
                    onCheckIn={handleCheckIn}
                    checkingIn={checkingIn}
                  />
                ))
              ) : (
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar name={children?.[0]?.first_name || "Child"} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                        {children?.[0]?.first_name || "Your Children"}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textMuted }}>
                        Check in to start tracking custody
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={{
                      marginTop: 12, backgroundColor: colors.primary, borderRadius: 12,
                      paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                    onPress={handleCheckIn}
                    disabled={checkingIn}
                  >
                    {checkingIn ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                        <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600" }}>Check In</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Card>
              )}
            </View>

            {/* ── Action Stream ──────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              <SectionHeader title="Action Stream" />
              {pendingItemsCount > 0 ? (
                <Card padding={0}>
                  {/* Summary header */}
                  <View style={{ padding: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warningLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="alert-circle" size={24} color={colors.warning} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                        {pendingItemsCount} item{pendingItemsCount !== 1 ? "s" : ""} need attention
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.textMuted }}>Tap to review pending items</Text>
                    </View>
                  </View>

                  {(dashboardData?.unread_messages_count || 0) > 0 && (
                    <ActionRow icon="chatbubble" label={`${dashboardData?.unread_messages_count} unread message${dashboardData?.unread_messages_count !== 1 ? "s" : ""}`} onPress={() => router.push("/(tabs)/messages")} />
                  )}
                  {(dashboardData?.pending_expenses_count || 0) > 0 && (
                    <ActionRow icon="wallet" label={`${dashboardData?.pending_expenses_count} pending expense${dashboardData?.pending_expenses_count !== 1 ? "s" : ""}`} onPress={() => router.push("/expenses")} />
                  )}
                  {(dashboardData?.pending_agreements_count || 0) > 0 && (
                    <ActionRow icon="document-text" label={`${dashboardData?.pending_agreements_count} agreement${dashboardData?.pending_agreements_count !== 1 ? "s" : ""} need approval`} onPress={() => router.push("/agreements")} />
                  )}
                </Card>
              ) : (
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.successLight, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>All caught up!</Text>
                      <Text style={{ fontSize: 14, color: colors.textMuted }}>No pending items to review</Text>
                    </View>
                  </View>
                </Card>
              )}
            </View>

            {/* ── Coming Up ──────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              <SectionHeader title="Coming Up" action={() => router.push("/(tabs)/schedule")} actionLabel="View all" />
              <Card padding={0}>
                {dashboardData?.upcoming_events && dashboardData.upcoming_events.length > 0 ? (
                  dashboardData.upcoming_events.slice(0, 4).map((event, index) => {
                    const timeBadge = formatTimeBadge(event.start_time);
                    const isExchange = event.is_exchange;
                    const evtColor = isExchange ? colors.accent : getEventColor(event.event_category);

                    return (
                      <TouchableOpacity
                        key={event.id}
                        style={{
                          flexDirection: "row", alignItems: "center", padding: 16,
                          borderBottomWidth: index < 3 ? 1 : 0, borderBottomColor: colors.divider,
                        }}
                        onPress={() => router.push("/(tabs)/schedule")}
                      >
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: evtColor + "18", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={isExchange ? "location" : getEventIcon(event.event_category)} size={20} color={evtColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}>{event.title}</Text>
                          <Text style={{ fontSize: 13, color: colors.textMuted }}>
                            {format(new Date(event.start_time), "h:mm a")}
                            {event.child_names?.length ? ` \u00B7 ${event.child_names[0]}` : ""}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignItems: "center", minWidth: 50 }}>
                          <Text style={{ color: colors.textInverse, fontSize: 12, fontWeight: "700" }}>{timeBadge.text}</Text>
                          <Text style={{ color: colors.textInverse + "AA", fontSize: 10 }}>{timeBadge.subtext}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={{ padding: 32, alignItems: "center" }}>
                    <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                    <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>No upcoming events</Text>
                  </View>
                )}
              </Card>
            </View>

            {/* ── Quick Actions ───────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              <SectionHeader title="Quick Actions" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <QuickAction icon="chatbubble" label="Message" color={colors.primary} onPress={() => router.push("/(tabs)/messages")} />
                <QuickAction icon="calendar-outline" label="New Event" color="#3B82F6" onPress={() => router.push("/events/create")} />
                <QuickAction
                  icon="swap-horizontal"
                  label="Swap"
                  color={colors.accent}
                  onPress={() => router.push("/(tabs)/schedule")}
                />
                <QuickAction icon="wallet-outline" label="Expense" color="#8B5CF6" onPress={() => router.push("/expenses")} />
                <QuickAction
                  icon="videocam"
                  label="Call Child"
                  color="#06B6D4"
                  onPress={() => {
                    if (children?.[0]?.id && familyFileId) {
                      router.push({
                        pathname: "/call/[sessionId]",
                        params: { sessionId: "new", recipientId: children[0].id, recipientType: "child", familyFileId, recipientName: children[0].first_name, callType: "video" },
                      });
                    }
                  }}
                />
                <QuickAction icon="document-text-outline" label="Agreement" color={colors.secondary} onPress={() => router.push("/agreements")} />
              </View>
            </View>

            {/* ── Family Files ────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              <SectionHeader title="Family Files" action={() => router.push("/(tabs)/files")} actionLabel="View all" />
              <Card onPress={() => router.push(familyFile?.id ? `/(tabs)/files/${familyFile.id}` : "/(tabs)/files")}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Avatar name={familyFile?.family_name || "Family"} size={48} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>
                      {familyFile?.title || familyFile?.family_name || "My Family"}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>
                      {children?.length || 0} children
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Card>
            </View>

            {/* ── Recent Activity ─────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
              <SectionHeader title="Recent Activity" action={() => router.push("/activity")} actionLabel="See all" />
              <Card padding={0}>
                {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
                  dashboardData.recent_activities.slice(0, 5).map((activity, index) => (
                    <View
                      key={activity.id}
                      style={{
                        flexDirection: "row", alignItems: "center", padding: 14,
                        borderBottomWidth: index < 4 ? 1 : 0, borderBottomColor: colors.divider,
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons
                          name={activity.activity_type.includes("message") ? "chatbubble-outline" : "notifications-outline"}
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: colors.textPrimary }}>{activity.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{formatActivityTime(activity.created_at)}</Text>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 32, alignItems: "center" }}>
                    <Ionicons name="time-outline" size={32} color={colors.textMuted} />
                    <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>No recent activity</Text>
                  </View>
                )}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────

function CustodyCard({
  child,
  coparentName,
  agreementActiveDays,
  onCheckIn,
  checkingIn,
}: {
  child: ChildCustodyStatus;
  coparentName?: string;
  agreementActiveDays?: number;
  onCheckIn: () => void;
  checkingIn: boolean;
}) {
  const { colors } = useTheme();
  const withMe = child.with_current_user;
  const daysWithParent = child.days_with_current_parent ?? 0;
  const hoursRemaining = child.hours_remaining || 0;
  const daysUntilExchange = Math.floor(hoursRemaining / 24);
  const hoursUntilExchange = Math.round(hoursRemaining % 24);
  const progress = (child.progress_percentage || 0) / 100;
  const formattedTime = child.next_exchange_time ? format(new Date(child.next_exchange_time), "EEEE h:mm a") : "";

  return (
    <Card style={{ borderLeftWidth: 4, borderLeftColor: withMe ? colors.primary : colors.secondary }}>
      {/* Child Info */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Avatar name={`${child.child_first_name} ${child.child_last_name || ""}`} size={44} color={withMe ? colors.primary : colors.secondary} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary }}>{child.child_first_name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <Badge label={withMe ? "With You" : `With ${coparentName || "Co-parent"}`} variant={withMe ? "success" : "default"} size="sm" />
            {daysWithParent > 0 && (
              <Badge label={`Day ${daysWithParent}`} variant="accent" size="sm" />
            )}
          </View>
        </View>
      </View>

      {child.needs_initial_checkin ? (
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary, borderRadius: 12,
            paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          onPress={onCheckIn}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
              <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600" }}>Check In - Child is With Me</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <>
          {/* Next Exchange */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: child.next_action === "dropoff" ? colors.danger : colors.primary }}>
              {child.next_action === "dropoff" ? "Drop off" : "Pick up"}{" "}
              <Text style={{ color: colors.textSecondary, fontWeight: "400" }}>
                {formattedTime || "No exchange scheduled"}
              </Text>
            </Text>
            {child.next_exchange_location && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{child.next_exchange_location}</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ height: 6, backgroundColor: colors.primary + "25", borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {formattedTime ? (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {daysUntilExchange}d {hoursUntilExchange}h until exchange
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: colors.textMuted }}>No upcoming exchange</Text>
            )}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: colors.primaryLight, borderRadius: 8 }}
              onPress={onCheckIn}
              disabled={checkingIn}
            >
              <Ionicons name="hand-left" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500" }}>With Me</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Agreement Days */}
      {agreementActiveDays !== undefined && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Agreement active</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
            {agreementActiveDays} day{agreementActiveDays !== 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </Card>
  );
}

function ActionRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={{ padding: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.divider }}
      onPress={onPress}
    >
      <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 12 }} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.textPrimary }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={{
        alignItems: "center", width: "30%", paddingVertical: 16,
        backgroundColor: colors.cardBackground, borderRadius: 16,
        borderWidth: 1, borderColor: colors.cardBorder,
      }}
      onPress={onPress}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 14, backgroundColor: color + "15",
        alignItems: "center", justifyContent: "center", marginBottom: 8,
      }}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textSecondary }}>{label}</Text>
    </TouchableOpacity>
  );
}

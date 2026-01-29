/**
 * Dashboard Screen - Matching Web Portal Design
 * Clean, card-based layout with custody status, action stream, and quick actions
 */

import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useState, useCallback, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow, differenceInDays, differenceInHours, format, isToday, isTomorrow } from "date-fns";

import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { parent, type ActivityFeedItem } from "@commonground/api-client";

// CommonGround Design System Colors - Matching Web Portal
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";
const AMBER = "#D4A574";
const SAND = "#F5F0E8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";
const RED = "#DC2626";

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
  recent_activities: ActivityFeedItem[];
  unread_activity_count: number;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { familyFile, children, coParent, isLoading, refresh } = useFamilyFile();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [nextExchange, setNextExchange] = useState<UpcomingEvent | null>(null);

  const familyFileId = user?.family_file_id || familyFile?.id;

  // Get time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!familyFileId) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/dashboard/summary/${familyFileId}`,
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);

        // Find next exchange from upcoming events
        const exchange = data.upcoming_events?.find((e: UpcomingEvent) => e.is_exchange);
        setNextExchange(exchange || null);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
      // Demo data
      setDashboardData({
        pending_expenses_count: 0,
        unread_messages_count: 0,
        pending_agreements_count: 0,
        active_quick_accords_count: 0,
        upcoming_events: [],
        recent_activities: [],
        unread_activity_count: 0,
      });
    }
  }, [familyFileId]);

  // Helper to get token
  const getToken = async () => {
    const SecureStore = await import("expo-secure-store");
    return SecureStore.getItemAsync("auth_token");
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchDashboard()]);
    setRefreshing(false);
  }, [refresh, fetchDashboard]);

  // Format relative time badge
  const formatTimeBadge = (dateString: string): { text: string; subtext: string } => {
    const date = new Date(dateString);
    const now = new Date();
    const hoursUntil = differenceInHours(date, now);
    const daysUntil = differenceInDays(date, now);

    if (hoursUntil < 24) {
      return { text: `${hoursUntil}h`, subtext: isToday(date) ? "Today" : "Tomorrow" };
    }
    if (daysUntil < 7) {
      return { text: `${daysUntil}d`, subtext: format(date, "EEE") };
    }
    return { text: `${daysUntil}d`, subtext: format(date, "MMM d") };
  };

  // Calculate exchange countdown
  const getExchangeCountdown = () => {
    if (!nextExchange) return null;
    const exchangeDate = new Date(nextExchange.start_time);
    const now = new Date();
    const totalMs = exchangeDate.getTime() - now.getTime();

    if (totalMs <= 0) return null;

    const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Assume 7 day custody cycle for progress
    const totalCycleMs = 7 * 24 * 60 * 60 * 1000;
    const progress = Math.max(0, Math.min(1, 1 - (totalMs / totalCycleMs)));

    return {
      days,
      hours,
      progress,
      formattedTime: format(exchangeDate, "EEEE h:mm a"),
      isDropoff: nextExchange.viewer_role === "dropoff",
    };
  };

  const firstName = user?.first_name || "Parent";
  const childName = children?.[0]?.first_name || "Child";
  const countdown = getExchangeCountdown();
  const pendingItemsCount =
    (dashboardData?.pending_expenses_count || 0) +
    (dashboardData?.pending_agreements_count || 0) +
    (dashboardData?.unread_messages_count || 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SAGE}
          />
        }
      >
        {/* Header with Greeting and Settings */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: "300", color: SLATE }}>
                {getGreeting()},
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "600", color: SAGE }}>
                {firstName}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: WHITE,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={22} color={SLATE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custody Status Card */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{
            backgroundColor: SAGE_LIGHT,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: `${SAGE}20`,
          }}>
            {/* Child Info Row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: SAGE,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: WHITE, fontWeight: "600", fontSize: 18 }}>
                  {childName.charAt(0)}
                </Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
                  {childName}
                </Text>
                <Text style={{ fontSize: 14, color: SAGE, fontWeight: "500" }}>
                  With You
                </Text>
              </View>
            </View>

            {/* Next Exchange Info */}
            {countdown && (
              <>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: countdown.isDropoff ? RED : SAGE, fontWeight: "600" }}>
                    {countdown.isDropoff ? "Drop off" : "Pick up"}{" "}
                    <Text style={{ color: SLATE, fontWeight: "400" }}>
                      {countdown.formattedTime}
                    </Text>
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={{ marginBottom: 8 }}>
                  <View style={{
                    height: 6,
                    backgroundColor: `${SAGE}30`,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}>
                    <View style={{
                      height: "100%",
                      width: `${countdown.progress * 100}%`,
                      backgroundColor: SAGE,
                      borderRadius: 3,
                    }}>
                      {/* Progress indicator dot */}
                      <View style={{
                        position: "absolute",
                        right: -4,
                        top: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: SAGE,
                        borderWidth: 2,
                        borderColor: WHITE,
                      }} />
                    </View>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: SLATE_LIGHT }}>
                  {countdown.days} days, {countdown.hours} hours remaining
                </Text>
              </>
            )}

            {/* Days Since Agreement */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: `${SAGE}20`,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: SAGE,
                  marginRight: 8,
                }} />
                <Text style={{ fontSize: 14, color: SLATE }}>
                  Days since agreement active
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: SAGE, fontWeight: "600" }}>
                1 <Text style={{ fontWeight: "400", color: SLATE_LIGHT }}>days</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Action Stream */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 12 }}>
            Action Stream
          </Text>
          <View style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons
                name={pendingItemsCount > 0 ? "alert-circle" : "checkmark-circle"}
                size={24}
                color={SAGE}
              />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: SLATE }}>
                {pendingItemsCount > 0 ? `${pendingItemsCount} items need attention` : "All caught up!"}
              </Text>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                {pendingItemsCount > 0 ? "Tap to review pending items" : "No pending items to review"}
              </Text>
            </View>
          </View>
        </View>

        {/* Coming Up */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 12 }}>
            Coming Up
          </Text>
          <View style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {dashboardData?.upcoming_events && dashboardData.upcoming_events.length > 0 ? (
              dashboardData.upcoming_events.slice(0, 4).map((event, index) => {
                const timeBadge = formatTimeBadge(event.start_time);
                const isExchange = event.is_exchange;

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderBottomWidth: index < 3 ? 1 : 0,
                      borderBottomColor: SAND,
                    }}
                    onPress={() => router.push("/(tabs)/schedule")}
                  >
                    {/* Event Icon */}
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: isExchange ? `${AMBER}20` : SAGE_LIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons
                        name={isExchange ? "location" : getEventIcon(event.event_category)}
                        size={20}
                        color={isExchange ? AMBER : SAGE}
                      />
                    </View>

                    {/* Event Details */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: SLATE }}>
                        {event.title}
                      </Text>
                      <Text style={{ fontSize: 13, color: SLATE_LIGHT }}>
                        {format(new Date(event.start_time), "h:mm a")}
                        {event.child_names?.length ? ` • ${event.child_names[0]}` : ""}
                        {event.other_parent_name ? ` • with ${event.other_parent_name}` : ""}
                      </Text>
                    </View>

                    {/* Time Badge */}
                    <View style={{
                      backgroundColor: SAGE,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      alignItems: "center",
                      minWidth: 50,
                    }}>
                      <Text style={{ color: WHITE, fontSize: 12, fontWeight: "700" }}>
                        {timeBadge.text}
                      </Text>
                      <Text style={{ color: `${WHITE}AA`, fontSize: 10 }}>
                        {timeBadge.subtext}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={32} color={SLATE_LIGHT} />
                <Text style={{ fontSize: 14, color: SLATE_LIGHT, marginTop: 8 }}>
                  No upcoming events
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <QuickActionCircle
              icon="videocam"
              label="Call Child"
              color="#8b5cf6"
              onPress={() => {
                if (children?.[0]?.id && familyFileId) {
                  router.push({
                    pathname: "/call/[sessionId]",
                    params: {
                      sessionId: "new",
                      recipientId: children[0].id,
                      recipientType: "child",
                      familyFileId: familyFileId,
                      recipientName: children[0].first_name,
                      callType: "video",
                    },
                  });
                }
              }}
            />
            <QuickActionCircle
              icon="chatbubble"
              label="Message"
              onPress={() => router.push("/(tabs)/messages")}
            />
            <QuickActionCircle
              icon="calendar"
              label="Schedule"
              onPress={() => router.push("/(tabs)/schedule")}
            />
            <QuickActionCircle
              icon="wallet"
              label="Expense"
              onPress={() => router.push("/expenses")}
            />
          </View>
        </View>

        {/* Family Files */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
              Family Files
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/files")}>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                View all <Ionicons name="chevron-forward" size={14} />
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: WHITE,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => router.push(familyFile?.id ? `/(tabs)/files/${familyFile.id}` : "/(tabs)/files")}
          >
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: SAGE,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="people" size={24} color={WHITE} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: SLATE }}>
                {familyFile?.title || familyFile?.family_name || "My Family"}
              </Text>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                {children?.length || 0} children
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={SLATE_LIGHT} />
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
              Recent Activity
            </Text>
          </View>
          <View style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
              <>
                {dashboardData.recent_activities.slice(0, 5).map((activity, index) => (
                  <View
                    key={activity.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: index < 4 ? 1 : 0,
                      borderBottomColor: SAND,
                    }}
                  >
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: SAGE_LIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons
                        name={activity.icon === "message" ? "chatbubble-outline" : "notifications-outline"}
                        size={16}
                        color={SAGE}
                      />
                    </View>
                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: SLATE }}>
                      {activity.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: SLATE_LIGHT }}>
                      {formatActivityTime(activity.created_at)}
                    </Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={{ padding: 14, alignItems: "center" }}
                  onPress={() => router.push("/activity")}
                >
                  <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                    See all activity <Ionicons name="chevron-forward" size={14} />
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 32, alignItems: "center" }}>
                <Ionicons name="time-outline" size={32} color={SLATE_LIGHT} />
                <Text style={{ fontSize: 14, color: SLATE_LIGHT, marginTop: 8 }}>
                  No recent activity
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Quick Action Circle Button (matching web design)
function QuickActionCircle({
  icon,
  label,
  color,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  const bgColor = color || SAGE;
  return (
    <TouchableOpacity
      style={{ alignItems: "center", width: 70 }}
      onPress={onPress}
    >
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
        shadowColor: bgColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Ionicons name={icon} size={24} color={WHITE} />
      </View>
      <Text style={{ fontSize: 12, color: SLATE, fontWeight: "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Helper function to get event icon
function getEventIcon(category?: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
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
  return iconMap[category || "other"] || "calendar";
}

// Format activity time
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

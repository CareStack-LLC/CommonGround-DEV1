import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

// Backend status values differ from mobile display statuses
type BackendAccordStatus = "draft" | "pending" | "approved" | "completed" | "revoked" | "expired" | "pending_approval" | "active";
type DisplayAccordStatus = "draft" | "pending_approval" | "active" | "completed" | "revoked" | "expired";

// Map backend status to mobile display status
function mapAccordStatus(backendStatus: BackendAccordStatus): DisplayAccordStatus {
  switch (backendStatus) {
    case "pending":
      return "pending_approval";
    case "approved":
      return "active";
    default:
      return backendStatus as DisplayAccordStatus;
  }
}

interface QuickAccord {
  id: string;
  accord_number: string;
  title: string;
  purpose_category: string;
  purpose_description?: string;
  status: BackendAccordStatus;
  is_single_event: boolean;
  event_date?: string;
  start_date?: string;
  end_date?: string;
  initiated_by: string;
  parent_a_approved: boolean;
  parent_b_approved: boolean;
  created_at: string;
}

interface FamilyFile {
  id: string;
  family_name: string;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  travel: "airplane",
  schedule_swap: "swap-horizontal",
  special_event: "star",
  overnight: "moon",
  expense: "wallet",
  other: "document-text",
};

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  schedule_swap: "Schedule Swap",
  special_event: "Special Event",
  overnight: "Overnight",
  expense: "Expense",
  other: "Other",
};

// STATUS_COLORS moved inside component to access theme colors

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Awaiting Approval",
  active: "Active",
  completed: "Completed",
  revoked: "Revoked",
  expired: "Expired",
};

export default function QuickAccordsScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();

  const STATUS_COLORS: Record<string, string> = {
    draft: colors.secondary,
    pending_approval: colors.accent,
    active: colors.primary,
    completed: "#22C55E",
    revoked: "#EF4444",
    expired: "#9CA3AF",
  };
  const [accords, setAccords] = useState<QuickAccord[]>([]);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "past">("active");

  const fetchFamilyFiles = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const files = data.items || data || [];
        setFamilyFiles(files);
        if (files.length > 0 && !selectedFamilyId) {
          setSelectedFamilyId(files[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching family files:", error);
    }
  };

  const fetchAccords = async () => {
    if (!selectedFamilyId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/family-file/${selectedFamilyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAccords(data.items || data || []);
      }
    } catch (error) {
      console.error("Error fetching accords:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFamilyFiles();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      setLoading(true);
      fetchAccords();
    }
  }, [selectedFamilyId]);

  useFocusEffect(
    useCallback(() => {
      if (selectedFamilyId) {
        fetchAccords();
      }
    }, [selectedFamilyId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccords();
  };

  const filteredAccords = accords.filter((accord) => {
    const displayStatus = mapAccordStatus(accord.status);
    switch (activeTab) {
      case "active":
        return displayStatus === "active";
      case "pending":
        return displayStatus === "draft" || displayStatus === "pending_approval";
      case "past":
        return ["completed", "revoked", "expired"].includes(displayStatus);
      default:
        return true;
    }
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && familyFiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.surfaceElevated }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.secondary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (familyFiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.surfaceElevated }}>
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: colors.backgroundSecondary }}
        >
          <Ionicons name="folder-outline" size={40} color={colors.primary} />
        </View>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.secondary }}>
          No Family File
        </Text>
        <Text className="text-center mb-6" style={{ color: colors.secondary }}>
          Create a family file first to start using Quick Accords.
        </Text>
        <TouchableOpacity
          className="px-6 py-3 rounded-xl"
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.push("/family/create")}
        >
          <Text className="text-white font-semibold">Create Family File</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      {/* Family File Selector */}
      {familyFiles.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-14 border-b"
          style={{ borderBottomColor: colors.backgroundSecondary }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          {familyFiles.map((file) => (
            <TouchableOpacity
              key={file.id}
              className="px-4 py-2 rounded-full mr-2"
              style={{
                backgroundColor: selectedFamilyId === file.id ? colors.primary : colors.backgroundSecondary,
              }}
              onPress={() => setSelectedFamilyId(file.id)}
            >
              <Text
                className="font-medium"
                style={{ color: selectedFamilyId === file.id ? "white" : colors.secondary }}
              >
                {file.family_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Bar */}
      <View className="flex-row px-4 py-3 border-b" style={{ borderBottomColor: colors.backgroundSecondary }}>
        {(["active", "pending", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            className="flex-1 py-2 items-center rounded-lg mx-1"
            style={{ backgroundColor: activeTab === tab ? colors.primary : "transparent" }}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className="font-medium capitalize"
              style={{ color: activeTab === tab ? "white" : colors.secondary }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Accords List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Info Box */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.backgroundSecondary }}>
          <View className="flex-row items-start">
            <Ionicons name="flash" size={20} color={colors.primary} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                Quick Accords
              </Text>
              <Text className="text-sm" style={{ color: colors.secondary }}>
                Lightweight agreements for schedule swaps, travel, special events, and one-off arrangements.
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredAccords.length === 0 ? (
          <View className="items-center py-12">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.backgroundSecondary }}
            >
              <Ionicons
                name={activeTab === "active" ? "checkmark-circle-outline" : "document-text-outline"}
                size={32}
                color={colors.primary}
              />
            </View>
            <Text className="text-lg font-medium mb-1" style={{ color: colors.secondary }}>
              {activeTab === "active"
                ? "No Active Accords"
                : activeTab === "pending"
                  ? "No Pending Accords"
                  : "No Past Accords"}
            </Text>
            <Text className="text-center" style={{ color: colors.secondary }}>
              {activeTab === "active"
                ? "Create a Quick Accord to handle schedule changes or special arrangements."
                : activeTab === "pending"
                  ? "Accords awaiting approval will appear here."
                  : "Completed and expired accords will appear here."}
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredAccords.map((accord) => {
              const displayStatus = mapAccordStatus(accord.status);
              return (
                <TouchableOpacity
                  key={accord.id}
                  className="rounded-xl p-4"
                  style={{ backgroundColor: colors.background }}
                  onPress={() => router.push(`/accords/${accord.id}?familyId=${selectedFamilyId}`)}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${colors.primary}20` }}
                      >
                        <Ionicons
                          name={CATEGORY_ICONS[accord.purpose_category] || "document-text"}
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold" style={{ color: colors.secondary }}>
                          {accord.title}
                        </Text>
                        <Text className="text-sm" style={{ color: colors.secondary }}>
                          {CATEGORY_LABELS[accord.purpose_category] || accord.purpose_category}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${STATUS_COLORS[displayStatus]}20` }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: STATUS_COLORS[displayStatus] }}
                      >
                        {STATUS_LABELS[displayStatus]}
                      </Text>
                    </View>
                  </View>

                  {/* Date Info */}
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
                    <Text className="ml-2 text-sm" style={{ color: colors.secondary }}>
                      {accord.is_single_event
                        ? accord.event_date
                          ? formatDate(accord.event_date)
                          : "Date TBD"
                        : accord.start_date && accord.end_date
                          ? `${formatDate(accord.start_date)} - ${formatDate(accord.end_date)}`
                          : "Dates TBD"}
                    </Text>
                  </View>

                  {/* Approval Status */}
                  {displayStatus === "pending_approval" && (
                    <View className="flex-row items-center mt-2 pt-2 border-t" style={{ borderTopColor: colors.backgroundSecondary }}>
                      <View className="flex-row items-center mr-4">
                        <Ionicons
                          name={accord.parent_a_approved ? "checkmark-circle" : "ellipse-outline"}
                          size={16}
                          color={accord.parent_a_approved ? colors.primary : colors.secondary}
                        />
                        <Text className="ml-1 text-xs" style={{ color: colors.secondary }}>
                          Parent A
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons
                          name={accord.parent_b_approved ? "checkmark-circle" : "ellipse-outline"}
                          size={16}
                          color={accord.parent_b_approved ? colors.primary : colors.secondary}
                        />
                        <Text className="ml-1 text-xs" style={{ color: colors.secondary }}>
                          Parent B
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Accord Number */}
                  <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                    {accord.accord_number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create New Accord */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.primary }}
        onPress={() => router.push(`/accords/create?familyId=${selectedFamilyId}`)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

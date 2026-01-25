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

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  slateDark: "#334155",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

interface QuickAccord {
  id: string;
  accord_number: string;
  title: string;
  purpose_category: string;
  purpose_description?: string;
  status: "draft" | "pending_approval" | "active" | "completed" | "revoked" | "expired";
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

const STATUS_COLORS: Record<string, string> = {
  draft: colors.slate,
  pending_approval: colors.amber,
  active: colors.sage,
  completed: "#22C55E",
  revoked: "#EF4444",
  expired: "#9CA3AF",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Awaiting Approval",
  active: "Active",
  completed: "Completed",
  revoked: "Revoked",
  expired: "Expired",
};

export default function QuickAccordsScreen() {
  const { token } = useAuth();
  const [accords, setAccords] = useState<QuickAccord[]>([]);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "past">("active");

  const fetchFamilyFiles = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/family-files`,
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
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/quick-accords/family-file/${selectedFamilyId}`,
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
    switch (activeTab) {
      case "active":
        return accord.status === "active";
      case "pending":
        return accord.status === "draft" || accord.status === "pending_approval";
      case "past":
        return ["completed", "revoked", "expired"].includes(accord.status);
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
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (familyFiles.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.cream }}>
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: colors.sand }}
        >
          <Ionicons name="folder-outline" size={40} color={colors.sage} />
        </View>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.slate }}>
          No Family File
        </Text>
        <Text className="text-center mb-6" style={{ color: colors.slate }}>
          Create a family file first to start using Quick Accords.
        </Text>
        <TouchableOpacity
          className="px-6 py-3 rounded-xl"
          style={{ backgroundColor: colors.sage }}
          onPress={() => router.push("/family/create")}
        >
          <Text className="text-white font-semibold">Create Family File</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      {/* Family File Selector */}
      {familyFiles.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-14 border-b"
          style={{ borderBottomColor: colors.sand }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          {familyFiles.map((file) => (
            <TouchableOpacity
              key={file.id}
              className="px-4 py-2 rounded-full mr-2"
              style={{
                backgroundColor: selectedFamilyId === file.id ? colors.sage : colors.sand,
              }}
              onPress={() => setSelectedFamilyId(file.id)}
            >
              <Text
                className="font-medium"
                style={{ color: selectedFamilyId === file.id ? "white" : colors.slate }}
              >
                {file.family_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Bar */}
      <View className="flex-row px-4 py-3 border-b" style={{ borderBottomColor: colors.sand }}>
        {(["active", "pending", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            className="flex-1 py-2 items-center rounded-lg mx-1"
            style={{ backgroundColor: activeTab === tab ? colors.sage : "transparent" }}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className="font-medium capitalize"
              style={{ color: activeTab === tab ? "white" : colors.slate }}
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
            tintColor={colors.sage}
          />
        }
      >
        {/* Info Box */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.sand }}>
          <View className="flex-row items-start">
            <Ionicons name="flash" size={20} color={colors.sage} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.slate }}>
                Quick Accords
              </Text>
              <Text className="text-sm" style={{ color: colors.slate }}>
                Lightweight agreements for schedule swaps, travel, special events, and one-off arrangements.
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={colors.sage} />
          </View>
        ) : filteredAccords.length === 0 ? (
          <View className="items-center py-12">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.sand }}
            >
              <Ionicons
                name={activeTab === "active" ? "checkmark-circle-outline" : "document-text-outline"}
                size={32}
                color={colors.sage}
              />
            </View>
            <Text className="text-lg font-medium mb-1" style={{ color: colors.slate }}>
              {activeTab === "active"
                ? "No Active Accords"
                : activeTab === "pending"
                  ? "No Pending Accords"
                  : "No Past Accords"}
            </Text>
            <Text className="text-center" style={{ color: colors.slate }}>
              {activeTab === "active"
                ? "Create a Quick Accord to handle schedule changes or special arrangements."
                : activeTab === "pending"
                  ? "Accords awaiting approval will appear here."
                  : "Completed and expired accords will appear here."}
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredAccords.map((accord) => (
              <TouchableOpacity
                key={accord.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: "white" }}
                onPress={() => router.push(`/accords/${accord.id}?familyId=${selectedFamilyId}`)}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: `${colors.sage}20` }}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[accord.purpose_category] || "document-text"}
                        size={20}
                        color={colors.sage}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold" style={{ color: colors.slate }}>
                        {accord.title}
                      </Text>
                      <Text className="text-sm" style={{ color: colors.slate }}>
                        {CATEGORY_LABELS[accord.purpose_category] || accord.purpose_category}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${STATUS_COLORS[accord.status]}20` }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: STATUS_COLORS[accord.status] }}
                    >
                      {STATUS_LABELS[accord.status]}
                    </Text>
                  </View>
                </View>

                {/* Date Info */}
                <View className="flex-row items-center mt-2">
                  <Ionicons name="calendar-outline" size={14} color={colors.slate} />
                  <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
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
                {accord.status === "pending_approval" && (
                  <View className="flex-row items-center mt-2 pt-2 border-t" style={{ borderTopColor: colors.sand }}>
                    <View className="flex-row items-center mr-4">
                      <Ionicons
                        name={accord.parent_a_approved ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={accord.parent_a_approved ? colors.sage : colors.slate}
                      />
                      <Text className="ml-1 text-xs" style={{ color: colors.slate }}>
                        Parent A
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={accord.parent_b_approved ? "checkmark-circle" : "ellipse-outline"}
                        size={16}
                        color={accord.parent_b_approved ? colors.sage : colors.slate}
                      />
                      <Text className="ml-1 text-xs" style={{ color: colors.slate }}>
                        Parent B
                      </Text>
                    </View>
                  </View>
                )}

                {/* Accord Number */}
                <Text className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                  {accord.accord_number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create New Accord */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.sage }}
        onPress={() => router.push(`/accords/create?familyId=${selectedFamilyId}`)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

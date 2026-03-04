import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { BottomNavBar } from "@/components/BottomNavBar";

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
  child_ids?: string[];
  location?: string;
  pickup_responsibility?: string;
  dropoff_responsibility?: string;
  transportation_notes?: string;
  has_shared_expense: boolean;
  estimated_amount?: number;
  expense_category?: string;
  receipt_required?: boolean;
  parent_a_approved: boolean;
  parent_a_approved_at?: string;
  parent_b_approved: boolean;
  parent_b_approved_at?: string;
  ai_summary?: string;
  initiated_by: string;
  created_at: string;
  family_file?: {
    id: string;
    family_name: string;
    parent_a?: { id: string; first_name: string; last_name: string };
    parent_b?: { id: string; first_name: string; last_name: string };
  };
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

export default function QuickAccordDetailScreen() {
  const { id, familyId } = useLocalSearchParams<{ id: string; familyId: string }>();
  const { token, user } = useAuth();
  const [accord, setAccord] = useState<QuickAccord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchAccord = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAccord(data);
      } else {
        Alert.alert("Error", "Failed to load accord details.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching accord:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccord();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccord();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Check if current user is initiator or needs to approve
  const isInitiator = accord?.initiated_by === user?.id;
  // Determine if user is Parent A - check family_file first, then use initiator as fallback
  const isParentA = accord?.family_file?.parent_a?.id === user?.id ||
    (accord?.initiated_by === user?.id && !accord?.family_file);
  const needsMyApproval =
    accord?.status === "pending_approval" &&
    ((isParentA && !accord.parent_a_approved) ||
      (!isParentA && !accord.parent_b_approved));

  const canSubmit = accord?.status === "draft" && isInitiator;
  const canRevoke = (accord?.status === "active" || accord?.status === "pending_approval");
  const canComplete = accord?.status === "active";
  const canDelete = accord?.status === "draft" && isInitiator;

  // Submit for approval
  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        Alert.alert("Submitted", "Your Quick Accord has been submitted for approval.");
        fetchAccord();
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to submit.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ approved: true }),
        }
      );

      if (response.ok) {
        Alert.alert("Approved", "You have approved this Quick Accord.");
        fetchAccord();
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to approve.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject
  const handleReject = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved: false,
            notes: rejectReason || undefined,
          }),
        }
      );

      if (response.ok) {
        Alert.alert("Declined", "You have declined this Quick Accord.");
        setShowRejectModal(false);
        setRejectReason("");
        fetchAccord();
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to decline.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke
  const handleRevoke = async () => {
    Alert.alert(
      "Revoke Accord",
      "Are you sure you want to revoke this Quick Accord? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}/revoke`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                Alert.alert("Revoked", "This Quick Accord has been revoked.");
                fetchAccord();
              } else {
                const error = await response.json();
                Alert.alert("Error", error.message || "Failed to revoke.");
              }
            } catch (error) {
              Alert.alert("Error", "An unexpected error occurred.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Mark Complete
  const handleComplete = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/quick-accords/${id}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        Alert.alert("Completed", "This Quick Accord has been marked as completed.");
        fetchAccord();
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to complete.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Menu options
  const showMenu = () => {
    Alert.alert(
      "Accord Options",
      undefined,
      [
        ...(canComplete ? [{ text: "Mark Complete", onPress: handleComplete }] : []),
        ...(canRevoke ? [{ text: "Revoke Accord", onPress: handleRevoke, style: "destructive" as const }] : []),
        { text: "Settings", onPress: () => router.push("/settings") },
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>Loading accord...</Text>
      </SafeAreaView>
    );
  }

  if (!accord) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <Text style={{ color: colors.slate }}>Accord not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["top", "bottom"]}>
      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.sand,
          backgroundColor: "white",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center" }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.sage} />
          <Text style={{ color: colors.sage, fontSize: 16, marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: colors.slate }}>
          Quick Accord
        </Text>
        <TouchableOpacity onPress={showMenu} style={{ padding: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.slate} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        {/* Header Card */}
        <View className="rounded-xl p-5 mb-4" style={{ backgroundColor: "white" }}>
          <View className="flex-row items-start mb-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center"
              style={{ backgroundColor: `${colors.sage}20` }}
            >
              <Ionicons
                name={CATEGORY_ICONS[accord.purpose_category] || "document-text"}
                size={28}
                color={colors.sage}
              />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-xl font-bold mb-1" style={{ color: colors.slate }}>
                {accord.title}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-sm" style={{ color: colors.slate }}>
                  {CATEGORY_LABELS[accord.purpose_category]}
                </Text>
                <View className="mx-2 w-1 h-1 rounded-full" style={{ backgroundColor: colors.slate }} />
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${STATUS_COLORS[accord.status]}20` }}
                >
                  <Text className="text-xs font-medium" style={{ color: STATUS_COLORS[accord.status] }}>
                    {STATUS_LABELS[accord.status]}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text className="text-xs" style={{ color: "#9CA3AF" }}>
            {accord.accord_number}
          </Text>
        </View>

        {/* Details Section */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.sand }}>
          <Text className="font-bold text-lg mb-3" style={{ color: colors.slate }}>
            Details
          </Text>

          {/* Date & Time */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-1" style={{ color: colors.slate }}>
              Date & Time
            </Text>
            <Text style={{ color: colors.slate }}>
              {accord.is_single_event
                ? accord.event_date
                  ? formatDate(accord.event_date)
                  : "Date to be determined"
                : accord.start_date && accord.end_date
                  ? `${formatDate(accord.start_date)} - ${formatDate(accord.end_date)}`
                  : "Dates to be determined"}
            </Text>
          </View>

          {/* Description */}
          {accord.purpose_description && (
            <View>
              <Text className="text-sm font-medium mb-1" style={{ color: colors.slate }}>
                Description
              </Text>
              <Text style={{ color: colors.slate }}>{accord.purpose_description}</Text>
            </View>
          )}

          {/* AI Summary */}
          {accord.ai_summary && (
            <View className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${colors.sage}15` }}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="sparkles" size={14} color={colors.sage} />
                <Text className="ml-2 text-sm font-medium" style={{ color: colors.sage }}>
                  ARIA Summary
                </Text>
              </View>
              <Text className="text-sm" style={{ color: colors.slate }}>{accord.ai_summary}</Text>
            </View>
          )}
        </View>

        {/* Logistics Section */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.sand }}>
          <Text className="font-bold text-lg mb-3" style={{ color: colors.slate }}>
            Logistics
          </Text>

          {(accord.location || accord.pickup_responsibility || accord.dropoff_responsibility || accord.transportation_notes) ? (
            <>
              {accord.location && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="location" size={18} color={colors.sage} />
                  <Text className="ml-3" style={{ color: colors.slate }}>
                    {accord.location}
                  </Text>
                </View>
              )}

              {accord.pickup_responsibility && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="arrow-up-circle" size={18} color={colors.amber} />
                  <Text className="ml-3" style={{ color: colors.slate }}>
                    Pickup: {accord.pickup_responsibility}
                  </Text>
                </View>
              )}

              {accord.dropoff_responsibility && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="arrow-down-circle" size={18} color={colors.amber} />
                  <Text className="ml-3" style={{ color: colors.slate }}>
                    Dropoff: {accord.dropoff_responsibility}
                  </Text>
                </View>
              )}

              {accord.transportation_notes && (
                <View className="p-3 rounded-lg" style={{ backgroundColor: "white" }}>
                  <Text className="text-sm" style={{ color: colors.slate }}>
                    {accord.transportation_notes}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: colors.slate }}>No logistics specified</Text>
          )}
        </View>

        {/* Expense Details */}
        {accord.has_shared_expense && (
          <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.sand }}>
            <Text className="font-bold text-lg mb-3" style={{ color: colors.slate }}>
              Shared Expense
            </Text>

            {accord.estimated_amount && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="cash" size={18} color={colors.sage} />
                <Text className="ml-3 font-medium" style={{ color: colors.slate }}>
                  {formatCurrency(accord.estimated_amount)}
                </Text>
              </View>
            )}

            {accord.expense_category && (
              <View className="flex-row items-center mb-3">
                <Ionicons name="pricetag" size={18} color={colors.amber} />
                <Text className="ml-3" style={{ color: colors.slate }}>
                  Category: {accord.expense_category}
                </Text>
              </View>
            )}

            {accord.receipt_required && (
              <View className="flex-row items-center">
                <Ionicons name="receipt" size={18} color={colors.slate} />
                <Text className="ml-3 text-sm" style={{ color: colors.slate }}>
                  Receipt required
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Approval Status */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: colors.sand }}>
          <Text className="font-bold text-lg mb-4" style={{ color: colors.slate }}>
            Approval Status
          </Text>

          <View className="space-y-3">
            {/* Parent A Card */}
            <View
              className="rounded-xl p-4 flex-row items-center"
              style={{ backgroundColor: `${colors.sage}15` }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: accord.parent_a_approved ? `${colors.sage}30` : "white" }}
              >
                <Ionicons
                  name={accord.parent_a_approved ? "checkmark-circle" : "time-outline"}
                  size={24}
                  color={accord.parent_a_approved ? colors.sage : colors.slate}
                />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-semibold" style={{ color: colors.slate }}>
                  {accord.family_file?.parent_a?.first_name || "Parent A"}
                  {isParentA && " (You)"}
                </Text>
                <Text className="text-sm" style={{ color: accord.parent_a_approved ? colors.sage : colors.slate }}>
                  {accord.parent_a_approved ? "Approved" : "Pending"}
                </Text>
              </View>
            </View>

            {/* Parent B Card */}
            <View
              className="rounded-xl p-4 flex-row items-center"
              style={{ backgroundColor: `${colors.sage}15` }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: accord.parent_b_approved ? `${colors.sage}30` : "white" }}
              >
                <Ionicons
                  name={accord.parent_b_approved ? "checkmark-circle" : "time-outline"}
                  size={24}
                  color={accord.parent_b_approved ? colors.sage : colors.slate}
                />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-semibold" style={{ color: colors.slate }}>
                  {accord.family_file?.parent_b?.first_name || "Parent B"}
                  {!isParentA && " (You)"}
                </Text>
                <Text className="text-sm" style={{ color: accord.parent_b_approved ? colors.sage : colors.slate }}>
                  {accord.parent_b_approved ? "Approved" : "Pending"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3 mb-6">
          {/* Approval Actions */}
          {needsMyApproval && (
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 py-4 rounded-xl items-center flex-row justify-center border-2"
                style={{ borderColor: "#EF4444" }}
                onPress={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text className="font-semibold ml-2" style={{ color: "#EF4444" }}>
                  Decline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                style={{ backgroundColor: colors.sage }}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text className="font-semibold text-white ml-2">Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Submit for Approval */}
          {canSubmit && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.sage }}
              onPress={handleSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text className="font-semibold text-white ml-2">Submit for Approval</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Mark Complete */}
          {canComplete && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: "#22C55E" }}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={20} color="white" />
                  <Text className="font-semibold text-white ml-2">Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Revoke */}
          {canRevoke && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center border-2"
              style={{ borderColor: "#EF4444" }}
              onPress={handleRevoke}
              disabled={actionLoading}
            >
              <Ionicons name="ban" size={20} color="#EF4444" />
              <Text className="font-semibold ml-2" style={{ color: "#EF4444" }}>
                Revoke Accord
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar />

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View className="w-full rounded-2xl p-6" style={{ backgroundColor: "white" }}>
            <Text className="text-xl font-bold mb-2" style={{ color: colors.slate }}>
              Decline Accord
            </Text>
            <Text className="mb-4" style={{ color: colors.slate }}>
              Would you like to provide a reason? (optional)
            </Text>

            <TextInput
              className="rounded-xl px-4 py-3 mb-4"
              style={{ backgroundColor: colors.sand, color: colors.slate, minHeight: 100 }}
              placeholder="Enter reason..."
              placeholderTextColor="#94a3b8"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              textAlignVertical="top"
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center border-2"
                style={{ borderColor: colors.sage }}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
              >
                <Text className="font-semibold" style={{ color: colors.sage }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: "#EF4444" }}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-semibold text-white">Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

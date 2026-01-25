import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

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

interface AgreementSection {
  id: string;
  section_number: number;
  section_title: string;
  section_type: string;
  content?: string;
  is_completed: boolean;
  display_order: number;
}

interface Agreement {
  id: string;
  agreement_number: string;
  title: string;
  agreement_type: string;
  agreement_version: string;
  status: "draft" | "pending_approval" | "active" | "superseded";
  petitioner_approved: boolean;
  petitioner_approved_at?: string;
  respondent_approved: boolean;
  respondent_approved_at?: string;
  effective_date?: string;
  court_ordered: boolean;
  sections?: AgreementSection[];
  completion_percentage?: number;
  created_at: string;
  family_file?: {
    id: string;
    family_name: string;
    parent_a?: { id: string; first_name: string; last_name: string };
    parent_b?: { id: string; first_name: string; last_name: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  draft: colors.slate,
  pending_approval: colors.amber,
  active: colors.sage,
  superseded: "#9CA3AF",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Awaiting Approval",
  active: "Active",
  superseded: "Superseded",
};

const SECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  introduction: "information-circle",
  parent_info: "people",
  children_info: "heart",
  physical_custody: "home",
  legal_custody: "shield",
  parenting_schedule: "calendar",
  holiday_schedule: "gift",
  child_support: "cash",
  exchange_logistics: "car",
  child_communication: "call",
  parent_communication: "chatbubbles",
  medical_healthcare: "medkit",
  education: "school",
  transportation: "bus",
  dispute_resolution: "hand-left",
  relocation: "airplane",
  other_provisions: "document-text",
};

export default function AgreementDetailScreen() {
  const { id, familyId } = useLocalSearchParams<{ id: string; familyId: string }>();
  const { token, user } = useAuth();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAgreement = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/agreements/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAgreement(data);
      } else {
        Alert.alert("Error", "Failed to load agreement.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching agreement:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgreement();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgreement();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Check user role
  const isParentA = agreement?.family_file?.parent_a?.id === user?.id;
  const needsMyApproval =
    agreement?.status === "pending_approval" &&
    ((isParentA && !agreement.petitioner_approved) ||
      (!isParentA && !agreement.respondent_approved));

  const canSubmit = agreement?.status === "draft" && (agreement.completion_percentage || 0) >= 50;
  const canActivate = agreement?.status === "pending_approval" &&
    agreement.petitioner_approved &&
    agreement.respondent_approved;

  // Submit for approval
  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/agreements/${id}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        Alert.alert("Submitted", "Your agreement has been submitted for approval.");
        fetchAgreement();
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

  // Approve agreement
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/agreements/${id}/approve`,
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
        Alert.alert("Approved", "You have approved this agreement.");
        fetchAgreement();
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

  // Activate agreement
  const handleActivate = async () => {
    Alert.alert(
      "Activate Agreement",
      "Activating this agreement will:\n\n• Create recurring custody exchanges\n• Set expense split ratios\n• Make this your active agreement\n\nProceed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/agreements/${id}/activate`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (response.ok) {
                Alert.alert(
                  "Agreement Activated",
                  "Your agreement is now active. Custody exchanges and expense settings have been configured.",
                  [{ text: "OK", onPress: () => fetchAgreement() }]
                );
              } else {
                const error = await response.json();
                Alert.alert("Error", error.message || "Failed to activate.");
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

  // Download PDF
  const handleDownloadPDF = async () => {
    Alert.alert("PDF Download", "PDF generation will open in your browser.");
    // In a real app, you'd use Linking.openURL or a document viewer
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>Loading agreement...</Text>
      </SafeAreaView>
    );
  }

  if (!agreement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <Text style={{ color: colors.slate }}>Agreement not found.</Text>
      </SafeAreaView>
    );
  }

  const sections = agreement.sections?.sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        {/* Header Card */}
        <View className="rounded-xl p-5 mb-4" style={{ backgroundColor: "white" }}>
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold mb-1" style={{ color: colors.slate }}>
                {agreement.title}
              </Text>
              <View
                className="px-2 py-1 rounded-full self-start"
                style={{ backgroundColor: `${STATUS_COLORS[agreement.status]}20` }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: STATUS_COLORS[agreement.status] }}
                >
                  {STATUS_LABELS[agreement.status]}
                </Text>
              </View>
            </View>
            {agreement.status === "active" && (
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: `${colors.sage}20` }}
              >
                <Ionicons name="shield-checkmark" size={24} color={colors.sage} />
              </View>
            )}
          </View>

          <Text className="text-xs mb-2" style={{ color: "#9CA3AF" }}>
            {agreement.agreement_number}
          </Text>

          {agreement.court_ordered && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="business" size={14} color={colors.amber} />
              <Text className="ml-2 text-sm font-medium" style={{ color: colors.amber }}>
                Court Ordered
              </Text>
            </View>
          )}

          {agreement.effective_date && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="calendar" size={14} color={colors.slate} />
              <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
                Effective: {formatDate(agreement.effective_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Completion Progress (for drafts) */}
        {agreement.status === "draft" && agreement.completion_percentage !== undefined && (
          <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-medium" style={{ color: colors.slate }}>
                Completion Progress
              </Text>
              <Text className="font-semibold" style={{ color: colors.sage }}>
                {agreement.completion_percentage}%
              </Text>
            </View>
            <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.sand }}>
              <View
                className="h-full rounded-full"
                style={{ backgroundColor: colors.sage, width: `${agreement.completion_percentage}%` }}
              />
            </View>
            <Text className="text-xs mt-2" style={{ color: colors.slate }}>
              Complete at least 50% to submit for approval
            </Text>
          </View>
        )}

        {/* Approval Status */}
        {(agreement.status === "pending_approval" || agreement.status === "active") && (
          <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
            <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
              Approval Status
            </Text>

            <View className="space-y-3">
              {/* Parent A */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: agreement.petitioner_approved ? `${colors.sage}20` : colors.sand }}
                  >
                    <Ionicons
                      name={agreement.petitioner_approved ? "checkmark" : "time"}
                      size={20}
                      color={agreement.petitioner_approved ? colors.sage : colors.slate}
                    />
                  </View>
                  <View className="ml-3">
                    <Text className="font-medium" style={{ color: colors.slate }}>
                      {agreement.family_file?.parent_a?.first_name || "Parent A"}
                      {isParentA && " (You)"}
                    </Text>
                    {agreement.petitioner_approved_at && (
                      <Text className="text-xs" style={{ color: colors.slate }}>
                        Approved {formatDate(agreement.petitioner_approved_at)}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  className="font-medium"
                  style={{ color: agreement.petitioner_approved ? colors.sage : colors.amber }}
                >
                  {agreement.petitioner_approved ? "Approved" : "Pending"}
                </Text>
              </View>

              {/* Parent B */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: agreement.respondent_approved ? `${colors.sage}20` : colors.sand }}
                  >
                    <Ionicons
                      name={agreement.respondent_approved ? "checkmark" : "time"}
                      size={20}
                      color={agreement.respondent_approved ? colors.sage : colors.slate}
                    />
                  </View>
                  <View className="ml-3">
                    <Text className="font-medium" style={{ color: colors.slate }}>
                      {agreement.family_file?.parent_b?.first_name || "Parent B"}
                      {!isParentA && " (You)"}
                    </Text>
                    {agreement.respondent_approved_at && (
                      <Text className="text-xs" style={{ color: colors.slate }}>
                        Approved {formatDate(agreement.respondent_approved_at)}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  className="font-medium"
                  style={{ color: agreement.respondent_approved ? colors.sage : colors.amber }}
                >
                  {agreement.respondent_approved ? "Approved" : "Pending"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sections */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
          <Text className="font-semibold mb-4" style={{ color: colors.slate }}>
            Agreement Sections
          </Text>

          {sections.length === 0 ? (
            <Text style={{ color: colors.slate }}>No sections found.</Text>
          ) : (
            <View className="space-y-2">
              {sections.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  className="flex-row items-center p-3 rounded-xl"
                  style={{ backgroundColor: colors.sand }}
                  onPress={() => Alert.alert(section.section_title, section.content || "No content yet.")}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: section.is_completed ? `${colors.sage}20` : "white" }}
                  >
                    <Ionicons
                      name={section.is_completed ? "checkmark" : (SECTION_ICONS[section.section_type] || "document-text")}
                      size={16}
                      color={section.is_completed ? colors.sage : colors.slate}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium" style={{ color: colors.slate }}>
                      {section.section_number}. {section.section_title}
                    </Text>
                  </View>
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: section.is_completed ? `${colors.sage}20` : `${colors.amber}20` }}
                  >
                    <Text
                      className="text-xs"
                      style={{ color: section.is_completed ? colors.sage : colors.amber }}
                    >
                      {section.is_completed ? "Complete" : "Incomplete"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="space-y-3 mb-6">
          {/* Approve Button */}
          {needsMyApproval && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.sage }}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">Approve Agreement</Text>
                </>
              )}
            </TouchableOpacity>
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
                  <Text className="text-white font-semibold text-lg ml-2">Submit for Approval</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Activate Agreement */}
          {canActivate && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: "#22C55E" }}
              onPress={handleActivate}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="white" />
                  <Text className="text-white font-semibold text-lg ml-2">Activate Agreement</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Download PDF (for active agreements) */}
          {agreement.status === "active" && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center border-2"
              style={{ borderColor: colors.sage }}
              onPress={handleDownloadPDF}
            >
              <Ionicons name="download" size={20} color={colors.sage} />
              <Text className="font-semibold ml-2" style={{ color: colors.sage }}>
                Download PDF
              </Text>
            </TouchableOpacity>
          )}

          {/* Continue with ARIA (for drafts) */}
          {agreement.status === "draft" && (
            <TouchableOpacity
              className="py-4 rounded-xl items-center flex-row justify-center border-2"
              style={{ borderColor: colors.sage }}
              onPress={() => router.push(`/agreements/create?familyId=${familyId}&continue=${id}`)}
            >
              <Ionicons name="chatbubbles" size={20} color={colors.sage} />
              <Text className="font-semibold ml-2" style={{ color: colors.sage }}>
                Continue with ARIA
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

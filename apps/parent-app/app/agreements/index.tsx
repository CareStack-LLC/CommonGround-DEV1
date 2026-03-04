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

interface Agreement {
  id: string;
  agreement_number: string;
  title: string;
  agreement_type: "shared_care" | "parenting" | "custody" | "visitation";
  agreement_version: "v1" | "v2_standard" | "v2_lite";
  status: "draft" | "pending_approval" | "active" | "superseded";
  completion_percentage?: number;
  petitioner_approved: boolean;
  respondent_approved: boolean;
  effective_date?: string;
  created_at: string;
}

interface FamilyFile {
  id: string;
  family_name: string;
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

const TYPE_LABELS: Record<string, string> = {
  shared_care: "Shared Care Agreement",
  parenting: "Parenting Plan",
  custody: "Custody Agreement",
  visitation: "Visitation Schedule",
};

export default function AgreementsScreen() {
  const { token } = useAuth();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchAgreements = async () => {
    if (!selectedFamilyId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files/${selectedFamilyId}/agreements`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAgreements(data.items || data || []);
      }
    } catch (error) {
      console.error("Error fetching agreements:", error);
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
      fetchAgreements();
    }
  }, [selectedFamilyId]);

  useFocusEffect(
    useCallback(() => {
      if (selectedFamilyId) {
        fetchAgreements();
      }
    }, [selectedFamilyId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgreements();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Separate active and other agreements
  const activeAgreement = agreements.find((a) => a.status === "active");
  const otherAgreements = agreements.filter((a) => a.status !== "active");

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
          Create a family file first to start creating agreements.
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
            <Ionicons name="document-text" size={20} color={colors.sage} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.slate }}>
                Custody Agreements
              </Text>
              <Text className="text-sm" style={{ color: colors.slate }}>
                Formal agreements covering custody schedules, expenses, communication,
                and all aspects of your co-parenting arrangement.
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={colors.sage} />
          </View>
        ) : agreements.length === 0 ? (
          <View className="items-center py-12">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.sand }}
            >
              <Ionicons name="document-text-outline" size={40} color={colors.sage} />
            </View>
            <Text className="text-lg font-semibold mb-2" style={{ color: colors.slate }}>
              No Agreements Yet
            </Text>
            <Text className="text-center px-8 mb-6" style={{ color: colors.slate }}>
              Create a formal co-parenting agreement with ARIA's help to establish
              clear guidelines for custody, expenses, and communication.
            </Text>
            <TouchableOpacity
              className="px-6 py-3 rounded-xl flex-row items-center"
              style={{ backgroundColor: colors.sage }}
              onPress={() => router.push(`/agreements/create?familyId=${selectedFamilyId}`)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Create Agreement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active Agreement */}
            {activeAgreement && (
              <View className="mb-6">
                <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                  Active Agreement
                </Text>
                <TouchableOpacity
                  className="rounded-xl p-4 border-2"
                  style={{ backgroundColor: "white", borderColor: colors.sage }}
                  onPress={() => router.push(`/agreements/${activeAgreement.id}?familyId=${selectedFamilyId}`)}
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${colors.sage}20` }}
                      >
                        <Ionicons name="shield-checkmark" size={24} color={colors.sage} />
                      </View>
                      <View className="ml-3">
                        <Text className="font-semibold text-lg" style={{ color: colors.slate }}>
                          {activeAgreement.title || TYPE_LABELS[activeAgreement.agreement_type]}
                        </Text>
                        <Text className="text-sm" style={{ color: colors.sage }}>
                          Active
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                  </View>

                  {activeAgreement.effective_date && (
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={14} color={colors.slate} />
                      <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
                        Effective: {formatDate(activeAgreement.effective_date)}
                      </Text>
                    </View>
                  )}

                  <Text className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                    {activeAgreement.agreement_number}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Other Agreements */}
            {otherAgreements.length > 0 && (
              <View>
                <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                  {activeAgreement ? "Other Agreements" : "Agreements"}
                </Text>
                <View className="space-y-3">
                  {otherAgreements.map((agreement) => (
                    <TouchableOpacity
                      key={agreement.id}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: "white" }}
                      onPress={() => router.push(`/agreements/${agreement.id}?familyId=${selectedFamilyId}`)}
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                          <View
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{ backgroundColor: `${STATUS_COLORS[agreement.status]}20` }}
                          >
                            <Ionicons
                              name={
                                agreement.status === "draft"
                                  ? "create"
                                  : agreement.status === "pending_approval"
                                    ? "time"
                                    : "document-text"
                              }
                              size={20}
                              color={STATUS_COLORS[agreement.status]}
                            />
                          </View>
                          <View className="flex-1 ml-3">
                            <Text className="font-medium" style={{ color: colors.slate }}>
                              {agreement.title || TYPE_LABELS[agreement.agreement_type]}
                            </Text>
                            <View
                              className="px-2 py-0.5 rounded-full self-start mt-1"
                              style={{ backgroundColor: `${STATUS_COLORS[agreement.status]}20` }}
                            >
                              <Text
                                className="text-xs font-medium"
                                style={{ color: STATUS_COLORS[agreement.status] }}
                              >
                                {STATUS_LABELS[agreement.status]}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                      </View>

                      {/* Completion Progress for Drafts */}
                      {agreement.status === "draft" && agreement.completion_percentage !== undefined && (
                        <View className="mt-2">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-xs" style={{ color: colors.slate }}>
                              Progress
                            </Text>
                            <Text className="text-xs font-medium" style={{ color: colors.slate }}>
                              {agreement.completion_percentage}%
                            </Text>
                          </View>
                          <View
                            className="h-2 rounded-full overflow-hidden"
                            style={{ backgroundColor: colors.sand }}
                          >
                            <View
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: colors.sage,
                                width: `${agreement.completion_percentage}%`,
                              }}
                            />
                          </View>
                        </View>
                      )}

                      {/* Approval Status for Pending */}
                      {agreement.status === "pending_approval" && (
                        <View className="flex-row items-center mt-2 pt-2 border-t" style={{ borderTopColor: colors.sand }}>
                          <View className="flex-row items-center mr-4">
                            <Ionicons
                              name={agreement.petitioner_approved ? "checkmark-circle" : "ellipse-outline"}
                              size={14}
                              color={agreement.petitioner_approved ? colors.sage : colors.slate}
                            />
                            <Text className="ml-1 text-xs" style={{ color: colors.slate }}>
                              Parent A
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons
                              name={agreement.respondent_approved ? "checkmark-circle" : "ellipse-outline"}
                              size={14}
                              color={agreement.respondent_approved ? colors.sage : colors.slate}
                            />
                            <Text className="ml-1 text-xs" style={{ color: colors.slate }}>
                              Parent B
                            </Text>
                          </View>
                        </View>
                      )}

                      <Text className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                        {agreement.agreement_number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Create New Button */}
            <TouchableOpacity
              className="mt-6 rounded-xl p-4 flex-row items-center justify-center border-2 border-dashed"
              style={{ borderColor: colors.sage }}
              onPress={() => router.push(`/agreements/create?familyId=${selectedFamilyId}`)}
            >
              <Ionicons name="add-circle" size={24} color={colors.sage} />
              <Text className="ml-2 font-semibold" style={{ color: colors.sage }}>
                Create New Agreement
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

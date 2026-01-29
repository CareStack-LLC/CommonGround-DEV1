/**
 * ClearFund Expenses Screen - Matches Web Portal Design
 * Located in tabs so bottom navigation always visible
 */
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent } from "@commonground/api-client";
import type {
  Obligation,
  BalanceSummary,
  ObligationPurpose,
} from "@commonground/api-client/src/api/parent/clearfund";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";
const AMBER = "#D4A574";
const AMBER_LIGHT = "#FEF3E2";
const SAND = "#F5F0E8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";

type FilterType = "all" | "pending" | "funded" | "completed";

export default function ClearfundScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const familyFileId = familyFile?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyFileId) {
      setIsLoading(false);
      return;
    }
    try {
      const [obligationsData, balanceData] = await Promise.all([
        parent.clearfund.getObligations(familyFileId),
        parent.clearfund.getBalanceSummary(familyFileId),
      ]);
      setObligations(obligationsData.items);
      setBalance(balanceData);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      // Set empty state on error
      setObligations([]);
      setBalance(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredObligations = obligations.filter((o) => {
    switch (filter) {
      case "pending":
        return o.status === "pending_funding" || o.status === "partially_funded";
      case "funded":
        return o.status === "fully_funded" || o.status === "in_progress";
      case "completed":
        return o.status === "completed";
      default:
        return true;
    }
  });

  const getPurposeIcon = (purpose: ObligationPurpose) => {
    const icons: Record<ObligationPurpose, string> = {
      medical: "medical",
      education: "school",
      sports: "football",
      device: "phone-portrait",
      camp: "bonfire",
      clothing: "shirt",
      transportation: "car",
      child_support: "wallet",
      extracurricular: "musical-notes",
      childcare: "people",
      other: "receipt",
    };
    return icons[purpose] || "receipt";
  };

  const getPurposeColor = (purpose: ObligationPurpose) => {
    const colors: Record<ObligationPurpose, string> = {
      medical: "#ef4444",
      education: "#3b82f6",
      sports: "#22c55e",
      device: "#8b5cf6",
      camp: "#f97316",
      clothing: "#ec4899",
      transportation: "#64748b",
      child_support: "#eab308",
      extracurricular: "#06b6d4",
      childcare: "#14b8a6",
      other: "#6b7280",
    };
    return colors[purpose] || "#6b7280";
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending_funding: { bg: AMBER_LIGHT, text: AMBER, label: "Needs Funding" },
      partially_funded: { bg: SAND, text: SLATE_LIGHT, label: "Partial" },
      fully_funded: { bg: SAGE_LIGHT, text: SAGE, label: "Funded" },
      in_progress: { bg: SAND, text: SLATE_LIGHT, label: "In Progress" },
      pending_verification: { bg: AMBER_LIGHT, text: AMBER, label: "Verify" },
      completed: { bg: SAGE_LIGHT, text: SAGE, label: "Complete" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626", label: "Cancelled" },
      disputed: { bg: "#FEE2E2", text: "#DC2626", label: "Disputed" },
    };
    return styles[status] || { bg: SAND, text: SLATE_LIGHT, label: status };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE, fontWeight: "500" }}>Loading expenses...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SAGE} />
        }
      >
        {/* Balance Summary Card */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 24,
          padding: 20,
          backgroundColor: SAGE,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ color: SAGE_LIGHT, fontSize: 14 }}>Net Balance</Text>
              <Text style={{ color: WHITE, fontSize: 32, fontWeight: "700", marginTop: 4 }}>
                {formatCurrency(Math.abs(balance?.net_balance || 0))}
              </Text>
              <Text style={{ color: SAGE_LIGHT, fontSize: 14, marginTop: 4 }}>
                {balance?.net_balance && balance.net_balance > 0
                  ? "You owe co-parent"
                  : balance?.net_balance && balance.net_balance < 0
                  ? "Co-parent owes you"
                  : "All settled up!"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Ionicons name="wallet" size={32} color={WHITE} />
            </TouchableOpacity>
          </View>

          <View style={{
            flexDirection: "row",
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.2)",
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SAGE_LIGHT, fontSize: 12 }}>You've funded</Text>
              <Text style={{ color: WHITE, fontSize: 18, fontWeight: "600" }}>
                {formatCurrency(balance?.parent_a_total_funded || 0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SAGE_LIGHT, fontSize: 12 }}>Pending total</Text>
              <Text style={{ color: WHITE, fontSize: 18, fontWeight: "600" }}>
                {formatCurrency(
                  (balance?.total_obligations_amount || 0) -
                  (balance?.parent_a_total_funded || 0) -
                  (balance?.parent_b_total_funded || 0)
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          <View style={{
            flex: 1,
            backgroundColor: WHITE,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: AMBER_LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="hourglass" size={20} color={AMBER} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: SLATE }}>
                  {obligations.filter((o) => o.status === "pending_funding" || o.status === "partially_funded").length}
                </Text>
                <Text style={{ fontSize: 12, color: SLATE_LIGHT }}>Open</Text>
              </View>
            </View>
          </View>
          <View style={{
            flex: 1,
            backgroundColor: WHITE,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: SAGE_LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Ionicons name="checkmark-circle" size={20} color={SAGE} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: SLATE }}>
                  {obligations.filter((o) => o.status === "completed" || o.status === "fully_funded").length}
                </Text>
                <Text style={{ fontSize: 12, color: SLATE_LIGHT }}>Funded</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Needs Action" },
            { id: "funded", label: "Funded" },
            { id: "completed", label: "Completed" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: filter === tab.id ? SAGE : WHITE,
              }}
              onPress={() => setFilter(tab.id as FilterType)}
            >
              <Text style={{
                fontWeight: "600",
                color: filter === tab.id ? WHITE : SLATE,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Obligations List */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 12 }}>
            Shared Expenses
          </Text>

          {filteredObligations.length === 0 ? (
            <View style={{
              backgroundColor: WHITE,
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Ionicons name="receipt-outline" size={48} color={SLATE_LIGHT} />
              <Text style={{ color: SLATE_LIGHT, marginTop: 16, textAlign: "center", fontWeight: "500" }}>
                No expenses found
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredObligations.map((obligation) => {
                const statusStyle = getStatusStyle(obligation.status);
                const fundedPercent =
                  ((obligation.parent_a_funded + obligation.parent_b_funded) /
                    obligation.total_amount) *
                  100;

                return (
                  <TouchableOpacity
                    key={obligation.id}
                    style={{
                      backgroundColor: WHITE,
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                    onPress={() => router.push(`/(tabs)/clearfund/${obligation.id}`)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        backgroundColor: `${getPurposeColor(obligation.purpose)}15`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Ionicons
                          name={getPurposeIcon(obligation.purpose) as any}
                          size={24}
                          color={getPurposeColor(obligation.purpose)}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ color: SLATE, fontWeight: "600", flex: 1 }}>
                            {obligation.description}
                          </Text>
                          <View style={{
                            backgroundColor: statusStyle.bg,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginLeft: 8,
                          }}>
                            <Text style={{ color: statusStyle.text, fontSize: 12, fontWeight: "600" }}>
                              {statusStyle.label}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          {obligation.child_name && (
                            <>
                              <Text style={{ color: SLATE_LIGHT, fontSize: 13 }}>
                                {obligation.child_name}
                              </Text>
                              <Text style={{ color: SAND, marginHorizontal: 8 }}>|</Text>
                            </>
                          )}
                          <Text style={{ color: SLATE_LIGHT, fontSize: 13, textTransform: "capitalize" }}>
                            {obligation.purpose.replace("_", " ")}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{ marginTop: 12 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ color: SLATE_LIGHT, fontSize: 12 }}>
                              {formatCurrency(obligation.parent_a_funded + obligation.parent_b_funded)} of {formatCurrency(obligation.total_amount)}
                            </Text>
                            <Text style={{ color: SLATE_LIGHT, fontSize: 12 }}>
                              {Math.round(fundedPercent)}%
                            </Text>
                          </View>
                          <View style={{
                            height: 8,
                            backgroundColor: SAND,
                            borderRadius: 4,
                            overflow: "hidden",
                          }}>
                            <View style={{
                              height: "100%",
                              width: `${fundedPercent}%`,
                              backgroundColor: SAGE,
                              borderRadius: 4,
                            }} />
                          </View>
                        </View>

                        {obligation.due_date && (
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                            <Ionicons name="calendar-outline" size={12} color={AMBER} />
                            <Text style={{ color: AMBER, fontSize: 12, marginLeft: 4 }}>
                              Due {new Date(obligation.due_date).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: SAGE,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: SAGE,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={() => router.push("/(tabs)/clearfund/create")}
      >
        <Ionicons name="add" size={28} color={WHITE} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

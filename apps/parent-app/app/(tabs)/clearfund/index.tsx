/**
 * ClearFund Expenses Screen — With Agreement Financial Summary
 */
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  parent,
  type Obligation,
  type BalanceSummary,
  type ObligationPurpose,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useTheme } from "@/theme";
import { Card, Badge, SkeletonLoader, SectionHeader } from "@/components/ui";
import { AgreementFinancialSummary } from "@/components/clearfund/AgreementFinancialSummary";

type FilterType = "all" | "pending" | "funded" | "completed";

const PURPOSE_ICONS: Record<ObligationPurpose, string> = {
  medical: "medical", education: "school", sports: "football", device: "phone-portrait",
  camp: "bonfire", clothing: "shirt", transportation: "car", child_support: "wallet",
  extracurricular: "musical-notes", childcare: "people", other: "receipt",
};

const PURPOSE_COLORS: Record<ObligationPurpose, string> = {
  medical: "#ef4444", education: "#3b82f6", sports: "#22c55e", device: "#8b5cf6",
  camp: "#f97316", clothing: "#ec4899", transportation: "#64748b", child_support: "#eab308",
  extracurricular: "#06b6d4", childcare: "#14b8a6", other: "#6b7280",
};

export default function ClearfundScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const { colors } = useTheme();

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const familyFileId = familyFile?.id || null;

  const fetchData = useCallback(async () => {
    if (!familyFileId) { setIsLoading(false); return; }
    try {
      const [obligationsData, balanceData] = await Promise.all([
        parent.clearfund.getObligations(familyFileId),
        parent.clearfund.getBalanceSummary(familyFileId),
      ]);
      setObligations(obligationsData.items);
      setBalance(balanceData);
    } catch {
      setObligations([]);
      setBalance(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredObligations = obligations.filter((o) => {
    switch (filter) {
      case "pending": return o.status === "pending_funding" || o.status === "partially_funded";
      case "funded": return o.status === "fully_funded" || o.status === "in_progress";
      case "completed": return o.status === "completed";
      default: return true;
    }
  });

  const getStatusVariant = (status: string): { variant: "success" | "warning" | "danger" | "default" | "info"; label: string } => {
    const map: Record<string, { variant: "success" | "warning" | "danger" | "default" | "info"; label: string }> = {
      pending_funding: { variant: "warning", label: "Needs Funding" },
      partially_funded: { variant: "default", label: "Partial" },
      fully_funded: { variant: "success", label: "Funded" },
      in_progress: { variant: "default", label: "In Progress" },
      pending_verification: { variant: "warning", label: "Verify" },
      completed: { variant: "success", label: "Complete" },
      cancelled: { variant: "danger", label: "Cancelled" },
      disputed: { variant: "danger", label: "Disputed" },
    };
    return map[status] || { variant: "default", label: status };
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* ── Balance Summary ────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginTop: 16, borderRadius: 24, padding: 20, backgroundColor: colors.primary }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>Net Balance</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700", marginTop: 4 }}>
                {formatCurrency(Math.abs(balance?.net_balance || 0))}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 }}>
                {balance?.net_balance && balance.net_balance > 0
                  ? "You owe co-parent"
                  : balance?.net_balance && balance.net_balance < 0
                  ? "Co-parent owes you"
                  : "All settled up!"}
              </Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 16, padding: 16 }}>
              <Ionicons name="wallet" size={32} color="#fff" />
            </View>
          </View>
          <View style={{ flexDirection: "row", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>You've funded</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                {formatCurrency(balance?.parent_a_total_funded || 0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Pending total</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                {formatCurrency((balance?.total_obligations_amount || 0) - (balance?.parent_a_total_funded || 0) - (balance?.parent_b_total_funded || 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Agreement Financial Summary (NEW) ─────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <AgreementFinancialSummary familyFileId={familyFileId} />
        </View>

        {/* ── Quick Stats ────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 12 }}>
          <Card style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.warningLight, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="hourglass" size={20} color={colors.warning} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary }}>
                  {obligations.filter((o) => o.status === "pending_funding" || o.status === "partially_funded").length}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Open</Text>
              </View>
            </View>
          </Card>
          <Card style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.successLight, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary }}>
                  {obligations.filter((o) => o.status === "completed" || o.status === "fully_funded").length}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Funded</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ── Filter Tabs ────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, paddingHorizontal: 16 }} contentContainerStyle={{ gap: 8 }}>
          {([
            { id: "all", label: "All" },
            { id: "pending", label: "Needs Action" },
            { id: "funded", label: "Funded" },
            { id: "completed", label: "Completed" },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={{
                paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
                backgroundColor: filter === tab.id ? colors.primary : colors.cardBackground,
                borderWidth: filter === tab.id ? 0 : 1, borderColor: colors.cardBorder,
              }}
              onPress={() => setFilter(tab.id)}
            >
              <Text style={{ fontWeight: "600", color: filter === tab.id ? colors.textInverse : colors.textSecondary }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Obligations List ───────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <SectionHeader title="Shared Expenses" />
          {filteredObligations.length === 0 ? (
            <Card>
              <View style={{ alignItems: "center", paddingVertical: 24 }}>
                <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 16, fontWeight: "500" }}>No expenses found</Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredObligations.map((obligation) => {
                const status = getStatusVariant(obligation.status);
                const purposeColor = PURPOSE_COLORS[obligation.purpose] || "#6b7280";
                const purposeIcon = PURPOSE_ICONS[obligation.purpose] || "receipt";
                const fundedPercent = ((obligation.parent_a_funded + obligation.parent_b_funded) / obligation.total_amount) * 100;

                return (
                  <Card key={obligation.id} onPress={() => router.push(`/(tabs)/clearfund/${obligation.id}`)}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: purposeColor + "15", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={purposeIcon as any} size={24} color={purposeColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ color: colors.textPrimary, fontWeight: "600", flex: 1 }}>{obligation.description}</Text>
                          <Badge label={status.label} variant={status.variant} size="sm" />
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                          {obligation.child_name && (
                            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{obligation.child_name} · </Text>
                          )}
                          <Text style={{ color: colors.textMuted, fontSize: 13, textTransform: "capitalize" }}>
                            {obligation.purpose.replace("_", " ")}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{ marginTop: 12 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                              {formatCurrency(obligation.parent_a_funded + obligation.parent_b_funded)} of {formatCurrency(obligation.total_amount)}
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{Math.round(fundedPercent)}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: colors.divider, borderRadius: 4, overflow: "hidden" }}>
                            <View style={{ height: "100%", width: `${fundedPercent}%`, backgroundColor: colors.primary, borderRadius: 4 }} />
                          </View>
                        </View>

                        {obligation.due_date && (
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 }}>
                            <Ionicons name="calendar-outline" size={12} color={colors.warning} />
                            <Text style={{ color: colors.warning, fontSize: 12 }}>
                              Due {new Date(obligation.due_date).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={{
          position: "absolute", bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        }}
        onPress={() => router.push("/(tabs)/clearfund/create")}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

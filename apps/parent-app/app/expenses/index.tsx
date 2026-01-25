/**
 * ClearFund Expenses Screen
 * Main view for shared expense management between co-parents
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

type FilterType = "all" | "pending" | "funded" | "completed";

export default function ExpensesScreen() {
  const { user } = useAuth();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const familyFileId = user?.family_file_id || "demo-family";

  const fetchData = useCallback(async () => {
    try {
      const [obligationsData, balanceData] = await Promise.all([
        parent.clearfund.getObligations(familyFileId),
        parent.clearfund.getBalanceSummary(familyFileId),
      ]);
      setObligations(obligationsData.items);
      setBalance(balanceData);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      // Demo data for development
      setObligations([
        {
          id: "1",
          family_file_id: familyFileId,
          created_by_id: "user-1",
          purpose: "medical",
          description: "Emma's dental checkup",
          total_amount: 250,
          parent_a_share: 125,
          parent_b_share: 125,
          parent_a_funded: 125,
          parent_b_funded: 0,
          balance_remaining: 125,
          status: "partially_funded",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          vendor_name: "Smile Dental",
          is_recurring: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          child_name: "Emma",
        },
        {
          id: "2",
          family_file_id: familyFileId,
          created_by_id: "user-2",
          purpose: "education",
          description: "School supplies for fall semester",
          total_amount: 180,
          parent_a_share: 90,
          parent_b_share: 90,
          parent_a_funded: 90,
          parent_b_funded: 90,
          balance_remaining: 0,
          status: "fully_funded",
          vendor_name: "Target",
          is_recurring: false,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          child_name: "Emma",
        },
        {
          id: "3",
          family_file_id: familyFileId,
          created_by_id: "user-1",
          purpose: "sports",
          description: "Soccer league registration",
          total_amount: 400,
          parent_a_share: 200,
          parent_b_share: 200,
          parent_a_funded: 0,
          parent_b_funded: 0,
          balance_remaining: 400,
          status: "pending_funding",
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          vendor_name: "Youth Soccer Association",
          is_recurring: false,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          child_name: "Lucas",
        },
      ]);
      setBalance({
        family_file_id: familyFileId,
        parent_a_id: "user-1",
        parent_b_id: "user-2",
        parent_a_total_funded: 215,
        parent_b_total_funded: 90,
        parent_a_total_owed: 290,
        parent_b_total_owed: 415,
        net_balance: -125, // Negative = parent_b owes parent_a
        pending_obligations_count: 2,
        total_obligations_amount: 830,
      });
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending_funding: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Needs Funding" },
      partially_funded: { bg: "bg-blue-100", text: "text-blue-700", label: "Partial" },
      fully_funded: { bg: "bg-green-100", text: "text-green-700", label: "Funded" },
      in_progress: { bg: "bg-purple-100", text: "text-purple-700", label: "In Progress" },
      pending_verification: { bg: "bg-orange-100", text: "text-orange-700", label: "Verify" },
      completed: { bg: "bg-gray-100", text: "text-gray-700", label: "Complete" },
      cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
      disputed: { bg: "bg-red-100", text: "text-red-700", label: "Disputed" },
    };
    return badges[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Balance Summary Card */}
        {balance && (
          <View className="mx-4 mt-4 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-primary-100 text-sm">Net Balance</Text>
                <Text className="text-white text-3xl font-bold mt-1">
                  {formatCurrency(Math.abs(balance.net_balance))}
                </Text>
                <Text className="text-primary-200 text-sm mt-1">
                  {balance.net_balance > 0
                    ? "You owe co-parent"
                    : balance.net_balance < 0
                    ? "Co-parent owes you"
                    : "All settled up!"}
                </Text>
              </View>
              <View className="bg-white/20 rounded-xl p-3">
                <Ionicons name="wallet" size={32} color="white" />
              </View>
            </View>

            <View className="flex-row mt-4 pt-4 border-t border-white/20">
              <View className="flex-1">
                <Text className="text-primary-200 text-xs">You've funded</Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(balance.parent_a_total_funded)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-primary-200 text-xs">Pending total</Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(balance.total_obligations_amount - balance.parent_a_total_funded - balance.parent_b_total_funded)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View className="flex-row mx-4 mt-4 gap-3">
          <View className="flex-1 bg-white dark:bg-secondary-800 rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center">
                <Ionicons name="hourglass" size={20} color="#eab308" />
              </View>
              <View className="ml-3">
                <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {obligations.filter((o) => o.status === "pending_funding" || o.status === "partially_funded").length}
                </Text>
                <Text className="text-secondary-500 text-xs">Pending</Text>
              </View>
            </View>
          </View>
          <View className="flex-1 bg-white dark:bg-secondary-800 rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              </View>
              <View className="ml-3">
                <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {obligations.filter((o) => o.status === "completed").length}
                </Text>
                <Text className="text-secondary-500 text-xs">Completed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Needs Action" },
              { id: "funded", label: "Funded" },
              { id: "completed", label: "Completed" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className={`mr-2 px-4 py-2 rounded-full ${
                  filter === tab.id
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setFilter(tab.id as FilterType)}
              >
                <Text
                  className={`font-medium ${
                    filter === tab.id
                      ? "text-white"
                      : "text-secondary-700 dark:text-secondary-300"
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Obligations List */}
        <View className="px-4 mt-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Shared Expenses
          </Text>

          {filteredObligations.length === 0 ? (
            <View className="bg-white dark:bg-secondary-800 rounded-xl p-8 items-center">
              <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
              <Text className="text-secondary-500 mt-4 text-center">
                No expenses found
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredObligations.map((obligation) => {
                const badge = getStatusBadge(obligation.status);
                const fundedPercent =
                  ((obligation.parent_a_funded + obligation.parent_b_funded) /
                    obligation.total_amount) *
                  100;

                return (
                  <TouchableOpacity
                    key={obligation.id}
                    className="bg-white dark:bg-secondary-800 rounded-xl p-4 shadow-sm"
                    onPress={() => router.push(`/expenses/${obligation.id}`)}
                  >
                    <View className="flex-row items-start">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${getPurposeColor(obligation.purpose)}20` }}
                      >
                        <Ionicons
                          name={getPurposeIcon(obligation.purpose) as any}
                          size={24}
                          color={getPurposeColor(obligation.purpose)}
                        />
                      </View>

                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-secondary-900 dark:text-white font-semibold flex-1">
                            {obligation.description}
                          </Text>
                          <View className={`${badge.bg} px-2 py-1 rounded-full ml-2`}>
                            <Text className={`${badge.text} text-xs font-medium`}>
                              {badge.label}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center mt-1">
                          {obligation.child_name && (
                            <>
                              <Text className="text-secondary-500 text-sm">
                                {obligation.child_name}
                              </Text>
                              <Text className="text-secondary-300 mx-2">|</Text>
                            </>
                          )}
                          <Text className="text-secondary-500 text-sm capitalize">
                            {obligation.purpose.replace("_", " ")}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View className="mt-3">
                          <View className="flex-row justify-between mb-1">
                            <Text className="text-secondary-500 text-xs">
                              {formatCurrency(obligation.parent_a_funded + obligation.parent_b_funded)} of {formatCurrency(obligation.total_amount)}
                            </Text>
                            <Text className="text-secondary-500 text-xs">
                              {Math.round(fundedPercent)}%
                            </Text>
                          </View>
                          <View className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${fundedPercent}%` }}
                            />
                          </View>
                        </View>

                        {obligation.due_date && (
                          <Text className="text-secondary-400 text-xs mt-2">
                            Due {new Date(obligation.due_date).toLocaleDateString()}
                          </Text>
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
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push("/expenses/create")}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

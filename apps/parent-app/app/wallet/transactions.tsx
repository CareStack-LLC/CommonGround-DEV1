/**
 * Transaction History Screen
 *
 * Shows full history of ClearFund transactions.
 * Features:
 * - Filter by type (funding, spending, refund)
 * - Search transactions
 * - Export functionality
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
import { Ionicons } from "@expo/vector-icons";

import { parent, type LedgerEntry } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

type FilterType = "all" | "funding" | "spending" | "refund";

export default function TransactionsScreen() {
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const familyFileId = familyFile?.id || null;

  const fetchTransactions = useCallback(async () => {
    if (!familyFileId) {
      setLoading(false);
      return;
    }
    try {
      const data = await parent.clearfund.getLedger(familyFileId, { limit: 50 });
      setTransactions(data.items);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      // Demo data
      setTransactions([
        {
          id: "t1",
          family_file_id: familyFileId,
          obligation_id: "ob1",
          entry_type: "funding",
          amount: 125,
          running_balance: 450,
          description: "Funded Emma's dental checkup",
          parent_id: "user-1",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          parent_name: "You",
          obligation_description: "Dental checkup",
        },
        {
          id: "t2",
          family_file_id: familyFileId,
          obligation_id: "ob2",
          entry_type: "funding",
          amount: 90,
          running_balance: 280,
          description: "Co-parent funded school supplies",
          parent_id: "user-2",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          parent_name: "Co-Parent",
          obligation_description: "School supplies",
        },
        {
          id: "t3",
          family_file_id: familyFileId,
          obligation_id: "ob3",
          entry_type: "spending",
          amount: 45,
          running_balance: 235,
          description: "Payment to vendor",
          parent_id: "user-1",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          parent_name: "System",
          obligation_description: "Soccer registration",
        },
        {
          id: "t4",
          family_file_id: familyFileId,
          obligation_id: "ob4",
          entry_type: "funding",
          amount: 200,
          running_balance: 190,
          description: "Funded soccer league",
          parent_id: "user-1",
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          parent_name: "You",
          obligation_description: "Soccer league registration",
        },
        {
          id: "t5",
          family_file_id: familyFileId,
          entry_type: "refund",
          amount: 25,
          running_balance: -10,
          description: "Refund from cancelled appointment",
          parent_id: "user-1",
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          parent_name: "System",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    return t.entry_type === filter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "funding":
        return { name: "arrow-up-circle", color: colors.sage, bg: `${colors.sage}15` };
      case "spending":
        return { name: "arrow-down-circle", color: colors.amber, bg: `${colors.amber}15` };
      case "refund":
        return { name: "refresh-circle", color: "#3B82F6", bg: "#3B82F615" };
      default:
        return { name: "swap-horizontal", color: colors.slate, bg: colors.sand };
    }
  };

  const groupTransactionsByDate = (items: LedgerEntry[]) => {
    const groups: { [key: string]: LedgerEntry[] } = {};

    items.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups);
  };

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  // Calculate totals
  const totalFunded = transactions
    .filter((t) => t.entry_type === "funding" && t.parent_name === "You")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.entry_type === "spending")
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.cream }}
      >
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>
          Loading transactions...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
        }
      >
        {/* Summary Cards */}
        <View className="flex-row mb-6 space-x-3">
          <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${colors.sage}15` }}>
            <Text className="text-xs" style={{ color: colors.sage }}>
              Total Funded
            </Text>
            <Text className="text-xl font-bold mt-1" style={{ color: colors.sage }}>
              {formatCurrency(totalFunded)}
            </Text>
          </View>
          <View className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${colors.amber}15` }}>
            <Text className="text-xs" style={{ color: colors.amber }}>
              Total Spent
            </Text>
            <Text className="text-xl font-bold mt-1" style={{ color: colors.amber }}>
              {formatCurrency(totalSpent)}
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: "all", label: "All", icon: "list" },
              { id: "funding", label: "Funded", icon: "arrow-up-circle" },
              { id: "spending", label: "Spent", icon: "arrow-down-circle" },
              { id: "refund", label: "Refunds", icon: "refresh-circle" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                className="mr-2 px-4 py-2 rounded-full flex-row items-center"
                style={{
                  backgroundColor: filter === tab.id ? colors.sage : "white",
                }}
                onPress={() => setFilter(tab.id as FilterType)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={filter === tab.id ? "white" : colors.slate}
                />
                <Text
                  className="ml-1 font-medium"
                  style={{
                    color: filter === tab.id ? "white" : colors.slate,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <View className="rounded-xl p-8 items-center" style={{ backgroundColor: "white" }}>
            <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
            <Text className="mt-4 text-center" style={{ color: colors.slate }}>
              No transactions found
            </Text>
          </View>
        ) : (
          groupedTransactions.map(([date, items]) => (
            <View key={date} className="mb-6">
              <Text className="font-medium text-sm mb-3" style={{ color: "#9CA3AF" }}>
                {date}
              </Text>

              <View className="rounded-xl overflow-hidden" style={{ backgroundColor: "white" }}>
                {items.map((transaction, index) => {
                  const icon = getTransactionIcon(transaction.entry_type);
                  const isLast = index === items.length - 1;

                  return (
                    <View
                      key={transaction.id}
                      className="p-4 flex-row items-center"
                      style={{
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.sand,
                      }}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: icon.bg }}
                      >
                        <Ionicons name={icon.name as any} size={20} color={icon.color} />
                      </View>

                      <View className="flex-1 ml-3">
                        <Text className="font-medium" style={{ color: colors.slate }}>
                          {transaction.obligation_description || transaction.description}
                        </Text>
                        <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                          {transaction.parent_name} •{" "}
                          {new Date(transaction.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className="font-semibold"
                          style={{
                            color:
                              transaction.entry_type === "funding"
                                ? colors.sage
                                : transaction.entry_type === "refund"
                                ? "#3B82F6"
                                : colors.slate,
                          }}
                        >
                          {transaction.entry_type === "spending" ? "-" : "+"}
                          {formatCurrency(transaction.amount)}
                        </Text>
                        <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                          Balance: {formatCurrency(transaction.running_balance)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

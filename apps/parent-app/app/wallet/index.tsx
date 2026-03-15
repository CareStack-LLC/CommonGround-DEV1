/**
 * Wallet Screen
 *
 * Main wallet view showing:
 * - ClearFund balance
 * - Payment methods
 * - Recent transactions
 * - Stripe Connect status
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

import { parent, type LedgerEntry, type BalanceSummary } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useTheme } from "@/theme";

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

interface WalletStatus {
  isOnboarded: boolean;
  stripeAccountId?: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { familyFile } = useFamilyFile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({
    isOnboarded: false,
    payoutsEnabled: false,
    chargesEnabled: false,
  });

  const familyFileId = familyFile?.id || null;

  const fetchWalletData = useCallback(async () => {
    if (!familyFileId) {
      setLoading(false);
      return;
    }
    try {
      // Fetch balance and transactions
      const [balanceData, ledgerData] = await Promise.all([
        parent.clearfund.getBalanceSummary(familyFileId),
        parent.clearfund.getLedger(familyFileId, { limit: 5 }),
      ]);

      setBalance(balanceData);
      setTransactions(ledgerData.items);

      // In a real app, fetch from Stripe API
      // For now, use demo data
      setWalletStatus({
        isOnboarded: true,
        stripeAccountId: "acct_demo123",
        payoutsEnabled: true,
        chargesEnabled: true,
      });

      setPaymentMethods([
        {
          id: "pm_1",
          type: "card",
          brand: "Visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2027,
          isDefault: true,
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
      // Demo data
      setBalance({
        family_file_id: familyFileId,
        parent_a_id: "user-1",
        parent_b_id: "user-2",
        parent_a_total_funded: 450,
        parent_b_total_funded: 280,
        parent_a_total_owed: 375,
        parent_b_total_owed: 355,
        net_balance: -75, // Negative = they owe you
        pending_obligations_count: 3,
        total_obligations_amount: 730,
      });

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
      ]);

      setWalletStatus({
        isOnboarded: false,
        payoutsEnabled: false,
        chargesEnabled: false,
      });

      setPaymentMethods([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [familyFileId]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, [fetchWalletData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "funding":
        return { name: "arrow-up-circle", color: colors.primary };
      case "spending":
        return { name: "arrow-down-circle", color: colors.accent };
      case "refund":
        return { name: "refresh-circle", color: "#3B82F6" };
      default:
        return { name: "swap-horizontal", color: colors.secondary };
    }
  };

  const getCardBrandIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "card";
      case "mastercard":
        return "card";
      case "amex":
        return "card";
      default:
        return "card-outline";
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.surfaceElevated }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4" style={{ color: colors.secondary }}>
          Loading wallet...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Balance Card */}
        <View
          className="rounded-3xl p-6 mb-6"
          style={{ backgroundColor: colors.primary }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white/70 text-sm">ClearFund Balance</Text>
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-xs font-medium">
                {balance && balance.net_balance < 0 ? "Owed to You" : "You Owe"}
              </Text>
            </View>
          </View>

          <Text className="text-white text-4xl font-bold">
            {balance ? formatCurrency(balance.net_balance) : "$0.00"}
          </Text>

          <View className="flex-row mt-6 pt-4 border-t border-white/20">
            <View className="flex-1">
              <Text className="text-white/60 text-xs">You've Funded</Text>
              <Text className="text-white font-semibold text-lg">
                {balance ? formatCurrency(balance.parent_a_total_funded) : "$0"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white/60 text-xs">Pending</Text>
              <Text className="text-white font-semibold text-lg">
                {balance?.pending_obligations_count || 0} expenses
              </Text>
            </View>
          </View>
        </View>

        {/* Stripe Connect Status */}
        {!walletStatus.isOnboarded ? (
          <TouchableOpacity
            className="rounded-2xl p-5 mb-6 flex-row items-center"
            style={{ backgroundColor: `${colors.accent}15` }}
            onPress={() => router.push("/wallet/onboarding")}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.accent }}
            >
              <Ionicons name="flash" size={24} color={colors.textInverse} />
            </View>
            <View className="flex-1 ml-4">
              <Text className="font-semibold" style={{ color: colors.secondary }}>
                Set Up Payments
              </Text>
              <Text className="text-sm mt-1" style={{ color: colors.secondary }}>
                Connect with Stripe to send and receive payments
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
          </TouchableOpacity>
        ) : (
          <View
            className="rounded-2xl p-4 mb-6 flex-row items-center"
            style={{ backgroundColor: `${colors.primary}10` }}
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="checkmark" size={20} color={colors.textInverse} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium" style={{ color: colors.primary }}>
                Payments Enabled
              </Text>
              <Text className="text-xs" style={{ color: colors.secondary }}>
                Stripe Connect active
              </Text>
            </View>
          </View>
        )}

        {/* Payment Methods */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-lg" style={{ color: colors.secondary }}>
              Payment Methods
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push("/wallet/add-card")}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text className="ml-1 font-medium" style={{ color: colors.primary }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <TouchableOpacity
              className="rounded-xl p-5 items-center"
              style={{ backgroundColor: colors.background }}
              onPress={() => router.push("/wallet/add-card")}
            >
              <Ionicons name="card-outline" size={32} color={colors.secondary} />
              <Text className="mt-2 font-medium" style={{ color: colors.secondary }}>
                Add a payment method
              </Text>
              <Text className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Use a card or bank account to fund expenses
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-2">
              {paymentMethods.map((method) => (
                <View
                  key={method.id}
                  className="rounded-xl p-4 flex-row items-center"
                  style={{ backgroundColor: colors.background }}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.backgroundSecondary }}
                  >
                    <Ionicons
                      name={getCardBrandIcon(method.brand) as any}
                      size={20}
                      color={colors.secondary}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center">
                      <Text className="font-medium" style={{ color: colors.secondary }}>
                        {method.brand || "Card"} ••••{method.last4}
                      </Text>
                      {method.isDefault && (
                        <View
                          className="ml-2 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${colors.primary}20` }}
                        >
                          <Text className="text-xs" style={{ color: colors.primary }}>
                            Default
                          </Text>
                        </View>
                      )}
                    </View>
                    {method.expMonth && method.expYear && (
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        Expires {method.expMonth}/{method.expYear}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="ellipsis-vertical" size={18} color={colors.secondary} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold text-lg" style={{ color: colors.secondary }}>
              Recent Activity
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push("/wallet/transactions")}
            >
              <Text className="font-medium" style={{ color: colors.primary }}>
                See All
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View
              className="rounded-xl p-5 items-center"
              style={{ backgroundColor: colors.background }}
            >
              <Ionicons name="receipt-outline" size={32} color={colors.secondary} />
              <Text className="mt-2" style={{ color: colors.secondary }}>
                No transactions yet
              </Text>
            </View>
          ) : (
            <View className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.background }}>
              {transactions.map((transaction, index) => {
                const icon = getTransactionIcon(transaction.entry_type);
                const isLast = index === transactions.length - 1;

                return (
                  <View
                    key={transaction.id}
                    className="p-4 flex-row items-center"
                    style={{
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.backgroundSecondary,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${icon.color}15` }}
                    >
                      <Ionicons name={icon.name as any} size={20} color={icon.color} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="font-medium" style={{ color: colors.secondary }}>
                        {transaction.obligation_description || transaction.description}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {transaction.parent_name} • {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text
                      className="font-semibold"
                      style={{
                        color: transaction.entry_type === "funding" ? colors.primary : colors.secondary,
                      }}
                    >
                      {transaction.entry_type === "funding" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="flex-row mt-6 space-x-3">
          <TouchableOpacity
            className="flex-1 rounded-xl py-4 items-center flex-row justify-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() => router.push("/expenses")}
          >
            <Ionicons name="receipt" size={20} color={colors.textInverse} />
            <Text className="font-semibold text-white ml-2">View Expenses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

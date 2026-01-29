/**
 * Expense Detail Screen
 * View and manage a specific shared expense obligation
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  parent,
  type Obligation,
  type ObligationFunding,
  type VerificationArtifact,
} from "@commonground/api-client";

export default function ExpenseDetailScreen() {
  const { obligationId } = useLocalSearchParams<{ obligationId: string }>();
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [funding, setFunding] = useState<ObligationFunding[]>([]);
  const [verifications, setVerifications] = useState<VerificationArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!obligationId) return;

    try {
      const [obligationData, fundingData, verificationsData] = await Promise.all([
        parent.clearfund.getObligation(obligationId),
        parent.clearfund.getFundingHistory(obligationId),
        parent.clearfund.getVerifications(obligationId),
      ]);
      setObligation(obligationData);
      setFunding(fundingData.items);
      setVerifications(verificationsData.items);
    } catch (error) {
      console.error("Failed to fetch expense details:", error);
      // Demo data
      setObligation({
        id: obligationId,
        family_file_id: "demo",
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
        created_by_name: "Sarah",
      });
      setFunding([
        {
          id: "f1",
          obligation_id: obligationId,
          funded_by_id: "user-1",
          amount: 125,
          payment_method: "card",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          funded_by_name: "Sarah",
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [obligationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleFundMyShare = () => {
    if (!obligation) return;
    router.push(`/expenses/${obligationId}/fund`);
  };

  const handleUploadReceipt = () => {
    Alert.alert("Upload Receipt", "Receipt upload coming soon!");
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

  if (!obligation) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <Text className="text-secondary-500">Expense not found</Text>
      </SafeAreaView>
    );
  }

  const fundedPercent =
    ((obligation.parent_a_funded + obligation.parent_b_funded) /
      obligation.total_amount) *
    100;

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Card */}
        <View className="mx-4 mt-4 bg-white dark:bg-secondary-800 rounded-2xl p-5 shadow-sm">
          <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
            {obligation.description}
          </Text>

          <View className="flex-row items-center mt-2">
            {obligation.child_name && (
              <View className="flex-row items-center mr-4">
                <Ionicons name="person" size={14} color="#64748b" />
                <Text className="text-secondary-500 ml-1">{obligation.child_name}</Text>
              </View>
            )}
            <View className="flex-row items-center">
              <Ionicons name="business" size={14} color="#64748b" />
              <Text className="text-secondary-500 ml-1">{obligation.vendor_name || "Vendor"}</Text>
            </View>
          </View>

          {/* Amount */}
          <View className="mt-4 pt-4 border-t border-secondary-100 dark:border-secondary-700">
            <Text className="text-secondary-500 text-sm">Total Amount</Text>
            <Text className="text-3xl font-bold text-secondary-900 dark:text-white">
              {formatCurrency(obligation.total_amount)}
            </Text>
          </View>

          {/* Progress */}
          <View className="mt-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-secondary-500 text-sm">
                {formatCurrency(obligation.parent_a_funded + obligation.parent_b_funded)} funded
              </Text>
              <Text className="text-secondary-500 text-sm">
                {Math.round(fundedPercent)}%
              </Text>
            </View>
            <View className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <View
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${fundedPercent}%` }}
              />
            </View>
          </View>

          {/* Due Date */}
          {obligation.due_date && (
            <View className="mt-4 flex-row items-center">
              <Ionicons name="calendar" size={16} color="#f97316" />
              <Text className="text-orange-500 ml-2 font-medium">
                Due {new Date(obligation.due_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Contribution Breakdown */}
        <View className="mx-4 mt-4 bg-white dark:bg-secondary-800 rounded-2xl p-5 shadow-sm">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Contribution Breakdown
          </Text>

          <View className="flex-row gap-4">
            {/* Parent A */}
            <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <Text className="text-blue-600 font-medium">Your Share</Text>
              <Text className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                {formatCurrency(obligation.parent_a_share)}
              </Text>
              <View className="mt-2">
                <Text className="text-blue-500 text-sm">
                  Funded: {formatCurrency(obligation.parent_a_funded)}
                </Text>
                {obligation.parent_a_funded < obligation.parent_a_share && (
                  <Text className="text-blue-400 text-sm">
                    Remaining: {formatCurrency(obligation.parent_a_share - obligation.parent_a_funded)}
                  </Text>
                )}
                {obligation.parent_a_funded >= obligation.parent_a_share && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                    <Text className="text-green-500 text-sm ml-1">Complete</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Parent B */}
            <View className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <Text className="text-purple-600 font-medium">Co-Parent</Text>
              <Text className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                {formatCurrency(obligation.parent_b_share)}
              </Text>
              <View className="mt-2">
                <Text className="text-purple-500 text-sm">
                  Funded: {formatCurrency(obligation.parent_b_funded)}
                </Text>
                {obligation.parent_b_funded < obligation.parent_b_share && (
                  <Text className="text-purple-400 text-sm">
                    Remaining: {formatCurrency(obligation.parent_b_share - obligation.parent_b_funded)}
                  </Text>
                )}
                {obligation.parent_b_funded >= obligation.parent_b_share && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                    <Text className="text-green-500 text-sm ml-1">Complete</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Funding History */}
        <View className="mx-4 mt-4 bg-white dark:bg-secondary-800 rounded-2xl p-5 shadow-sm">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
            Funding History
          </Text>

          {funding.length === 0 ? (
            <View className="items-center py-4">
              <Ionicons name="wallet-outline" size={32} color="#9ca3af" />
              <Text className="text-secondary-500 mt-2">No contributions yet</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {funding.map((f) => (
                <View
                  key={f.id}
                  className="flex-row items-center py-3 border-b border-secondary-100 dark:border-secondary-700"
                >
                  <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                    <Ionicons name="card" size={18} color="#22c55e" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-secondary-900 dark:text-white font-medium">
                      {f.funded_by_name || "Parent"}
                    </Text>
                    <Text className="text-secondary-500 text-sm">
                      {new Date(f.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-green-600 font-semibold">
                    +{formatCurrency(f.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Verification/Receipts */}
        <View className="mx-4 mt-4 bg-white dark:bg-secondary-800 rounded-2xl p-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
              Receipts & Verification
            </Text>
            <TouchableOpacity
              className="bg-primary-100 px-3 py-1 rounded-full"
              onPress={handleUploadReceipt}
            >
              <Text className="text-primary-600 font-medium text-sm">Upload</Text>
            </TouchableOpacity>
          </View>

          {verifications.length === 0 ? (
            <View className="items-center py-4">
              <Ionicons name="document-outline" size={32} color="#9ca3af" />
              <Text className="text-secondary-500 mt-2">No receipts uploaded</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {verifications.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  className="flex-row items-center py-3 border-b border-secondary-100 dark:border-secondary-700"
                >
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                    <Ionicons name="document-text" size={18} color="#3b82f6" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-secondary-900 dark:text-white font-medium">
                      {v.description || v.type}
                    </Text>
                    <Text className="text-secondary-500 text-sm">
                      {new Date(v.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {obligation.status !== "completed" && obligation.status !== "cancelled" && (
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 p-4 pb-8">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-secondary-100 dark:bg-secondary-700 py-3 rounded-xl items-center"
              onPress={handleUploadReceipt}
            >
              <Text className="text-secondary-700 dark:text-secondary-300 font-semibold">
                Upload Receipt
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary-600 py-3 rounded-xl items-center"
              onPress={handleFundMyShare}
            >
              <Text className="text-white font-semibold">Fund My Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

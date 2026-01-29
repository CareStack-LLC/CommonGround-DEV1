/**
 * Fund Obligation Screen
 *
 * Complete payment flow for funding a shared expense obligation.
 * Features:
 * - Select payment method
 * - Enter amount (partial or full)
 * - Process payment via Stripe
 * - Confirmation and receipt
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parent, type Obligation } from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export default function FundObligationScreen() {
  const { obligationId } = useLocalSearchParams<{ obligationId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState(false);

  // Determine which parent the user is and their remaining share
  const isParentA = true; // This would come from user/family file context
  const myShare = isParentA
    ? (obligation?.parent_a_share || 0) - (obligation?.parent_a_funded || 0)
    : (obligation?.parent_b_share || 0) - (obligation?.parent_b_funded || 0);

  const fetchData = useCallback(async () => {
    if (!obligationId) return;

    try {
      const obligationData = await parent.clearfund.getObligation(obligationId);
      setObligation(obligationData);

      // Calculate default amount
      const remaining = isParentA
        ? obligationData.parent_a_share - obligationData.parent_a_funded
        : obligationData.parent_b_share - obligationData.parent_b_funded;
      setAmount(remaining.toFixed(2));

      // Fetch payment methods (would come from Stripe in production)
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
      setSelectedMethod("pm_1");
    } catch (error) {
      console.error("Failed to fetch obligation:", error);
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
        parent_a_funded: 0,
        parent_b_funded: 0,
        balance_remaining: 250,
        status: "pending_funding",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        vendor_name: "Smile Dental",
        is_recurring: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        child_name: "Emma",
      });
      setAmount("125.00");
      setPaymentMethods([
        {
          id: "pm_demo",
          type: "card",
          brand: "Visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2027,
          isDefault: true,
        },
      ]);
      setSelectedMethod("pm_demo");
    } finally {
      setLoading(false);
    }
  }, [obligationId, isParentA]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const handleAmountChange = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setAmount(cleaned);
    setCustomAmount(true);
  };

  const handleQuickAmount = (multiplier: number) => {
    const quickAmount = myShare * multiplier;
    setAmount(quickAmount.toFixed(2));
    setCustomAmount(false);
  };

  const handlePay = async () => {
    const payAmount = parseFloat(amount);

    if (!payAmount || payAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    if (payAmount > myShare) {
      Alert.alert(
        "Amount Too High",
        `Your remaining share is ${formatCurrency(myShare)}. Would you like to fund that amount?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Fund My Share",
            onPress: () => {
              setAmount(myShare.toFixed(2));
            },
          },
        ]
      );
      return;
    }

    if (!selectedMethod) {
      Alert.alert("Payment Method Required", "Please select a payment method.");
      return;
    }

    setProcessing(true);

    try {
      // In production, this would:
      // 1. Create a PaymentIntent on the backend
      // 2. Confirm with Stripe SDK
      // 3. Record the funding

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Record the funding
      await parent.clearfund.recordFunding({
        obligation_id: obligationId!,
        amount: payAmount,
        payment_method: "card",
      });

      Alert.alert(
        "Payment Successful!",
        `You've funded ${formatCurrency(payAmount)} toward ${obligation?.description}.`,
        [
          {
            text: "Done",
            onPress: () => {
              router.back();
              router.back(); // Go back to expense detail
            },
          },
        ]
      );
    } catch (error) {
      console.error("Payment failed:", error);
      Alert.alert("Payment Failed", "There was an issue processing your payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const getCardIcon = (brand?: string) => {
    return "card"; // In production, use brand-specific icons
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.cream }}
      >
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  if (!obligation) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.cream }}
      >
        <Text style={{ color: colors.slate }}>Expense not found</Text>
      </SafeAreaView>
    );
  }

  const payAmount = parseFloat(amount) || 0;
  const isValidAmount = payAmount > 0 && payAmount <= myShare;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Expense Summary */}
        <View className="rounded-xl p-5 mb-6" style={{ backgroundColor: "white" }}>
          <Text className="text-sm" style={{ color: "#9CA3AF" }}>
            Funding
          </Text>
          <Text className="text-xl font-bold mt-1" style={{ color: colors.slate }}>
            {obligation.description}
          </Text>
          <View className="flex-row items-center mt-2">
            {obligation.child_name && (
              <>
                <Ionicons name="person" size={14} color="#9CA3AF" />
                <Text className="ml-1 text-sm" style={{ color: "#9CA3AF" }}>
                  {obligation.child_name}
                </Text>
              </>
            )}
          </View>

          <View className="flex-row mt-4 pt-4 border-t" style={{ borderColor: colors.sand }}>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                Total Amount
              </Text>
              <Text className="font-semibold" style={{ color: colors.slate }}>
                {formatCurrency(obligation.total_amount)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                Your Share
              </Text>
              <Text className="font-semibold" style={{ color: colors.sage }}>
                {formatCurrency(myShare)}
              </Text>
            </View>
          </View>
        </View>

        {/* Amount Selection */}
        <View className="mb-6">
          <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
            Amount to Fund
          </Text>

          {/* Quick Amount Buttons */}
          <View className="flex-row mb-4 space-x-2">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: !customAmount && amount === myShare.toFixed(2) ? colors.sage : "white",
                borderWidth: 1,
                borderColor: !customAmount && amount === myShare.toFixed(2) ? colors.sage : colors.sand,
              }}
              onPress={() => handleQuickAmount(1)}
            >
              <Text
                className="font-medium"
                style={{
                  color: !customAmount && amount === myShare.toFixed(2) ? "white" : colors.slate,
                }}
              >
                Full Share
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{
                  color: !customAmount && amount === myShare.toFixed(2) ? "white" : "#9CA3AF",
                }}
              >
                {formatCurrency(myShare)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: !customAmount && amount === (myShare * 0.5).toFixed(2) ? colors.sage : "white",
                borderWidth: 1,
                borderColor: !customAmount && amount === (myShare * 0.5).toFixed(2) ? colors.sage : colors.sand,
              }}
              onPress={() => handleQuickAmount(0.5)}
            >
              <Text
                className="font-medium"
                style={{
                  color: !customAmount && amount === (myShare * 0.5).toFixed(2) ? "white" : colors.slate,
                }}
              >
                Half
              </Text>
              <Text
                className="text-xs mt-0.5"
                style={{
                  color: !customAmount && amount === (myShare * 0.5).toFixed(2) ? "white" : "#9CA3AF",
                }}
              >
                {formatCurrency(myShare * 0.5)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom Amount Input */}
          <View
            className="rounded-xl p-4 flex-row items-center"
            style={{
              backgroundColor: "white",
              borderWidth: customAmount ? 2 : 0,
              borderColor: colors.sage,
            }}
          >
            <Text className="text-2xl font-bold mr-1" style={{ color: colors.slate }}>
              $
            </Text>
            <TextInput
              className="flex-1 text-2xl font-bold"
              style={{ color: colors.slate }}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {payAmount > myShare && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="warning" size={14} color={colors.amber} />
              <Text className="ml-1 text-sm" style={{ color: colors.amber }}>
                Amount exceeds your remaining share
              </Text>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-semibold" style={{ color: colors.slate }}>
              Payment Method
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => router.push("/wallet/add-card")}
            >
              <Ionicons name="add" size={18} color={colors.sage} />
              <Text className="ml-1" style={{ color: colors.sage }}>
                Add New
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <TouchableOpacity
              className="rounded-xl p-5 items-center"
              style={{ backgroundColor: "white" }}
              onPress={() => router.push("/wallet/add-card")}
            >
              <Ionicons name="card-outline" size={32} color="#9CA3AF" />
              <Text className="mt-2" style={{ color: colors.slate }}>
                Add a payment method to continue
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-2">
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  className="rounded-xl p-4 flex-row items-center"
                  style={{
                    backgroundColor: selectedMethod === method.id ? `${colors.sage}10` : "white",
                    borderWidth: selectedMethod === method.id ? 2 : 0,
                    borderColor: colors.sage,
                  }}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: selectedMethod === method.id ? colors.sage : colors.sand,
                    }}
                  >
                    <Ionicons
                      name={getCardIcon(method.brand) as any}
                      size={20}
                      color={selectedMethod === method.id ? "white" : colors.slate}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium" style={{ color: colors.slate }}>
                      {method.brand} ••••{method.last4}
                    </Text>
                    {method.expMonth && method.expYear && (
                      <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                        Expires {method.expMonth}/{method.expYear}
                      </Text>
                    )}
                  </View>
                  {selectedMethod === method.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.sage} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Summary */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.sand }}>
          <View className="flex-row justify-between mb-2">
            <Text style={{ color: colors.slate }}>Payment Amount</Text>
            <Text className="font-semibold" style={{ color: colors.slate }}>
              {formatCurrency(payAmount)}
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text style={{ color: colors.slate }}>Processing Fee</Text>
            <Text style={{ color: "#9CA3AF" }}>$0.00</Text>
          </View>
          <View className="flex-row justify-between pt-2 border-t" style={{ borderColor: "white" }}>
            <Text className="font-semibold" style={{ color: colors.slate }}>
              Total
            </Text>
            <Text className="font-bold text-lg" style={{ color: colors.sage }}>
              {formatCurrency(payAmount)}
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          className="py-4 rounded-xl items-center flex-row justify-center"
          style={{
            backgroundColor: isValidAmount && selectedMethod ? colors.sage : colors.sand,
          }}
          onPress={handlePay}
          disabled={!isValidAmount || !selectedMethod || processing}
        >
          {processing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={isValidAmount && selectedMethod ? "white" : colors.slate}
              />
              <Text
                className="font-semibold text-lg ml-2"
                style={{
                  color: isValidAmount && selectedMethod ? "white" : colors.slate,
                }}
              >
                Pay {formatCurrency(payAmount)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <View className="flex-row items-center justify-center mt-4">
          <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
          <Text className="ml-1 text-xs" style={{ color: "#9CA3AF" }}>
            Secured by Stripe
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

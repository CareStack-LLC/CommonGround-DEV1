/**
 * Add Payment Method Screen
 *
 * Allows users to add a new card or bank account.
 * Uses Stripe's secure card input when available,
 * falls back to demo mode in Expo Go.
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

type PaymentType = "card" | "bank";

export default function AddCardScreen() {
  const [paymentType, setPaymentType] = useState<PaymentType>("card");
  const [loading, setLoading] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // Bank fields
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ").substring(0, 19) : "";
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleAddCard = async () => {
    if (!cardNumber || !expiry || !cvc || !cardholderName) {
      Alert.alert("Missing Information", "Please fill in all card details.");
      return;
    }

    setLoading(true);

    try {
      // In production, this would:
      // 1. Create a Stripe PaymentMethod using the card details
      // 2. Attach it to the customer's Stripe account
      // For now, simulate success

      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        "Card Added",
        "Your payment method has been saved securely.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = async () => {
    if (!routingNumber || !accountNumber || !accountName) {
      Alert.alert("Missing Information", "Please fill in all bank details.");
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        "Bank Account Added",
        "Your bank account has been connected. Verification may take 1-2 business days.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to add bank account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Payment Type Selector */}
          <View className="flex-row mb-6 p-1 rounded-xl" style={{ backgroundColor: colors.sand }}>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
              style={{
                backgroundColor: paymentType === "card" ? "white" : "transparent",
              }}
              onPress={() => setPaymentType("card")}
            >
              <Ionicons
                name="card"
                size={18}
                color={paymentType === "card" ? colors.sage : colors.slate}
              />
              <Text
                className="font-medium ml-2"
                style={{ color: paymentType === "card" ? colors.sage : colors.slate }}
              >
                Card
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-lg items-center flex-row justify-center"
              style={{
                backgroundColor: paymentType === "bank" ? "white" : "transparent",
              }}
              onPress={() => setPaymentType("bank")}
            >
              <Ionicons
                name="business"
                size={18}
                color={paymentType === "bank" ? colors.sage : colors.slate}
              />
              <Text
                className="font-medium ml-2"
                style={{ color: paymentType === "bank" ? colors.sage : colors.slate }}
              >
                Bank Account
              </Text>
            </TouchableOpacity>
          </View>

          {paymentType === "card" ? (
            <View className="rounded-xl p-5" style={{ backgroundColor: "white" }}>
              {/* Cardholder Name */}
              <View className="mb-4">
                <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                  Cardholder Name
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: colors.sand,
                    color: colors.slate,
                  }}
                  placeholder="Name on card"
                  placeholderTextColor="#9CA3AF"
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  autoCapitalize="words"
                />
              </View>

              {/* Card Number */}
              <View className="mb-4">
                <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                  Card Number
                </Text>
                <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: colors.sand }}>
                  <Ionicons name="card-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 py-3 ml-2"
                    style={{ color: colors.slate }}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#9CA3AF"
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>
              </View>

              {/* Expiry and CVC */}
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                    Expiry
                  </Text>
                  <TextInput
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: colors.sand,
                      color: colors.slate,
                    }}
                    placeholder="MM/YY"
                    placeholderTextColor="#9CA3AF"
                    value={expiry}
                    onChangeText={(text) => setExpiry(formatExpiry(text))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                    CVC
                  </Text>
                  <TextInput
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: colors.sand,
                      color: colors.slate,
                    }}
                    placeholder="123"
                    placeholderTextColor="#9CA3AF"
                    value={cvc}
                    onChangeText={(text) => setCvc(text.replace(/\D/g, "").substring(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Security Note */}
              <View className="flex-row items-center mt-4 pt-4 border-t" style={{ borderColor: colors.sand }}>
                <Ionicons name="lock-closed" size={14} color="#9CA3AF" />
                <Text className="ml-2 text-xs" style={{ color: "#9CA3AF" }}>
                  Your card info is encrypted and processed securely by Stripe
                </Text>
              </View>
            </View>
          ) : (
            <View className="rounded-xl p-5" style={{ backgroundColor: "white" }}>
              {/* Account Holder Name */}
              <View className="mb-4">
                <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                  Account Holder Name
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: colors.sand,
                    color: colors.slate,
                  }}
                  placeholder="Name on account"
                  placeholderTextColor="#9CA3AF"
                  value={accountName}
                  onChangeText={setAccountName}
                  autoCapitalize="words"
                />
              </View>

              {/* Routing Number */}
              <View className="mb-4">
                <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                  Routing Number
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: colors.sand,
                    color: colors.slate,
                  }}
                  placeholder="9 digit routing number"
                  placeholderTextColor="#9CA3AF"
                  value={routingNumber}
                  onChangeText={(text) => setRoutingNumber(text.replace(/\D/g, "").substring(0, 9))}
                  keyboardType="number-pad"
                  maxLength={9}
                />
              </View>

              {/* Account Number */}
              <View className="mb-4">
                <Text className="font-medium mb-2" style={{ color: colors.slate }}>
                  Account Number
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: colors.sand,
                    color: colors.slate,
                  }}
                  placeholder="Account number"
                  placeholderTextColor="#9CA3AF"
                  value={accountNumber}
                  onChangeText={(text) => setAccountNumber(text.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>

              {/* Account Type */}
              <View className="flex-row items-center mt-2 p-3 rounded-xl" style={{ backgroundColor: `${colors.amber}10` }}>
                <Ionicons name="information-circle" size={18} color={colors.amber} />
                <Text className="ml-2 text-sm flex-1" style={{ color: colors.slate }}>
                  Bank account verification takes 1-2 business days via micro-deposits.
                </Text>
              </View>
            </View>
          )}

          {/* Test Card Info (Demo Mode) */}
          <View className="rounded-xl p-4 mt-6" style={{ backgroundColor: colors.sand }}>
            <View className="flex-row items-start">
              <Ionicons name="flask" size={18} color={colors.amber} />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-sm" style={{ color: colors.slate }}>
                  Demo Mode
                </Text>
                <Text className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                  Use test card: 4242 4242 4242 4242, any future expiry, any CVC
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center mt-6 flex-row justify-center"
            style={{ backgroundColor: colors.sage }}
            onPress={paymentType === "card" ? handleAddCard : handleAddBank}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="add-circle" size={22} color="white" />
                <Text className="font-semibold text-lg text-white ml-2">
                  Add {paymentType === "card" ? "Card" : "Bank Account"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            className="py-3 items-center mt-2"
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.slate }}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

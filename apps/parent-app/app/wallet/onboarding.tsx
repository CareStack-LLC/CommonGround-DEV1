/**
 * Stripe Connect Onboarding Screen
 *
 * Guides users through Stripe Connect setup for receiving payments.
 * Features:
 * - Account verification steps
 * - Identity verification
 * - Bank account connection
 * - Terms acceptance
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "pending" | "in_progress" | "completed";
}

export default function WalletOnboardingScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "account",
      title: "Create Account",
      description: "Set up your Stripe Connect account",
      icon: "person-circle",
      status: "pending",
    },
    {
      id: "identity",
      title: "Verify Identity",
      description: "Confirm your identity securely",
      icon: "shield-checkmark",
      status: "pending",
    },
    {
      id: "bank",
      title: "Add Bank Account",
      description: "Connect where you'll receive funds",
      icon: "business",
      status: "pending",
    },
    {
      id: "terms",
      title: "Accept Terms",
      description: "Review and accept payment terms",
      icon: "document-text",
      status: "pending",
    },
  ]);

  const handleStartOnboarding = async () => {
    setLoading(true);

    try {
      // In a real implementation, this would:
      // 1. Call your backend to create a Stripe Connect account
      // 2. Get an account link URL from Stripe
      // 3. Open that URL in a browser for the user to complete onboarding

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update first step
      setSteps((prev) =>
        prev.map((step, index) =>
          index === 0 ? { ...step, status: "in_progress" } : step
        )
      );
      setCurrentStep(0);

      // In production, you would open Stripe's hosted onboarding
      // Linking.openURL(stripeAccountLinkUrl);

      Alert.alert(
        "Demo Mode",
        "In production, this would open Stripe's secure onboarding portal. For now, we'll simulate the process.",
        [
          {
            text: "Simulate Complete",
            onPress: () => simulateOnboardingComplete(),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to start onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const simulateOnboardingComplete = () => {
    // Simulate completing all steps
    setSteps((prev) =>
      prev.map((step) => ({ ...step, status: "completed" }))
    );
    setCurrentStep(steps.length);

    setTimeout(() => {
      Alert.alert(
        "Setup Complete!",
        "Your payment account is ready. You can now fund expenses and receive payments.",
        [{ text: "Continue", onPress: () => router.back() }]
      );
    }, 500);
  };

  const getStepIcon = (step: OnboardingStep, index: number) => {
    if (step.status === "completed") {
      return { name: "checkmark-circle", color: colors.sage };
    }
    if (step.status === "in_progress") {
      return { name: step.icon, color: colors.amber };
    }
    return { name: step.icon, color: colors.slate };
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="items-center mb-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${colors.sage}15` }}
          >
            <Ionicons name="flash" size={40} color={colors.sage} />
          </View>
          <Text className="text-2xl font-bold text-center" style={{ color: colors.slate }}>
            Set Up Payments
          </Text>
          <Text className="text-center mt-2" style={{ color: "#9CA3AF" }}>
            Connect with Stripe to securely send and receive funds for shared expenses
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm" style={{ color: colors.slate }}>
              Progress
            </Text>
            <Text className="text-sm font-medium" style={{ color: colors.sage }}>
              {completedSteps}/{steps.length} steps
            </Text>
          </View>
          <View className="h-2 rounded-full" style={{ backgroundColor: colors.sand }}>
            <View
              className="h-full rounded-full"
              style={{
                backgroundColor: colors.sage,
                width: `${progress}%`,
              }}
            />
          </View>
        </View>

        {/* Steps */}
        <View className="mb-6">
          {steps.map((step, index) => {
            const icon = getStepIcon(step, index);
            const isActive = step.status === "in_progress";
            const isCompleted = step.status === "completed";

            return (
              <View key={step.id} className="flex-row mb-4">
                {/* Step Line */}
                <View className="items-center mr-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isCompleted
                        ? colors.sage
                        : isActive
                        ? `${colors.amber}20`
                        : colors.sand,
                    }}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={20}
                      color={isCompleted ? "white" : icon.color}
                    />
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      className="w-0.5 flex-1 my-1"
                      style={{
                        backgroundColor: isCompleted ? colors.sage : colors.sand,
                        minHeight: 24,
                      }}
                    />
                  )}
                </View>

                {/* Step Content */}
                <View
                  className="flex-1 rounded-xl p-4 mb-2"
                  style={{
                    backgroundColor: isActive ? `${colors.amber}10` : "white",
                    borderWidth: isActive ? 1 : 0,
                    borderColor: colors.amber,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="font-semibold"
                      style={{
                        color: isCompleted ? colors.sage : colors.slate,
                      }}
                    >
                      {step.title}
                    </Text>
                    {isCompleted && (
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${colors.sage}20` }}
                      >
                        <Text className="text-xs" style={{ color: colors.sage }}>
                          Done
                        </Text>
                      </View>
                    )}
                    {isActive && (
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${colors.amber}20` }}
                      >
                        <Text className="text-xs" style={{ color: colors.amber }}>
                          In Progress
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
                    {step.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Benefits */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: `${colors.sage}10` }}>
          <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
            Why Connect with Stripe?
          </Text>
          <View className="space-y-2">
            {[
              { icon: "shield-checkmark", text: "Bank-level security for all transactions" },
              { icon: "flash", text: "Instant funding of shared expenses" },
              { icon: "receipt", text: "Automatic receipt and verification tracking" },
              { icon: "analytics", text: "Clear expense history and reporting" },
            ].map((benefit, index) => (
              <View key={index} className="flex-row items-center">
                <Ionicons name={benefit.icon as any} size={16} color={colors.sage} />
                <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Security Note */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.sand }}>
          <View className="flex-row items-start">
            <Ionicons name="lock-closed" size={18} color={colors.slate} />
            <View className="flex-1 ml-3">
              <Text className="font-medium text-sm" style={{ color: colors.slate }}>
                Your Data is Secure
              </Text>
              <Text className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                CommonGround never stores your banking details. All payment information
                is securely handled by Stripe, a PCI Level 1 certified payment processor.
              </Text>
            </View>
          </View>
        </View>

        {/* Start Button */}
        {completedSteps < steps.length && (
          <TouchableOpacity
            className="py-4 rounded-xl items-center flex-row justify-center mb-6"
            style={{ backgroundColor: colors.sage }}
            onPress={handleStartOnboarding}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle" size={22} color="white" />
                <Text className="font-semibold text-lg text-white ml-2">
                  {completedSteps > 0 ? "Continue Setup" : "Get Started"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Skip for Now */}
        <TouchableOpacity
          className="py-3 items-center"
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.slate }}>
            {completedSteps === steps.length ? "Done" : "Set Up Later"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

export default function InviteCoParentScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { familyId, familyName } = useLocalSearchParams<{ familyId: string; familyName: string }>();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your co-parent's email address.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files/${familyId}/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (response.ok) {
        setSent(true);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Failed to send invitation.");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center px-8" style={{ backgroundColor: colors.surfaceElevated }}>
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${colors.primary}20` }}
        >
          <Ionicons name="mail" size={48} color={colors.primary} />
        </View>
        <Text className="text-2xl font-bold text-center mb-2" style={{ color: colors.secondary }}>
          Invitation Sent!
        </Text>
        <Text className="text-center mb-8" style={{ color: colors.secondary }}>
          We've sent an invitation to {email}. They'll receive an email with a link to join your family file.
        </Text>

        <View className="w-full rounded-xl p-4 mb-6" style={{ backgroundColor: colors.backgroundSecondary }}>
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text className="flex-1 ml-2 text-sm" style={{ color: colors.secondary }}>
              The invitation link will expire in 7 days. If they don't see the email, ask them to check their spam folder.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="w-full py-4 rounded-xl items-center"
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold text-lg">Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.surfaceElevated }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-8">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${colors.primary}20` }}
          >
            <Ionicons name="person-add" size={32} color={colors.primary} />
          </View>
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.secondary }}>
            Invite Co-Parent
          </Text>
          <Text style={{ color: colors.secondary }}>
            Invite your co-parent to join {familyName ? `the ${familyName}` : "your family file"}.
            They'll be able to view and manage shared schedules, expenses, and communication.
          </Text>
        </View>

        {/* Email Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium mb-2" style={{ color: colors.secondary }}>
            Co-Parent Email Address
          </Text>
          <View className="flex-row items-center rounded-xl px-4" style={{ backgroundColor: colors.backgroundSecondary }}>
            <Ionicons name="mail-outline" size={20} color={colors.secondary} />
            <TextInput
              className="flex-1 py-4 ml-3 text-base"
              style={{ color: colors.secondary }}
              placeholder="coparent@email.com"
              placeholderTextColor={colors.inputPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* What They'll Get Access To */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.backgroundSecondary }}>
          <Text className="font-medium mb-3" style={{ color: colors.primary }}>
            What they'll get access to:
          </Text>
          <View className="space-y-3">
            {[
              { icon: "calendar", label: "Shared custody schedule (Time Bridge)" },
              { icon: "wallet", label: "Expense tracking and reimbursements (ClearFund)" },
              { icon: "chatbubbles", label: "Secure messaging with tone analysis (ARIA)" },
              { icon: "document-text", label: "Shared documents and agreements" },
              { icon: "people", label: "My Circle contacts for the children" },
            ].map((item, index) => (
              <View key={index} className="flex-row items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.backgroundSecondary }}
                >
                  <Ionicons name={item.icon as any} size={16} color={colors.primary} />
                </View>
                <Text className="ml-3 flex-1" style={{ color: colors.secondary }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Privacy Note */}
        <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: `${colors.accent}15` }}>
          <View className="flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
            <View className="flex-1 ml-3">
              <Text className="font-medium mb-1" style={{ color: colors.secondary }}>
                Privacy Protection
              </Text>
              <Text className="text-sm" style={{ color: colors.secondary }}>
                Your personal information (phone, address, etc.) remains private unless you choose to share it.
                Messages are analyzed for tone but content is never shared with third parties.
              </Text>
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          className="py-4 rounded-xl items-center flex-row justify-center"
          style={{ backgroundColor: email.trim() && validateEmail(email) ? colors.primary : colors.border }}
          onPress={handleInvite}
          disabled={loading || !email.trim() || !validateEmail(email)}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={email.trim() && validateEmail(email) ? colors.textInverse : colors.textMuted} />
              <Text
                className="font-semibold text-lg ml-2"
                style={{ color: email.trim() && validateEmail(email) ? colors.textInverse : colors.textMuted }}
              >
                Send Invitation
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          className="mt-4 py-3 items-center"
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.secondary }}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

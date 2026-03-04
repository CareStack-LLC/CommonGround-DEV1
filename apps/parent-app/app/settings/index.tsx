/**
 * Settings Screen - Main settings hub with sign out
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { BottomNavBar } from "@/components/BottomNavBar";

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";
const RED = "#DC2626";

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function SettingsItem({ icon, label, sublabel, onPress, showChevron = true, danger }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: WHITE,
      }}
      onPress={onPress}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: danger ? `${RED}15` : SAGE_LIGHT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={danger ? RED : SAGE} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: danger ? RED : SLATE }}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ fontSize: 13, color: SLATE_LIGHT, marginTop: 2 }}>
            {sublabel}
          </Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={SLATE_LIGHT} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, logout, subscription } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: SAND,
          backgroundColor: WHITE,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={SLATE} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "600", color: SLATE }}>
          Settings
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Profile Card */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 16,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: SAGE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "600", color: WHITE }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT, marginTop: 2 }}>
                {user?.email}
              </Text>
              {subscription && (
                <View
                  style={{
                    marginTop: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: SAGE_LIGHT,
                    borderRadius: 12,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: SAGE }}>
                    {subscription.tier === "family_plus"
                      ? "Family Plus"
                      : subscription.tier === "plus"
                      ? "Plus"
                      : "Basic"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: SLATE_LIGHT,
              textTransform: "uppercase",
              marginBottom: 8,
              marginLeft: 4,
            }}
          >
            Account
          </Text>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem
              icon="person-outline"
              label="Edit Profile"
              sublabel="Name, phone, address"
              onPress={() => router.push("/settings/edit-profile")}
            />
            <View style={{ height: 1, backgroundColor: SAND, marginLeft: 68 }} />
            <SettingsItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => router.push("/settings/change-password")}
            />
            <View style={{ height: 1, backgroundColor: SAND, marginLeft: 68 }} />
            <SettingsItem
              icon="finger-print-outline"
              label="Biometric Login"
              sublabel="Use Face ID or Touch ID"
              onPress={() => Alert.alert("Coming Soon", "Biometric settings will be available soon.")}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: SLATE_LIGHT,
              textTransform: "uppercase",
              marginBottom: 8,
              marginLeft: 4,
            }}
          >
            Preferences
          </Text>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem
              icon="notifications-outline"
              label="Notifications"
              sublabel="Push, email, SMS"
              onPress={() => router.push("/settings/notifications")}
            />
            <View style={{ height: 1, backgroundColor: SAND, marginLeft: 68 }} />
            <SettingsItem
              icon="shield-outline"
              label="Privacy"
              sublabel="Data sharing, visibility"
              onPress={() => router.push("/settings/privacy")}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: SLATE_LIGHT,
              textTransform: "uppercase",
              marginBottom: 8,
              marginLeft: 4,
            }}
          >
            Support
          </Text>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => Alert.alert("Help Center", "Visit commonground.com/help")}
            />
            <View style={{ height: 1, backgroundColor: SAND, marginLeft: 68 }} />
            <SettingsItem
              icon="chatbubbles-outline"
              label="Contact Support"
              onPress={() => Alert.alert("Contact Support", "Email: support@commonground.com")}
            />
            <View style={{ height: 1, backgroundColor: SAND, marginLeft: 68 }} />
            <SettingsItem
              icon="document-text-outline"
              label="Terms & Privacy Policy"
              onPress={() => Alert.alert("Legal", "View at commonground.com/legal")}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{ borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem
              icon="log-out-outline"
              label="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: SLATE_LIGHT }}>
            CommonGround v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar />
    </SafeAreaView>
  );
}

/**
 * Settings Screen — Theme toggle, ARIA info, account settings
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme, type ThemePreference } from "@/theme";
import { Card, Avatar, Badge } from "@/components/ui";

export default function SettingsScreen() {
  const { user, logout, subscription } = useAuth();
  const { colors, preference, setTheme, isDark } = useTheme();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "600", color: colors.textPrimary }}>Settings</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User Profile Card */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Avatar name={`${user?.first_name || ""} ${user?.last_name || ""}`} size={60} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: colors.textPrimary }}>
                  {user?.first_name} {user?.last_name}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{user?.email}</Text>
                {subscription && (
                  <View style={{ marginTop: 8 }}>
                    <Badge
                      label={subscription.tier === "family_plus" ? "Family Plus" : subscription.tier === "plus" ? "Plus" : "Basic"}
                      variant="success"
                      size="sm"
                    />
                  </View>
                )}
              </View>
            </View>
          </Card>
        </View>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: "hidden" }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: "500", color: colors.textPrimary, marginBottom: 12 }}>Theme</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {([
                  { id: "light" as ThemePreference, label: "Light", icon: "sunny" as const },
                  { id: "dark" as ThemePreference, label: "Dark", icon: "moon" as const },
                  { id: "system" as ThemePreference, label: "System", icon: "phone-portrait" as const },
                ]).map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                      backgroundColor: preference === option.id ? colors.primary : colors.secondaryLight,
                      gap: 6,
                    }}
                    onPress={() => setTheme(option.id)}
                  >
                    <Ionicons name={option.icon} size={20} color={preference === option.id ? colors.textInverse : colors.textSecondary} />
                    <Text style={{
                      fontSize: 13, fontWeight: "600",
                      color: preference === option.id ? colors.textInverse : colors.textSecondary,
                    }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SettingsSection>

        {/* ARIA Protection Section */}
        <SettingsSection title="ARIA Protection">
          <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentLight, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="shield-checkmark" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>Always Active</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}>
                  ARIA monitors all messages, audio calls, and video calls for court documentation. This cannot be disabled.
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider, gap: 8 }}>
              {[
                { icon: "chatbubble" as const, label: "Message monitoring" },
                { icon: "call" as const, label: "Audio call recording" },
                { icon: "videocam" as const, label: "Video call recording" },
                { icon: "flag" as const, label: "Event flagging & categorization" },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name={item.icon} size={14} color={colors.success} />
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.label}</Text>
                  <View style={{ marginLeft: "auto" }}>
                    <Badge label="ON" variant="success" size="sm" />
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </SettingsSection>

        {/* Account Section */}
        <SettingsSection title="Account">
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem icon="person-outline" label="Edit Profile" sublabel="Name, phone, address" onPress={() => router.push("/settings/edit-profile")} />
            <Divider />
            <SettingsItem icon="lock-closed-outline" label="Change Password" onPress={() => router.push("/settings/change-password")} />
            <Divider />
            <SettingsItem icon="finger-print-outline" label="Biometric Login" sublabel="Face ID or Touch ID" onPress={() => Alert.alert("Coming Soon")} />
          </View>
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title="Preferences">
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem icon="notifications-outline" label="Notifications" sublabel="Push, email, SMS" onPress={() => router.push("/settings/notifications")} />
            <Divider />
            <SettingsItem icon="shield-outline" label="Privacy" sublabel="Data sharing, visibility" onPress={() => router.push("/settings/privacy")} />
          </View>
        </SettingsSection>

        {/* Support Section */}
        <SettingsSection title="Support">
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert("Help Center", "Visit commonground.com/help")} />
            <Divider />
            <SettingsItem icon="chatbubbles-outline" label="Contact Support" onPress={() => Alert.alert("Contact Support", "Email: support@commonground.com")} />
            <Divider />
            <SettingsItem icon="document-text-outline" label="Terms & Privacy" onPress={() => Alert.alert("Legal", "View at commonground.com/legal")} />
          </View>
        </SettingsSection>

        {/* Sign Out */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: "hidden" }}>
            <SettingsItem icon="log-out-outline" label="Sign Out" onPress={handleSignOut} showChevron={false} danger />
          </View>
        </View>

        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>CommonGround v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function SettingsItem({ icon, label, sublabel, onPress, showChevron = true, danger }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sublabel?: string; onPress: () => void; showChevron?: boolean; danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", padding: 16 }} onPress={onPress}>
      <View style={{
        width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
        backgroundColor: danger ? colors.dangerLight : colors.primaryLight,
      }}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: danger ? colors.danger : colors.textPrimary }}>{label}</Text>
        {sublabel && <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{sublabel}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: 68 }} />;
}

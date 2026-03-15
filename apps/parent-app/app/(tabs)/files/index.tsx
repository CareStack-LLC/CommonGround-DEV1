/**
 * Family Files List Screen - Matches Web Portal Design
 * Located in tabs so bottom navigation always visible
 */
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useTheme } from "@/theme";

export default function FamilyFilesScreen() {
  const { colors } = useTheme();
  const { familyFile, children, isLoading, error, refresh } = useFamilyFile();

  // Convert single family file to array for display
  const familyFiles = familyFile ? [familyFile] : [];

  // Get time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Get role name display
  const getRoleName = (role: string | null | undefined) => {
    if (!role) return "Parent";
    switch (role) {
      case "mother": return "Mother";
      case "father": return "Father";
      case "parent_a": return "Parent A";
      case "parent_b": return "Parent B";
      default: return role;
    }
  };

  // Get display name for family file
  const getDisplayName = (file: any) => {
    return file.title || file.family_name || file.family_file_number || "Family File";
  };

  // Get status badge style
  const isActive = (file: any) => {
    return file.status === "active" || file.is_complete;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.secondary, fontWeight: "500" }}>Loading your family files...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 4, fontWeight: "500" }}>
            {getGreeting()}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "700", color: colors.secondary, marginBottom: 4 }}>
            Family Files
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "500" }}>
            Manage your co-parenting arrangements
          </Text>
        </View>

        {/* New Family File Button */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={() => router.push("/(tabs)/files/create")}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              New Family File
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error State */}
        {error && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
            }}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={{ marginLeft: 12, color: "#DC2626", fontWeight: "500" }}>{error}</Text>
            </View>
          </View>
        )}

        {/* Your Family Files Section */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}>
              <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "600", color: colors.secondary }}>
              Your Family Files
            </Text>
          </View>

          {familyFiles.length === 0 ? (
            <View style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Ionicons name="folder-outline" size={32} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary, marginBottom: 8 }}>
                No Family Files Yet
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: 16 }}>
                Create a family file to start managing custody schedules, expenses, and communication.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {familyFiles.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: colors.backgroundSecondary,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                  onPress={() => router.push(`/(tabs)/files/${file.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Top Row: Icon, Name, Status */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: colors.primaryLight,
                      borderWidth: 2,
                      borderColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="folder-open-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.secondary }}>
                        {getDisplayName(file)}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: "500" }}>
                        {file.family_file_number || "FF-000000"}
                      </Text>
                    </View>
                    {/* Status Badge */}
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: isActive(file) ? colors.primaryLight : colors.accentLight,
                    }}>
                      <Ionicons
                        name={isActive(file) ? "checkmark-circle" : "time"}
                        size={14}
                        color={isActive(file) ? colors.primary : colors.accent}
                      />
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isActive(file) ? colors.primary : colors.accent,
                        marginLeft: 4,
                      }}>
                        {isActive(file) ? "Active" : "Pending"}
                      </Text>
                    </View>
                  </View>

                  {/* Role Row */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.backgroundSecondary,
                  }}>
                    <Ionicons name="people-outline" size={16} color={colors.textMuted} />
                    <Text style={{ fontSize: 14, color: colors.secondary, marginLeft: 8, fontWeight: "500" }}>
                      {getRoleName(file.parent_a_role)}
                      {file.parent_b_id && ` & ${getRoleName(file.parent_b_role)}`}
                    </Text>
                  </View>

                  {/* Location */}
                  {file.state && (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 12,
                    }}>
                      <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                      <Text style={{ fontSize: 14, color: colors.textMuted, marginLeft: 8, fontWeight: "500" }}>
                        {file.county && `${file.county}, `}{file.state}
                      </Text>
                    </View>
                  )}

                  {/* Feature Tags */}
                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8, flexWrap: "wrap" }}>
                    {(file.has_agreement || file.can_create_shared_care_agreement) && (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.primaryLight,
                      }}>
                        <Ionicons name="document-text" size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary, marginLeft: 4 }}>
                          SharedCare
                        </Text>
                      </View>
                    )}
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: colors.accentLight,
                    }}>
                      <Ionicons name="flash" size={14} color={colors.accent} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accent, marginLeft: 4 }}>
                        QuickAccord
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

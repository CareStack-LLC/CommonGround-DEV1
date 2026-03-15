/**
 * Family Files List Screen - Matching Web Portal Design
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

interface FamilyFile {
  id: string;
  family_file_number?: string;
  title?: string;
  family_name?: string;
  status: "pending" | "active" | "archived";
  parent_a_info?: { first_name: string; last_name: string };
  parent_b_info?: { first_name: string; last_name: string };
  parent_a_role?: string;
  parent_b_role?: string;
  children?: any[];
  has_agreement?: boolean;
  has_quick_accord?: boolean;
  aria_enabled?: boolean;
  created_at: string;
}

export default function FamilyFilesScreen() {
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get time-appropriate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fetchFamilyFiles = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com"}/api/v1/family-files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const files = data.items || data || [];
        setFamilyFiles(files);
      }
    } catch (error) {
      console.error("Error fetching family files:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFamilyFiles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFamilyFiles();
  };

  // Determine user's role in the family file
  const getUserRole = (file: FamilyFile) => {
    if (file.parent_a_info?.first_name === user?.first_name) {
      return file.parent_a_role || "Parent A";
    }
    return file.parent_b_role || "Parent B";
  };

  // Get display name for family file
  const getDisplayName = (file: FamilyFile) => {
    return file.title || file.family_name || file.family_file_number || "Family File";
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.secondary }}>Loading family files...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 4 }}>
            {getGreeting()}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "700", color: colors.secondary, marginBottom: 4 }}>
            Family Files
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted }}>
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
            onPress={() => router.push("/family/create")}
          >
            <Ionicons name="add" size={20} color={colors.textInverse} />
            <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
              New Family File
            </Text>
          </TouchableOpacity>
        </View>

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
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  onPress={() => router.push(`/family/${file.id}`)}
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
                      <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary }}>
                        {getDisplayName(file)}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
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
                      backgroundColor: file.status === "active" ? colors.primaryLight : colors.warningLight,
                    }}>
                      <Ionicons
                        name={file.status === "active" ? "checkmark-circle" : "time"}
                        size={14}
                        color={file.status === "active" ? colors.primary : colors.accent}
                      />
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: file.status === "active" ? colors.primary : colors.accent,
                        marginLeft: 4,
                      }}>
                        {file.status === "active" ? "Active" : "Pending"}
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
                    <Text style={{ fontSize: 14, color: colors.secondary, marginLeft: 8 }}>
                      {getUserRole(file)}
                    </Text>
                  </View>

                  {/* Feature Tags */}
                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    {(file.has_agreement || file.status === "active") && (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.primaryLight,
                      }}>
                        <Ionicons name="document-text" size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: "500", color: colors.primary, marginLeft: 4 }}>
                          SharedCare
                        </Text>
                      </View>
                    )}
                    {file.has_quick_accord && (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: colors.warningLight,
                      }}>
                        <Ionicons name="flash" size={14} color={colors.accent} />
                        <Text style={{ fontSize: 12, fontWeight: "500", color: colors.accent, marginLeft: 4 }}>
                          QuickAccord
                        </Text>
                      </View>
                    )}
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

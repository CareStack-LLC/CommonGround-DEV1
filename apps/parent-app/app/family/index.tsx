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

// CommonGround Design System Colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const SLATE = "#475569";
const SLATE_LIGHT = "#94A3B8";
const AMBER = "#D4A574";
const AMBER_LIGHT = "#FEF3E2";
const SAND = "#F5F0E8";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE }}>Loading family files...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SAGE} />
        }
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <Text style={{ fontSize: 14, color: SLATE_LIGHT, marginBottom: 4 }}>
            {getGreeting()}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: "700", color: SLATE, marginBottom: 4 }}>
            Family Files
          </Text>
          <Text style={{ fontSize: 15, color: SLATE_LIGHT }}>
            Manage your co-parenting arrangements
          </Text>
        </View>

        {/* New Family File Button */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: SAGE,
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: SAGE,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={() => router.push("/family/create")}
          >
            <Ionicons name="add" size={20} color={WHITE} />
            <Text style={{ color: WHITE, fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
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
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}>
              <Ionicons name="folder-open-outline" size={20} color={SAGE} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "600", color: SLATE }}>
              Your Family Files
            </Text>
          </View>

          {familyFiles.length === 0 ? (
            <View style={{
              backgroundColor: WHITE,
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
                backgroundColor: SAND,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Ionicons name="folder-outline" size={32} color={SAGE} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 8 }}>
                No Family Files Yet
              </Text>
              <Text style={{ fontSize: 14, color: SLATE_LIGHT, textAlign: "center", paddingHorizontal: 16 }}>
                Create a family file to start managing custody schedules, expenses, and communication.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {familyFiles.map((file) => (
                <TouchableOpacity
                  key={file.id}
                  style={{
                    backgroundColor: WHITE,
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
                      backgroundColor: SAGE_LIGHT,
                      borderWidth: 2,
                      borderColor: SAGE,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="folder-open-outline" size={24} color={SAGE} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
                        {getDisplayName(file)}
                      </Text>
                      <Text style={{ fontSize: 13, color: SLATE_LIGHT, marginTop: 2 }}>
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
                      backgroundColor: file.status === "active" ? SAGE_LIGHT : AMBER_LIGHT,
                    }}>
                      <Ionicons
                        name={file.status === "active" ? "checkmark-circle" : "time"}
                        size={14}
                        color={file.status === "active" ? SAGE : AMBER}
                      />
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: file.status === "active" ? SAGE : AMBER,
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
                    borderBottomColor: SAND,
                  }}>
                    <Ionicons name="people-outline" size={16} color={SLATE_LIGHT} />
                    <Text style={{ fontSize: 14, color: SLATE, marginLeft: 8 }}>
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
                        backgroundColor: SAGE_LIGHT,
                      }}>
                        <Ionicons name="document-text" size={14} color={SAGE} />
                        <Text style={{ fontSize: 12, fontWeight: "500", color: SAGE, marginLeft: 4 }}>
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
                        backgroundColor: AMBER_LIGHT,
                      }}>
                        <Ionicons name="flash" size={14} color={AMBER} />
                        <Text style={{ fontSize: 12, fontWeight: "500", color: AMBER, marginLeft: 4 }}>
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

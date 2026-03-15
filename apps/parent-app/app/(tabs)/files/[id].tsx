/**
 * Family File Details Screen - Matches Web Portal Design
 * Located in tabs so bottom navigation always visible
 */
import { useState, useEffect, useCallback } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

const TOKEN_KEY = "auth_token";

// Colors not represented in the semantic theme
const PURPLE = "#8B5CF6";
const PURPLE_LIGHT = "#EDE9FE";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

interface FamilyFile {
  id: string;
  family_file_number?: string;
  title?: string;
  status: string;
  is_complete?: boolean;
  parent_a_id?: string;
  parent_b_id?: string;
  parent_a_info?: { id: string; first_name: string; last_name: string; email?: string };
  parent_b_info?: { id: string; first_name: string; last_name: string; email?: string };
  parent_a_role?: string;
  parent_b_role?: string;
  children?: Child[];
  state?: string;
  county?: string;
  aria_enabled?: boolean;
  created_at: string;
}

interface Child {
  id: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  photo_url?: string;
}

interface QuickAccord {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Agreement {
  id: string;
  title?: string;
  status: string;
  created_at: string;
}

export default function FamilyFileDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [familyFile, setFamilyFile] = useState<FamilyFile | null>(null);
  const [quickAccords, setQuickAccords] = useState<QuickAccord[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    // Get token from SecureStore
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      console.log("No auth token available");
      setLoading(false);
      return;
    }

    try {
      // Fetch family file details
      const fileRes = await fetch(`${API_URL}/api/v1/family-files/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        setFamilyFile(fileData);
      }

      // Fetch quick accords
      const accordsRes = await fetch(`${API_URL}/api/v1/quick-accords/family-file/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (accordsRes.ok) {
        const accordsData = await accordsRes.json();
        setQuickAccords(accordsData.items || accordsData || []);
      }

      // Fetch agreements
      const agreementsRes = await fetch(`${API_URL}/api/v1/family-files/${id}/agreements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (agreementsRes.ok) {
        const agreementsData = await agreementsRes.json();
        setAgreements(agreementsData.items || agreementsData || []);
      }
    } catch (err) {
      console.error("Error fetching family file data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

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

  const getAccordStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return { bg: colors.primaryLight, color: colors.primary };
      case "pending":
      case "pending_approval":
        return { bg: colors.accentLight, color: colors.accent };
      default:
        return { bg: colors.backgroundSecondary, color: colors.textMuted };
    }
  };

  const getAccordStatusText = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return "Active";
      case "pending":
      case "pending_approval":
        return "Pending";
      default:
        return status;
    }
  };

  const isCurrentUser = (parentId?: string) => {
    return parentId && user?.id === parentId;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.secondary, fontWeight: "500" }}>Loading family file...</Text>
      </SafeAreaView>
    );
  }

  if (!familyFile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={{ marginTop: 16, color: colors.secondary, fontWeight: "500" }}>Family file not found</Text>
        <TouchableOpacity
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.textInverse, fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.backgroundSecondary,
        }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.primaryLight,
            borderWidth: 2,
            borderColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}>
            <Ionicons name="folder-open" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.secondary }}>
              {familyFile.title || "Family File"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, fontWeight: "500" }}>
              {familyFile.family_file_number}
            </Text>
          </View>
          <TouchableOpacity style={{ padding: 8 }}>
            <Ionicons name="settings-outline" size={24} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary, marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { icon: "wallet-outline", label: "ClearFund\nRequest", color: colors.primary, bgColor: colors.primaryLight },
              { icon: "calendar-outline", label: "New\nEvent", color: PURPLE, bgColor: PURPLE_LIGHT },
              { icon: "chatbubble-outline", label: "Messages", color: colors.accent, bgColor: colors.accentLight },
              { icon: "videocam-outline", label: "KidComs", color: colors.primary, bgColor: colors.primaryLight, badge: 0 },
            ].map((action, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: action.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}>
                  <Ionicons name={action.icon as any} size={20} color={action.color} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.secondary, textAlign: "center" }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* QuickAccords Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: colors.accentLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}>
                <Ionicons name="flash" size={16} color={colors.accent} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>QuickAccords</Text>
            </View>
            <TouchableOpacity style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.accent,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textInverse, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: "hidden" }}>
            {quickAccords.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>No QuickAccords yet</Text>
              </View>
            ) : (
              quickAccords.slice(0, 3).map((accord, index) => {
                const statusStyle = getAccordStatusColor(accord.status);
                return (
                  <TouchableOpacity
                    key={accord.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: index < quickAccords.length - 1 ? 1 : 0,
                      borderBottomColor: colors.backgroundSecondary,
                    }}
                    onPress={() => router.push(`/accords/${accord.id}`)}
                  >
                    <Ionicons name="flash" size={18} color={colors.accent} style={{ marginRight: 12 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.secondary }}>
                      {accord.title}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      backgroundColor: statusStyle.bg,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: statusStyle.color }}>
                        {getAccordStatusText(accord.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })
            )}
            {quickAccords.length > 3 && (
              <TouchableOpacity style={{ padding: 14, alignItems: "center", borderTopWidth: 1, borderTopColor: colors.backgroundSecondary }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>View All ({quickAccords.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SharedCare Agreements Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}>
                <Ionicons name="document-text" size={16} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>SharedCare Agreements</Text>
            </View>
            <TouchableOpacity style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Ionicons name="add" size={16} color={colors.textInverse} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textInverse, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: "hidden" }}>
            {agreements.length === 0 ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>No agreements yet</Text>
              </View>
            ) : (
              agreements.slice(0, 3).map((agreement, index) => {
                const statusStyle = getAccordStatusColor(agreement.status);
                return (
                  <TouchableOpacity
                    key={agreement.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderBottomWidth: index < agreements.length - 1 ? 1 : 0,
                      borderBottomColor: colors.backgroundSecondary,
                    }}
                    onPress={() => router.push(`/agreements/${agreement.id}`)}
                  >
                    <Ionicons name="document-text" size={18} color={colors.primary} style={{ marginRight: 12 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "500", color: colors.secondary }}>
                      {agreement.title || "Custody Agreement"}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      backgroundColor: statusStyle.bg,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: statusStyle.color }}>
                        {getAccordStatusText(agreement.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Parents Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: PURPLE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="people" size={16} color={PURPLE} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Parents</Text>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: "hidden" }}>
            {/* Parent A */}
            {familyFile.parent_a_info && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderBottomWidth: familyFile.parent_b_info ? 1 : 0,
                borderBottomColor: colors.backgroundSecondary,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>
                    {familyFile.parent_a_info.first_name?.[0]}{familyFile.parent_a_info.last_name?.[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondary }}>
                    {familyFile.parent_a_info.first_name} {familyFile.parent_a_info.last_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {getRoleName(familyFile.parent_a_role)}
                  </Text>
                </View>
                {isCurrentUser(familyFile.parent_a_id) && (
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    backgroundColor: colors.primaryLight,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>You</Text>
                  </View>
                )}
              </View>
            )}

            {/* Parent B */}
            {familyFile.parent_b_info && (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.accentLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.accent }}>
                    {familyFile.parent_b_info.first_name?.[0]}{familyFile.parent_b_info.last_name?.[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondary }}>
                    {familyFile.parent_b_info.first_name} {familyFile.parent_b_info.last_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {getRoleName(familyFile.parent_b_role)}
                  </Text>
                </View>
                {isCurrentUser(familyFile.parent_b_id) && (
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    backgroundColor: colors.primaryLight,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: colors.primary }}>You</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Children Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: colors.primaryLight,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}>
                <Ionicons name="happy" size={16} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Children</Text>
            </View>
            <TouchableOpacity style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="add" size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: "hidden" }}>
            {(!familyFile.children || familyFile.children.length === 0) ? (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>No children added yet</Text>
              </View>
            ) : (
              familyFile.children.map((child, index) => (
                <View
                  key={child.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderBottomWidth: index < familyFile.children!.length - 1 ? 1 : 0,
                    borderBottomColor: colors.backgroundSecondary,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primaryLight,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}>
                    <Ionicons name="happy" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.secondary }}>
                      {child.first_name} {child.last_name}
                    </Text>
                    {child.date_of_birth && (
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {new Date(child.date_of_birth).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Details Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: colors.backgroundSecondary,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="information-circle" size={16} color={colors.textMuted} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Details</Text>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Location</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.secondary }}>
                {familyFile.county && `${familyFile.county}, `}{familyFile.state || "Not set"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>ARIA Enabled</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: familyFile.aria_enabled ? colors.primary : colors.secondary }}>
                {familyFile.aria_enabled ? "Yes" : "No"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Created</Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.secondary }}>
                {new Date(familyFile.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Legal Team Section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: PURPLE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="briefcase" size={16} color={PURPLE} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.secondary }}>Legal Team</Text>
          </View>

          <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, padding: 20, alignItems: "center" }}>
            <Ionicons name="briefcase-outline" size={32} color={colors.textMuted} />
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, fontWeight: "500" }}>
              No legal professionals yet
            </Text>
            <TouchableOpacity style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>Browse Firm Directory</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

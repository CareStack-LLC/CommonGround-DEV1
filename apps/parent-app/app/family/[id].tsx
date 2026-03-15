/**
 * Family File Details Screen - Matching Web Portal Design
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
import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/theme";

interface QuickAccord {
  id: string;
  accord_number: string;
  title: string;
  status: string;
  purpose_category: string;
}

interface Agreement {
  id: string;
  agreement_number?: string;
  title: string;
  status: string;
  created_at: string;
}

interface Child {
  id: string;
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  status?: string;
}

interface Professional {
  id: string;
  name: string;
  role: string;
  firm_name?: string;
}

interface FamilyFileDetail {
  id: string;
  family_file_number?: string;
  title?: string;
  family_name?: string;
  state?: string;
  status: "pending" | "active" | "archived";
  aria_enabled?: boolean;
  parent_a_id?: string;
  parent_a_info?: { id: string; first_name: string; last_name: string; email: string };
  parent_b_id?: string;
  parent_b_info?: { id: string; first_name: string; last_name: string; email: string };
  parent_b_invited_at?: string;
  parent_b_email?: string;
  children?: Child[];
  created_at: string;
}

export default function FamilyFileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const { colors } = useTheme();
  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [quickAccords, setQuickAccords] = useState<QuickAccord[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

  const fetchAllData = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch family file details
      const [fileRes, accordsRes, agreementsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/family-files/${id}`, { headers }),
        fetch(`${API_URL}/api/v1/quick-accords/family-file/${id}`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/v1/family-files/${id}/agreements`, { headers }).catch(() => null),
      ]);

      if (fileRes.ok) {
        const data = await fileRes.json();
        setFamilyFile(data);
      }

      if (accordsRes?.ok) {
        const data = await accordsRes.json();
        setQuickAccords(data.items || data || []);
      }

      if (agreementsRes?.ok) {
        const data = await agreementsRes.json();
        setAgreements(data.items || data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const getDisplayName = () => {
    return familyFile?.title || familyFile?.family_name || "Family File";
  };

  const isUserParentA = familyFile?.parent_a_id === user?.id ||
    familyFile?.parent_a_info?.first_name === user?.first_name;

  // Map backend status to display status
  const mapAccordStatus = (status: string) => {
    if (status === "approved") return "approved";
    if (status === "pending") return "pending";
    return status;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.secondary }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!familyFile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.secondary }}>Family file not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceElevated }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: colors.backgroundSecondary,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 12,
        }}>
          <Ionicons name="people" size={20} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary }}>
            {getDisplayName()}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {familyFile.family_file_number || "FF-000000"}
          </Text>
        </View>
        <TouchableOpacity style={{ padding: 8 }}>
          <Ionicons name="settings-outline" size={22} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Quick Actions Section */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary, marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <QuickActionRow
              icon="wallet"
              iconColor={colors.primary}
              title="ClearFund Request"
              subtitle="Request expense reimbursement"
              onPress={() => router.push(`/expenses/create?familyFileId=${id}`)}
              colors={colors}
            />
            <QuickActionRow
              icon="calendar"
              iconColor={colors.accent}
              title="New Event"
              subtitle="Add to shared calendar"
              onPress={() => router.push(`/events/create?familyFileId=${id}`)}
              colors={colors}
            />
            <QuickActionRow
              icon="chatbubble"
              iconColor={colors.secondary}
              title="Messages"
              subtitle="Chat with your co-parent"
              onPress={() => router.push(`/messages?familyFileId=${id}`)}
              colors={colors}
            />
            <QuickActionRow
              icon="videocam"
              iconColor={colors.textMuted}
              title="KidComs"
              subtitle="Video calls for kids"
              badge="Complete"
              onPress={() => router.push(`/recordings?familyFileId=${id}`)}
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* QuickAccords Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="flash" size={16} color={colors.textInverse} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: colors.secondary }}>
              QuickAccords
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
              onPress={() => router.push(`/accords/create?familyId=${id}`)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
            Situational agreements
          </Text>

          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {quickAccords.length > 0 ? (
              <>
                {quickAccords.slice(0, 3).map((accord, index) => (
                  <TouchableOpacity
                    key={accord.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderBottomWidth: index < Math.min(quickAccords.length, 3) - 1 ? 1 : 0,
                      borderBottomColor: colors.backgroundSecondary,
                    }}
                    onPress={() => router.push(`/accords/${accord.id}?familyId=${id}`)}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colors.primaryLight,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
                        {accord.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {accord.accord_number}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: mapAccordStatus(accord.status) === "approved" ? colors.primaryLight : colors.backgroundSecondary,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: mapAccordStatus(accord.status) === "approved" ? colors.primary : colors.textMuted,
                      }}>
                        {mapAccordStatus(accord.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ padding: 14, alignItems: "center" }}
                  onPress={() => router.push("/accords")}
                >
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>
                    View All QuickAccords ({quickAccords.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>No quick accords yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* SharedCare Agreements Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="document-text" size={16} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary }}>
                SharedCare Agreements
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                Comprehensive co-parenting agreements
              </Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.primary,
              }}
              onPress={() => router.push(`/agreements/create?familyId=${id}`)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {agreements.length > 0 ? (
              <>
                {agreements.slice(0, 3).map((agreement, index) => (
                  <TouchableOpacity
                    key={agreement.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderBottomWidth: index < Math.min(agreements.length, 3) - 1 ? 1 : 0,
                      borderBottomColor: colors.backgroundSecondary,
                    }}
                    onPress={() => router.push(`/agreements/${agreement.id}?familyId=${id}`)}
                  >
                    <View style={{
                      width: 4,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: agreement.status === "active" ? colors.primary : colors.textMuted,
                      marginRight: 12,
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
                        {agreement.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {format(new Date(agreement.created_at), "M/d/yyyy")}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: agreement.status === "active" ? colors.primaryLight : colors.backgroundSecondary,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: agreement.status === "active" ? colors.primary : colors.textMuted,
                        textTransform: "capitalize",
                      }}>
                        {agreement.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ padding: 14, alignItems: "center" }}
                  onPress={() => router.push("/agreements")}
                >
                  <Text style={{ fontSize: 14, color: colors.textMuted }}>
                    View All Agreements ({agreements.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>No agreements yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Parents Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="people" size={16} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary }}>
              Parents
            </Text>
          </View>

          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {/* Parent A */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: colors.textInverse, fontWeight: "600", fontSize: 14 }}>PA</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
                  {familyFile.parent_a_info?.first_name || "Parent A"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {isUserParentA ? "You" : "Co-parent"}
                </Text>
              </View>
              {isUserParentA && (
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: colors.primaryLight,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: colors.primary }}>You</Text>
                </View>
              )}
            </View>

            {/* Parent B */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: familyFile.parent_b_info ? colors.accent : colors.backgroundSecondary,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: familyFile.parent_b_info ? colors.textInverse : colors.textMuted, fontWeight: "600", fontSize: 14 }}>
                  {familyFile.parent_b_info?.first_name?.charAt(0) || "P"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
                  {familyFile.parent_b_info?.first_name || "Parent"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  {familyFile.parent_b_info ? (!isUserParentA ? "You" : "Co-parent") : "Not invited"}
                </Text>
              </View>
              {!isUserParentA && familyFile.parent_b_info && (
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: colors.primaryLight,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: colors.primary }}>You</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Children Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.warningLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="heart" size={16} color={colors.accent} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: colors.secondary }}>
              Children
            </Text>
            <TouchableOpacity style={{ padding: 4 }}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            {familyFile.children && familyFile.children.length > 0 ? (
              familyFile.children.map((child, index) => (
                <View
                  key={child.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderBottomWidth: index < familyFile.children!.length - 1 ? 1 : 0,
                    borderBottomColor: colors.backgroundSecondary,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ color: colors.textInverse, fontWeight: "600", fontSize: 14 }}>
                      {child.first_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
                      {child.first_name} {child.last_name || ""}
                    </Text>
                    {child.date_of_birth && (
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                        {child.date_of_birth}
                      </Text>
                    )}
                  </View>
                  {child.status && (
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: child.status === "approved" ? colors.primaryLight : colors.warningLight,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: "500",
                        color: child.status === "approved" ? colors.primary : colors.accent,
                      }}>
                        {child.status.replace("_", " ")}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                </View>
              ))
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>No children added yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.secondary, marginBottom: 16 }}>
            Details
          </Text>
          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <DetailRow label="Location" value={familyFile.state || "\u2014"} colors={colors} />
            <DetailRow
              label="ARIA"
              value={familyFile.aria_enabled ? "Enabled" : "Disabled"}
              valueColor={familyFile.aria_enabled ? colors.primary : colors.textMuted}
              colors={colors}
            />
            <DetailRow
              label="Created"
              value={format(new Date(familyFile.created_at), "M/d/yyyy")}
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Legal Team Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="briefcase" size={16} color={colors.primary} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: colors.secondary }}>
              Legal Team
            </Text>
            <TouchableOpacity style={{ padding: 4 }}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Ionicons name="briefcase-outline" size={40} color={colors.textMuted} />
            <Text style={{ fontSize: 16, fontWeight: "500", color: colors.secondary, marginTop: 12 }}>
              No professionals yet
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
              Invite your attorney or mediator
            </Text>
            <TouchableOpacity style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "500" }}>
                <Ionicons name="search" size={14} /> Browse Firm Directory
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Quick Action Row Component
function QuickActionRow({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
  onPress,
  isLast = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  isLast?: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.backgroundSecondary,
      }}
      onPress={onPress}
    >
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: iconColor,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Ionicons name={icon} size={20} color={colors.textInverse} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: colors.secondary }}>
            {title}
          </Text>
          {badge && (
            <View style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              backgroundColor: colors.primaryLight,
            }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: colors.primary }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

// Detail Row Component
function DetailRow({
  label,
  value,
  valueColor,
  isLast = false,
  colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
  colors: any;
}) {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.backgroundSecondary,
    }}>
      <Text style={{ fontSize: 14, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: valueColor || colors.secondary }}>{value}</Text>
    </View>
  );
}

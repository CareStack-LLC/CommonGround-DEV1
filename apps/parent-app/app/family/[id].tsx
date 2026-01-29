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
const GRAY = "#9CA3AF";

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
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!familyFile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: SLATE }}>Family file not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["top"]}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: WHITE,
        borderBottomWidth: 1,
        borderBottomColor: SAND,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={SLATE} />
        </TouchableOpacity>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: SAGE,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 12,
        }}>
          <Ionicons name="people" size={20} color={WHITE} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
            {getDisplayName()}
          </Text>
          <Text style={{ fontSize: 13, color: SLATE_LIGHT }}>
            {familyFile.family_file_number || "FF-000000"}
          </Text>
        </View>
        <TouchableOpacity style={{ padding: 8 }}>
          <Ionicons name="settings-outline" size={22} color={SLATE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SAGE} />
        }
      >
        {/* Quick Actions Section */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{
            backgroundColor: WHITE,
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
              iconColor={SAGE}
              title="ClearFund Request"
              subtitle="Request expense reimbursement"
              onPress={() => router.push(`/expenses/create?familyFileId=${id}`)}
            />
            <QuickActionRow
              icon="calendar"
              iconColor={AMBER}
              title="New Event"
              subtitle="Add to shared calendar"
              onPress={() => router.push(`/events/create?familyFileId=${id}`)}
            />
            <QuickActionRow
              icon="chatbubble"
              iconColor={SLATE}
              title="Messages"
              subtitle="Chat with your co-parent"
              onPress={() => router.push(`/messages?familyFileId=${id}`)}
            />
            <QuickActionRow
              icon="videocam"
              iconColor={GRAY}
              title="KidComs"
              subtitle="Video calls for kids"
              badge="Complete"
              onPress={() => router.push(`/recordings?familyFileId=${id}`)}
              isLast
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
              backgroundColor: AMBER,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="flash" size={16} color={WHITE} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: SLATE }}>
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
                borderColor: SAGE,
              }}
              onPress={() => router.push(`/accords/create?familyId=${id}`)}
            >
              <Ionicons name="add" size={16} color={SAGE} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: SAGE, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 13, color: SLATE_LIGHT, marginBottom: 12 }}>
            Situational agreements
          </Text>

          <View style={{
            backgroundColor: WHITE,
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
                      borderBottomColor: SAND,
                    }}
                    onPress={() => router.push(`/accords/${accord.id}?familyId=${id}`)}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: SAGE_LIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Ionicons name="swap-horizontal" size={18} color={SAGE} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
                        {accord.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: SLATE_LIGHT, marginTop: 2 }}>
                        {accord.accord_number}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: mapAccordStatus(accord.status) === "approved" ? SAGE_LIGHT : SAND,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: mapAccordStatus(accord.status) === "approved" ? SAGE : SLATE_LIGHT,
                      }}>
                        {mapAccordStatus(accord.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={SLATE_LIGHT} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ padding: 14, alignItems: "center" }}
                  onPress={() => router.push("/accords")}
                >
                  <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                    View All QuickAccords ({quickAccords.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>No quick accords yet</Text>
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
              backgroundColor: SAGE,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="document-text" size={16} color={WHITE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
                SharedCare Agreements
              </Text>
              <Text style={{ fontSize: 13, color: SLATE_LIGHT }}>
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
                borderColor: SAGE,
              }}
              onPress={() => router.push(`/agreements/create?familyId=${id}`)}
            >
              <Ionicons name="add" size={16} color={SAGE} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: SAGE, marginLeft: 4 }}>New</Text>
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: WHITE,
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
                      borderBottomColor: SAND,
                    }}
                    onPress={() => router.push(`/agreements/${agreement.id}?familyId=${id}`)}
                  >
                    <View style={{
                      width: 4,
                      height: 36,
                      borderRadius: 2,
                      backgroundColor: agreement.status === "active" ? SAGE : SLATE_LIGHT,
                      marginRight: 12,
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
                        {agreement.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: SLATE_LIGHT, marginTop: 2 }}>
                        {format(new Date(agreement.created_at), "M/d/yyyy")}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: agreement.status === "active" ? SAGE_LIGHT : SAND,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: agreement.status === "active" ? SAGE : SLATE_LIGHT,
                        textTransform: "capitalize",
                      }}>
                        {agreement.status}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={SLATE_LIGHT} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ padding: 14, alignItems: "center" }}
                  onPress={() => router.push("/agreements")}
                >
                  <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>
                    View All Agreements ({agreements.length})
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>No agreements yet</Text>
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
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="people" size={16} color={SAGE} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE }}>
              Parents
            </Text>
          </View>

          <View style={{
            backgroundColor: WHITE,
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
                backgroundColor: SAGE,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: WHITE, fontWeight: "600", fontSize: 14 }}>PA</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
                  {familyFile.parent_a_info?.first_name || "Parent A"}
                </Text>
                <Text style={{ fontSize: 13, color: SLATE_LIGHT }}>
                  {isUserParentA ? "You" : "Co-parent"}
                </Text>
              </View>
              {isUserParentA && (
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: SAGE_LIGHT,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: SAGE }}>You</Text>
                </View>
              )}
            </View>

            {/* Parent B */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: familyFile.parent_b_info ? AMBER : SAND,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{ color: familyFile.parent_b_info ? WHITE : SLATE_LIGHT, fontWeight: "600", fontSize: 14 }}>
                  {familyFile.parent_b_info?.first_name?.charAt(0) || "P"}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
                  {familyFile.parent_b_info?.first_name || "Parent"}
                </Text>
                <Text style={{ fontSize: 13, color: SLATE_LIGHT }}>
                  {familyFile.parent_b_info ? (!isUserParentA ? "You" : "Co-parent") : "Not invited"}
                </Text>
              </View>
              {!isUserParentA && familyFile.parent_b_info && (
                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: SAGE_LIGHT,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: SAGE }}>You</Text>
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
              backgroundColor: AMBER_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="heart" size={16} color={AMBER} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: SLATE }}>
              Children
            </Text>
            <TouchableOpacity style={{ padding: 4 }}>
              <Ionicons name="add" size={22} color={SAGE} />
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: WHITE,
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
                    borderBottomColor: SAND,
                  }}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: SAGE,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Text style={{ color: WHITE, fontWeight: "600", fontSize: 14 }}>
                      {child.first_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
                      {child.first_name} {child.last_name || ""}
                    </Text>
                    {child.date_of_birth && (
                      <Text style={{ fontSize: 12, color: SLATE_LIGHT, marginTop: 2 }}>
                        {child.date_of_birth}
                      </Text>
                    )}
                  </View>
                  {child.status && (
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: child.status === "approved" ? SAGE_LIGHT : AMBER_LIGHT,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: "500",
                        color: child.status === "approved" ? SAGE : AMBER,
                      }}>
                        {child.status.replace("_", " ")}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={SLATE_LIGHT} style={{ marginLeft: 8 }} />
                </View>
              ))
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>No children added yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Section */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: SLATE, marginBottom: 16 }}>
            Details
          </Text>
          <View style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <DetailRow label="Location" value={familyFile.state || "—"} />
            <DetailRow
              label="ARIA"
              value={familyFile.aria_enabled ? "Enabled" : "Disabled"}
              valueColor={familyFile.aria_enabled ? SAGE : SLATE_LIGHT}
            />
            <DetailRow
              label="Created"
              value={format(new Date(familyFile.created_at), "M/d/yyyy")}
              isLast
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
              backgroundColor: SAGE_LIGHT,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}>
              <Ionicons name="briefcase" size={16} color={SAGE} />
            </View>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: SLATE }}>
              Legal Team
            </Text>
            <TouchableOpacity style={{ padding: 4 }}>
              <Ionicons name="add" size={22} color={SAGE} />
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <Ionicons name="briefcase-outline" size={40} color={SLATE_LIGHT} />
            <Text style={{ fontSize: 16, fontWeight: "500", color: SLATE, marginTop: 12 }}>
              No professionals yet
            </Text>
            <Text style={{ fontSize: 13, color: SLATE_LIGHT, marginTop: 4 }}>
              Invite your attorney or mediator
            </Text>
            <TouchableOpacity style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, color: SAGE, fontWeight: "500" }}>
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: SAND,
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
        <Ionicons name={icon} size={20} color={WHITE} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: SLATE }}>
            {title}
          </Text>
          {badge && (
            <View style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              backgroundColor: SAGE_LIGHT,
            }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: SAGE }}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: SLATE_LIGHT, marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={SLATE_LIGHT} />
    </TouchableOpacity>
  );
}

// Detail Row Component
function DetailRow({
  label,
  value,
  valueColor = SLATE,
  isLast = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: SAND,
    }}>
      <Text style={{ fontSize: 14, color: SLATE_LIGHT }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: valueColor }}>{value}</Text>
    </View>
  );
}

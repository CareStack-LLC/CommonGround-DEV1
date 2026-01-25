import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "@/providers/AuthProvider";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  slateDark: "#334155",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

interface FamilyFileDetail {
  id: string;
  family_name: string;
  state?: string;
  status: "pending" | "active" | "archived";
  parent_a?: { id: string; first_name: string; last_name: string; email: string };
  parent_b?: { id: string; first_name: string; last_name: string; email: string };
  invitation_email?: string;
  children?: { id: string; first_name: string; last_name: string; date_of_birth?: string }[];
  created_at: string;
  has_agreement?: boolean;
}

export default function FamilyFileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFamilyFile = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/family-files/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFamilyFile(data);
      } else {
        Alert.alert("Error", "Failed to load family file details.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching family file:", error);
      Alert.alert("Error", "An unexpected error occurred.");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFamilyFile();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFamilyFile();
  };

  const isParentA = familyFile?.parent_a?.id === user?.id;
  const coParent = isParentA ? familyFile?.parent_b : familyFile?.parent_a;
  const canInvite = familyFile?.status === "pending" && !familyFile?.invitation_email && isParentA;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4" style={{ color: colors.slate }}>Loading family file...</Text>
      </SafeAreaView>
    );
  }

  if (!familyFile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <Text style={{ color: colors.slate }}>Family file not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.sage}
          />
        }
      >
        {/* Header Card */}
        <View className="rounded-xl p-5 mb-4" style={{ backgroundColor: "white" }}>
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold mb-1" style={{ color: colors.slate }}>
                {familyFile.family_name}
              </Text>
              {familyFile.state && (
                <Text className="text-sm" style={{ color: colors.slate }}>
                  {familyFile.state}
                </Text>
              )}
            </View>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: familyFile.status === "active" ? `${colors.sage}20` : `${colors.amber}20` }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: familyFile.status === "active" ? colors.sage : colors.amber }}
              >
                {familyFile.status === "active" ? "Active" : "Pending"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color={colors.slate} />
            <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
              Created {new Date(familyFile.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Parents Section */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
          <Text className="font-semibold text-lg mb-4" style={{ color: colors.slate }}>
            Parents
          </Text>

          {/* You */}
          <View className="flex-row items-center mb-4">
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.sage }}
            >
              <Text className="text-white font-semibold text-lg">
                {user?.first_name?.charAt(0) || "Y"}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-medium" style={{ color: colors.slate }}>
                {user?.first_name} {user?.last_name} (You)
              </Text>
              <Text className="text-sm" style={{ color: colors.slate }}>
                {user?.email}
              </Text>
            </View>
          </View>

          {/* Co-Parent or Invitation */}
          {coParent ? (
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.amber }}
              >
                <Text className="text-white font-semibold text-lg">
                  {coParent.first_name.charAt(0)}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-medium" style={{ color: colors.slate }}>
                  {coParent.first_name} {coParent.last_name}
                </Text>
                <Text className="text-sm" style={{ color: colors.slate }}>
                  {coParent.email}
                </Text>
              </View>
            </View>
          ) : familyFile.invitation_email ? (
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.sand }}
              >
                <Ionicons name="mail" size={24} color={colors.amber} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-medium" style={{ color: colors.slate }}>
                  Invitation Pending
                </Text>
                <Text className="text-sm" style={{ color: colors.slate }}>
                  {familyFile.invitation_email}
                </Text>
              </View>
            </View>
          ) : canInvite ? (
            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl border-2 border-dashed"
              style={{ borderColor: colors.sage }}
              onPress={() => router.push({
                pathname: "/family/invite",
                params: { familyId: familyFile.id, familyName: familyFile.family_name },
              })}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.sand }}
              >
                <Ionicons name="person-add" size={20} color={colors.sage} />
              </View>
              <Text className="ml-3 font-medium" style={{ color: colors.sage }}>
                Invite Co-Parent
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Children Section */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-semibold text-lg" style={{ color: colors.slate }}>
              Children
            </Text>
            <TouchableOpacity
              className="flex-row items-center px-3 py-1 rounded-lg"
              style={{ backgroundColor: colors.sand }}
              onPress={() => Alert.alert("Coming Soon", "Adding children will be available soon.")}
            >
              <Ionicons name="add" size={16} color={colors.sage} />
              <Text className="ml-1 text-sm font-medium" style={{ color: colors.sage }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {familyFile.children && familyFile.children.length > 0 ? (
            <View className="space-y-3">
              {familyFile.children.map((child, index) => (
                <View key={child.id || index} className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.sand }}
                  >
                    <Ionicons name="heart" size={20} color={colors.amber} />
                  </View>
                  <View className="ml-3">
                    <Text className="font-medium" style={{ color: colors.slate }}>
                      {child.first_name} {child.last_name}
                    </Text>
                    {child.date_of_birth && (
                      <Text className="text-sm" style={{ color: colors.slate }}>
                        DOB: {child.date_of_birth}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-6">
              <Ionicons name="heart-outline" size={32} color={colors.sand} />
              <Text className="mt-2" style={{ color: colors.slate }}>
                No children added yet
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: "white" }}>
          <Text className="font-semibold text-lg mb-4" style={{ color: colors.slate }}>
            Quick Actions
          </Text>

          <View className="space-y-2">
            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl"
              style={{ backgroundColor: colors.sand }}
              onPress={() => router.push("/(tabs)/schedule")}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.sage }}
              >
                <Ionicons name="calendar" size={20} color="white" />
              </View>
              <Text className="ml-3 font-medium" style={{ color: colors.slate }}>
                View Custody Schedule
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.slate} className="ml-auto" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl"
              style={{ backgroundColor: colors.sand }}
              onPress={() => router.push("/(tabs)/expenses")}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.amber }}
              >
                <Ionicons name="wallet" size={20} color="white" />
              </View>
              <Text className="ml-3 font-medium" style={{ color: colors.slate }}>
                Manage Expenses
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.slate} className="ml-auto" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl"
              style={{ backgroundColor: colors.sand }}
              onPress={() => router.push("/(tabs)/messages")}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.slate }}
              >
                <Ionicons name="chatbubbles" size={20} color="white" />
              </View>
              <Text className="ml-3 font-medium" style={{ color: colors.slate }}>
                Send Message
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.slate} className="ml-auto" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Family File Settings */}
        <TouchableOpacity
          className="rounded-xl p-4 flex-row items-center justify-between"
          style={{ backgroundColor: "white" }}
          onPress={() => Alert.alert("Coming Soon", "Family file settings will be available soon.")}
        >
          <View className="flex-row items-center">
            <Ionicons name="settings-outline" size={24} color={colors.slate} />
            <Text className="ml-3 font-medium" style={{ color: colors.slate }}>
              Family File Settings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.slate} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  slateDark: "#334155",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

interface FamilyFile {
  id: string;
  family_name: string;
  status: "pending" | "active" | "archived";
  parent_a?: { first_name: string; last_name: string };
  parent_b?: { first_name: string; last_name: string };
  invitation_email?: string;
  children_count?: number;
  created_at: string;
}

export default function FamilyFilesScreen() {
  const { user, token } = useAuth();
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFamilyFiles = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "https://commonground-api.onrender.com"}/api/v1/family-files`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFamilyFiles(data.items || data || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.sage;
      case "pending":
        return colors.amber;
      case "archived":
        return colors.slate;
      default:
        return colors.slate;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending":
        return "Pending Co-Parent";
      case "archived":
        return "Archived";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
        <Text className="mt-4 text-slate-600">Loading family files...</Text>
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
        {/* Header Info */}
        <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: colors.sand }}>
          <View className="flex-row items-center mb-2">
            <Ionicons name="folder-open" size={24} color={colors.sage} />
            <Text className="ml-2 text-lg font-semibold" style={{ color: colors.slate }}>
              Your Family Files
            </Text>
          </View>
          <Text className="text-sm" style={{ color: colors.slate }}>
            Family files contain all your co-parenting information including schedules,
            expenses, agreements, and communication history.
          </Text>
        </View>

        {/* Family Files List */}
        {familyFiles.length === 0 ? (
          <View className="items-center py-12">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.sand }}
            >
              <Ionicons name="folder-outline" size={40} color={colors.sage} />
            </View>
            <Text className="text-lg font-semibold mb-2" style={{ color: colors.slate }}>
              No Family Files Yet
            </Text>
            <Text className="text-center px-8 mb-6" style={{ color: colors.slate }}>
              Create a family file to start tracking custody schedules, expenses,
              and communication with your co-parent.
            </Text>
            <TouchableOpacity
              className="px-6 py-3 rounded-xl flex-row items-center"
              style={{ backgroundColor: colors.sage }}
              onPress={() => router.push("/family/create")}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Create Family File</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-4">
            {familyFiles.map((file) => (
              <TouchableOpacity
                key={file.id}
                className="rounded-xl p-4 shadow-sm"
                style={{ backgroundColor: "white" }}
                onPress={() => router.push(`/family/${file.id}`)}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold" style={{ color: colors.slate }}>
                      {file.family_name}
                    </Text>
                    <View
                      className="px-2 py-1 rounded-full self-start mt-1"
                      style={{ backgroundColor: `${getStatusColor(file.status)}20` }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: getStatusColor(file.status) }}
                      >
                        {getStatusLabel(file.status)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.slate} />
                </View>

                {/* Parents */}
                <View className="flex-row items-center mb-2">
                  <Ionicons name="people" size={16} color={colors.slate} />
                  <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
                    {file.parent_a?.first_name || user?.first_name || "You"}
                    {file.parent_b?.first_name
                      ? ` & ${file.parent_b.first_name}`
                      : file.invitation_email
                        ? ` (Pending: ${file.invitation_email})`
                        : ""}
                  </Text>
                </View>

                {/* Children count */}
                {file.children_count && file.children_count > 0 && (
                  <View className="flex-row items-center">
                    <Ionicons name="heart" size={16} color={colors.amber} />
                    <Text className="ml-2 text-sm" style={{ color: colors.slate }}>
                      {file.children_count} {file.children_count === 1 ? "child" : "children"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Add New Button */}
            <TouchableOpacity
              className="rounded-xl p-4 flex-row items-center justify-center border-2 border-dashed"
              style={{ borderColor: colors.sage }}
              onPress={() => router.push("/family/create")}
            >
              <Ionicons name="add-circle" size={24} color={colors.sage} />
              <Text className="ml-2 font-semibold" style={{ color: colors.sage }}>
                Create New Family File
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

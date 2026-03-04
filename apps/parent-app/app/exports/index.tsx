/**
 * Exports List Screen
 *
 * Displays list of court-ready export packages with status and actions
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useFamilyFile } from "@/hooks/useFamilyFile";
import { parent } from "@commonground/api-client";
import type { CaseExport } from "@commonground/api-client/src/api/parent/exports";

// Design colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";
const SLATE = "#475569";

export default function ExportsListScreen() {
  const { familyFile } = useFamilyFile();
  const [exports, setExports] = useState<CaseExport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchExports = useCallback(async () => {
    if (!familyFile?.id) return;

    try {
      const response = await parent.exports.listExports(familyFile.id);
      setExports(response.exports);
    } catch (error) {
      console.error("Failed to fetch exports:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [familyFile?.id]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchExports();
  };

  const handleDelete = async (exportId: string) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to delete this report? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await parent.exports.deleteExport(exportId);
              setExports((prev) => prev.filter((e) => e.id !== exportId));
            } catch (error) {
              Alert.alert("Error", "Failed to delete report");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "downloaded":
        return "#10B981";
      case "generating":
        return "#F59E0B";
      case "failed":
        return "#EF4444";
      default:
        return SLATE;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Ready";
      case "downloaded":
        return "Downloaded";
      case "generating":
        return "Generating...";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderExportItem = ({ item }: { item: CaseExport }) => (
    <TouchableOpacity
      style={{
        backgroundColor: WHITE,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
      onPress={() => router.push(`/exports/${item.id}`)}
      onLongPress={() => handleDelete(item.id)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Ionicons
              name={item.package_type === "court" ? "briefcase" : "search"}
              size={16}
              color={SAGE}
            />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1e293b", marginLeft: 8 }}>
              {item.package_type === "court" ? "Court Package" : "Investigation"}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: SLATE, marginBottom: 8 }}>
            {formatDate(item.date_range_start)} - {formatDate(item.date_range_end)}
          </Text>
          {item.claim_type && (
            <Text style={{ fontSize: 12, color: SLATE, fontStyle: "italic", marginBottom: 4 }}>
              {item.claim_type.replace(/_/g, " ")}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: SLATE }}>
              {item.sections_included.length} sections
            </Text>
            {item.page_count && (
              <Text style={{ fontSize: 12, color: SLATE, marginLeft: 12 }}>
                {item.page_count} pages
              </Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View
            style={{
              backgroundColor: `${getStatusColor(item.status)}20`,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: getStatusColor(item.status), fontWeight: "500" }}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: SLATE, marginTop: 8 }}>
            #{item.export_number}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE }}>Loading reports...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["bottom"]}>
      {/* Header Info */}
      <View style={{ padding: 16, backgroundColor: SAGE_LIGHT, borderBottomWidth: 1, borderBottomColor: SAND }}>
        <Text style={{ fontSize: 14, color: SAGE, textAlign: "center" }}>
          Generate court-ready documentation packages with SHA-256 integrity verification
        </Text>
      </View>

      {exports.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="document-text-outline" size={64} color={SAGE} />
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1e293b", marginTop: 16 }}>
            No Reports Yet
          </Text>
          <Text style={{ fontSize: 14, color: SLATE, textAlign: "center", marginTop: 8 }}>
            Create your first court-ready evidence package to document your co-parenting journey.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: SAGE,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24,
            }}
            onPress={() => router.push("/exports/create")}
          >
            <Text style={{ color: WHITE, fontWeight: "600" }}>Create Report</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={exports}
          keyExtractor={(item) => item.id}
          renderItem={renderExportItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={SAGE} />
          }
        />
      )}

      {/* FAB */}
      {exports.length > 0 && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: SAGE,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 4,
          }}
          onPress={() => router.push("/exports/create")}
        >
          <Ionicons name="add" size={28} color={WHITE} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

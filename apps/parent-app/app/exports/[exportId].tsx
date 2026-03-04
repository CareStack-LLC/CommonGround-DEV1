/**
 * Export Details Screen
 *
 * Shows export details, status, and download options
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";

import { parent } from "@commonground/api-client";
import type { CaseExport } from "@commonground/api-client/src/api/parent/exports";
import {
  getSectionDisplayName,
  formatFileSize,
  getStatusDisplay,
  ExportStatus,
} from "@commonground/api-client/src/api/parent/exports";

// Design colors
const SAGE = "#4A6C58";
const SAGE_LIGHT = "#E8F0EB";
const CREAM = "#FFFBF5";
const WHITE = "#FFFFFF";
const SAND = "#F5F0E8";
const SLATE = "#475569";

export default function ExportDetailsScreen() {
  const { exportId } = useLocalSearchParams<{ exportId: string }>();
  const [exportData, setExportData] = useState<CaseExport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const fetchExport = useCallback(async () => {
    if (!exportId) return;

    try {
      const data = await parent.exports.getExport(exportId, true);
      setExportData(data);

      // If still generating, poll again
      if (data.status === ExportStatus.GENERATING && pollCount < 60) {
        setTimeout(() => {
          setPollCount((c) => c + 1);
        }, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      console.error("Failed to fetch export:", error);
      Alert.alert("Error", "Failed to load report details");
    } finally {
      setIsLoading(false);
    }
  }, [exportId, pollCount]);

  useEffect(() => {
    fetchExport();
  }, [fetchExport]);

  const handleDownload = async () => {
    if (!exportData) return;

    setIsDownloading(true);
    try {
      const downloadData = await parent.exports.downloadExport(exportData.id);
      // Open the file URL
      await Linking.openURL(downloadData.file_url);
    } catch (error) {
      Alert.alert("Error", "Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!exportData) return;

    try {
      const downloadData = await parent.exports.downloadExport(exportData.id);
      await Share.share({
        message: `CommonGround Court Report #${exportData.export_number}`,
        url: downloadData.file_url,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleVerify = async () => {
    if (!exportData) return;

    setIsVerifying(true);
    try {
      const verification = await parent.exports.verifyExport(exportData.export_number);
      if (verification.is_valid) {
        Alert.alert(
          "Verification Successful",
          `Report #${verification.export_number} is authentic and has not been tampered with.\n\nGenerated: ${new Date(verification.generated_at || "").toLocaleString()}`
        );
      } else {
        Alert.alert(
          "Verification Failed",
          verification.is_expired
            ? "This report has expired."
            : "This report could not be verified. It may have been modified."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to verify report authenticity");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
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
              await parent.exports.deleteExport(exportData!.id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete report");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading || !exportData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CREAM, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={SAGE} />
        <Text style={{ marginTop: 16, color: SLATE }}>Loading report...</Text>
      </SafeAreaView>
    );
  }

  const statusInfo = getStatusDisplay(exportData.status as ExportStatus);
  const isReady = exportData.status === ExportStatus.COMPLETED || exportData.status === ExportStatus.DOWNLOADED;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CREAM }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Status Banner */}
        <View
          style={{
            backgroundColor: `${statusInfo.color}20`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {exportData.status === ExportStatus.GENERATING && (
            <ActivityIndicator size="small" color={statusInfo.color} style={{ marginRight: 8 }} />
          )}
          <Ionicons
            name={
              exportData.status === ExportStatus.FAILED
                ? "alert-circle"
                : exportData.status === ExportStatus.GENERATING
                ? "time"
                : "checkmark-circle"
            }
            size={20}
            color={statusInfo.color}
          />
          <Text style={{ marginLeft: 8, color: statusInfo.color, fontWeight: "600" }}>
            {statusInfo.label}
          </Text>
        </View>

        {/* Error Message */}
        {exportData.error_message && (
          <View style={{ backgroundColor: "#FEE2E2", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#DC2626", fontSize: 13 }}>{exportData.error_message}</Text>
          </View>
        )}

        {/* Main Info Card */}
        <View style={{ backgroundColor: WHITE, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Ionicons
              name={exportData.package_type === "court" ? "briefcase" : "search"}
              size={24}
              color={SAGE}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#1e293b" }}>
                {exportData.package_type === "court" ? "Court Package" : "Investigation Report"}
              </Text>
              <Text style={{ fontSize: 13, color: SLATE }}>#{exportData.export_number}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: SAND, paddingTop: 16 }}>
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: SLATE }}>Date Range</Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                  {formatDate(exportData.date_range_start)} - {formatDate(exportData.date_range_end)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: SLATE }}>Created</Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                  {formatDateTime(exportData.created_at)}
                </Text>
              </View>
            </View>

            {exportData.claim_type && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: SLATE }}>Claim Type</Text>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                  {exportData.claim_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
            )}

            {isReady && (
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: SLATE }}>Pages</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                    {exportData.page_count || "N/A"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: SLATE }}>File Size</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                    {formatFileSize(exportData.file_size_bytes)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: SLATE }}>Downloads</Text>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#1e293b" }}>
                    {exportData.download_count}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Sections Card */}
        <View style={{ backgroundColor: WHITE, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#1e293b", marginBottom: 12 }}>
            Sections Included ({exportData.sections_included.length})
          </Text>
          {exportData.sections_included.map((section, index) => (
            <View
              key={section}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: SAND,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={SAGE} />
              <Text style={{ marginLeft: 8, fontSize: 14, color: "#1e293b" }}>
                {getSectionDisplayName(section)}
              </Text>
            </View>
          ))}
        </View>

        {/* Integrity Card */}
        {isReady && exportData.content_hash && (
          <View style={{ backgroundColor: WHITE, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1e293b", marginBottom: 12 }}>
              Integrity Verification
            </Text>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, color: SLATE }}>SHA-256 Hash</Text>
              <Text style={{ fontSize: 11, color: "#1e293b", fontFamily: "monospace" }} numberOfLines={2}>
                {exportData.content_hash}
              </Text>
            </View>
            {exportData.chain_hash && (
              <View>
                <Text style={{ fontSize: 12, color: SLATE }}>Chain Hash</Text>
                <Text style={{ fontSize: 11, color: "#1e293b", fontFamily: "monospace" }} numberOfLines={2}>
                  {exportData.chain_hash}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {isReady && (
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity
              style={{
                backgroundColor: SAGE,
                borderRadius: 8,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
              onPress={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <>
                  <Ionicons name="download" size={20} color={WHITE} />
                  <Text style={{ color: WHITE, fontWeight: "600", marginLeft: 8 }}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: SAGE_LIGHT,
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={18} color={SAGE} />
                <Text style={{ color: SAGE, fontWeight: "500", marginLeft: 6 }}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: SAGE_LIGHT,
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                }}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={SAGE} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color={SAGE} />
                    <Text style={{ color: SAGE, fontWeight: "500", marginLeft: 6 }}>Verify</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: "#EF4444",
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          }}
          onPress={handleDelete}
        >
          <Text style={{ color: "#EF4444", fontWeight: "500" }}>Delete Report</Text>
        </TouchableOpacity>

        {/* Expiry Info */}
        {exportData.expires_at && !exportData.is_permanent && (
          <Text style={{ fontSize: 12, color: SLATE, textAlign: "center", marginTop: 16 }}>
            This report expires on {formatDateTime(exportData.expires_at)}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

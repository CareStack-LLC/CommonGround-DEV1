/**
 * Recording Detail Screen
 *
 * Shows recording details, playback controls, and access to
 * transcription, audit trail, and evidence export.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import {
  parent,
  type RecordingDetail,
  type LegalHold,
  type IntegrityVerificationResponse,
} from "@commonground/api-client";

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [legalHold, setLegalHold] = useState<LegalHold | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecording = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      const [recordingData, holdData, integrityData] = await Promise.all([
        parent.recordings.getRecording(id),
        parent.recordings.getLegalHold(id).catch(() => null),
        parent.recordings.getIntegrityStatus(id).catch(() => null),
      ]);

      setRecording(recordingData);
      setLegalHold(holdData);
      setIntegrity(integrityData);
    } catch (err) {
      setError("Failed to load recording");
      console.error("Failed to load recording:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecording();
  }, [loadRecording]);

  const handlePlayRecording = async () => {
    if (!recording?.download_url) {
      Alert.alert("Error", "Recording URL not available");
      return;
    }

    try {
      await Linking.openURL(recording.download_url);
    } catch (err) {
      Alert.alert("Error", "Failed to open recording");
    }
  };

  const handleRefreshUrl = async () => {
    if (!id) return;

    setIsRefreshingUrl(true);
    try {
      const result = await parent.recordings.refreshDownloadUrl(id);
      setRecording((prev) =>
        prev
          ? {
              ...prev,
              download_url: result.download_url,
              download_url_expires_at: result.expires_at,
            }
          : null
      );
      Alert.alert("Success", "Download URL refreshed");
    } catch (err) {
      Alert.alert("Error", "Failed to refresh download URL");
    } finally {
      setIsRefreshingUrl(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!id) return;

    setIsVerifying(true);
    try {
      const result = await parent.recordings.verifyIntegrity(id);
      setIntegrity(result);

      if (result.verified) {
        Alert.alert("Integrity Verified", "The recording file has not been modified.");
      } else {
        Alert.alert(
          "Verification Failed",
          result.message || "The recording file may have been modified."
        );
      }
    } catch (err) {
      Alert.alert("Error", "Failed to verify integrity");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetLegalHold = async () => {
    Alert.prompt(
      "Set Legal Hold",
      "Enter the reason for the legal hold:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Set Hold",
          onPress: async (reason) => {
            if (!id || !reason) return;
            try {
              const result = await parent.recordings.setLegalHold(id, { reason });
              setLegalHold(result);
              Alert.alert("Success", "Legal hold has been set");
            } catch (err) {
              Alert.alert("Error", "Failed to set legal hold");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReleaseLegalHold = async () => {
    Alert.prompt(
      "Release Legal Hold",
      "Enter the reason for releasing the hold:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release",
          style: "destructive",
          onPress: async (reason) => {
            if (!id || !reason) return;
            try {
              const result = await parent.recordings.releaseLegalHold(id, { reason });
              setLegalHold(result);
              Alert.alert("Success", "Legal hold has been released");
            } catch (err) {
              Alert.alert("Error", "Failed to release legal hold");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Recording" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-secondary-500 mt-4">Loading recording...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recording) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Recording" }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mt-4">
            {error || "Recording not found"}
          </Text>
          <TouchableOpacity
            className="mt-4 bg-primary-600 px-6 py-3 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Recording Details" }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Playback Section */}
        <View className="px-6 py-6 bg-white dark:bg-secondary-800">
          <View className="items-center">
            {/* Large play button */}
            <TouchableOpacity
              className="w-24 h-24 bg-primary-600 rounded-full items-center justify-center shadow-lg"
              onPress={handlePlayRecording}
              disabled={!recording.download_url}
            >
              <Ionicons name="play" size={40} color="#ffffff" />
            </TouchableOpacity>

            <Text className="mt-4 text-xl font-bold text-secondary-900 dark:text-white">
              {recording.recording_type === "video_call"
                ? "Video Call"
                : recording.recording_type === "audio_call"
                ? "Audio Call"
                : "Screen Share"}
            </Text>

            <Text className="text-secondary-500 dark:text-secondary-400 mt-1">
              {recording.started_at
                ? format(new Date(recording.started_at), "MMMM d, yyyy 'at' h:mm a")
                : format(new Date(recording.created_at), "MMMM d, yyyy")}
            </Text>

            {/* Duration & Size */}
            <View className="flex-row items-center mt-3 gap-6">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#64748b" />
                <Text className="text-secondary-600 dark:text-secondary-400 ml-1">
                  {formatDuration(recording.duration_seconds)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="document-outline" size={18} color="#64748b" />
                <Text className="text-secondary-600 dark:text-secondary-400 ml-1">
                  {formatFileSize(recording.file_size_bytes)}
                </Text>
              </View>
            </View>

            {/* Refresh URL button */}
            {recording.download_url && (
              <TouchableOpacity
                className="mt-4 flex-row items-center"
                onPress={handleRefreshUrl}
                disabled={isRefreshingUrl}
              >
                {isRefreshingUrl ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Ionicons name="refresh" size={16} color="#2563eb" />
                )}
                <Text className="text-primary-600 ml-1 text-sm">Refresh URL</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Badges */}
        <View className="px-6 py-4 flex-row flex-wrap gap-2">
          {/* Integrity Status */}
          <View
            className={`flex-row items-center px-3 py-2 rounded-full ${
              integrity?.verified
                ? "bg-green-100 dark:bg-green-900/30"
                : integrity?.status === "error" || integrity?.status === "failed"
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-secondary-100 dark:bg-secondary-800"
            }`}
          >
            <Ionicons
              name={integrity?.verified ? "shield-checkmark" : "shield-outline"}
              size={16}
              color={
                integrity?.verified
                  ? "#16a34a"
                  : integrity?.status === "error" || integrity?.status === "failed"
                  ? "#dc2626"
                  : "#64748b"
              }
            />
            <Text
              className={`ml-1 text-sm font-medium ${
                integrity?.verified
                  ? "text-green-700 dark:text-green-300"
                  : integrity?.status === "error" || integrity?.status === "failed"
                  ? "text-red-700 dark:text-red-300"
                  : "text-secondary-600 dark:text-secondary-400"
              }`}
            >
              {integrity?.verified ? "Verified" : integrity?.status || "Unknown"}
            </Text>
          </View>

          {/* Legal Hold Status */}
          {legalHold?.is_protected && (
            <View className="flex-row items-center px-3 py-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <Ionicons name="lock-closed" size={16} color="#dc2626" />
              <Text className="ml-1 text-sm font-medium text-red-700 dark:text-red-300">
                Legal Hold
              </Text>
            </View>
          )}

          {/* Transcription Status */}
          {recording.has_transcription && (
            <View className="flex-row items-center px-3 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Ionicons name="document-text" size={16} color="#2563eb" />
              <Text className="ml-1 text-sm font-medium text-blue-700 dark:text-blue-300">
                Transcribed
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Actions
          </Text>

          <View className="gap-3">
            {/* View Transcription */}
            {recording.has_transcription && (
              <ActionButton
                icon="document-text-outline"
                label="View Transcription"
                description="Read the full transcript with speaker labels"
                onPress={() => router.push(`/recordings/${id}/transcription`)}
              />
            )}

            {/* View Audit Trail */}
            <ActionButton
              icon="list-outline"
              label="View Audit Trail"
              description="See who accessed this recording and when"
              onPress={() => router.push(`/recordings/${id}/audit`)}
            />

            {/* Verify Integrity */}
            <ActionButton
              icon="shield-checkmark-outline"
              label="Verify Integrity"
              description="Confirm the file hasn't been modified"
              onPress={handleVerifyIntegrity}
              isLoading={isVerifying}
            />

            {/* Export Evidence */}
            <ActionButton
              icon="download-outline"
              label="Export Evidence Package"
              description="Generate court-ready documentation"
              onPress={() => router.push(`/recordings/${id}/export`)}
            />

            {/* Legal Hold */}
            <ActionButton
              icon={legalHold?.is_protected ? "lock-open-outline" : "lock-closed-outline"}
              label={legalHold?.is_protected ? "Release Legal Hold" : "Set Legal Hold"}
              description={
                legalHold?.is_protected
                  ? "Remove litigation protection"
                  : "Protect from deletion for litigation"
              }
              onPress={legalHold?.is_protected ? handleReleaseLegalHold : handleSetLegalHold}
              variant={legalHold?.is_protected ? "danger" : "default"}
            />
          </View>
        </View>

        {/* Technical Details */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Technical Details
          </Text>

          <View className="bg-white dark:bg-secondary-800 rounded-xl p-4 border border-secondary-100 dark:border-secondary-700">
            <DetailRow label="Recording ID" value={recording.id} />
            <DetailRow label="Format" value={recording.format?.toUpperCase() || "MP4"} />
            <DetailRow label="Status" value={recording.status} />
            {recording.file_hash && (
              <DetailRow
                label="SHA-256 Hash"
                value={`${recording.file_hash.substring(0, 16)}...`}
                isCode
              />
            )}
            {recording.integrity_status && (
              <DetailRow label="Integrity Status" value={recording.integrity_status} />
            )}
            {legalHold?.is_protected && legalHold.set_at && (
              <DetailRow
                label="Legal Hold Since"
                value={format(new Date(legalHold.set_at), "MMM d, yyyy")}
              />
            )}
            {legalHold?.case_number && (
              <DetailRow label="Case Number" value={legalHold.case_number} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  description,
  onPress,
  isLoading,
  variant = "default",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <TouchableOpacity
      className="bg-white dark:bg-secondary-800 rounded-xl p-4 flex-row items-center border border-secondary-100 dark:border-secondary-700"
      onPress={onPress}
      disabled={isLoading}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          variant === "danger"
            ? "bg-red-100 dark:bg-red-900/30"
            : "bg-primary-100 dark:bg-primary-900/30"
        }`}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === "danger" ? "#dc2626" : "#2563eb"}
          />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            color={variant === "danger" ? "#dc2626" : "#2563eb"}
          />
        )}
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`font-medium ${
            variant === "danger"
              ? "text-red-700 dark:text-red-300"
              : "text-secondary-900 dark:text-white"
          }`}
        >
          {label}
        </Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

function DetailRow({
  label,
  value,
  isCode,
}: {
  label: string;
  value: string;
  isCode?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-2 border-b border-secondary-100 dark:border-secondary-700 last:border-b-0">
      <Text className="text-secondary-500 dark:text-secondary-400">{label}</Text>
      <Text
        className={`${
          isCode ? "font-mono text-xs" : ""
        } text-secondary-900 dark:text-white`}
      >
        {value}
      </Text>
    </View>
  );
}

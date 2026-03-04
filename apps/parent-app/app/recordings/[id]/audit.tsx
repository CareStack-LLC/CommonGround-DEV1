/**
 * Audit Trail Screen
 *
 * Displays the complete access history for a recording,
 * chain of custody verification, and compliance status.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, formatDistanceToNow } from "date-fns";

import {
  parent,
  type AccessHistoryResponse,
  type AccessLogEntry,
  type ChainVerificationResponse,
} from "@commonground/api-client";

export default function AuditTrailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [accessHistory, setAccessHistory] = useState<AccessHistoryResponse | null>(null);
  const [chainVerification, setChainVerification] = useState<ChainVerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      const [historyData, chainData] = await Promise.all([
        parent.recordings.getAccessHistory(id, { limit: 100 }),
        parent.recordings.verifyChain(id).catch(() => null),
      ]);

      setAccessHistory(historyData);
      setChainVerification(chainData);
    } catch (err) {
      setError("Failed to load audit trail");
      console.error("Failed to load audit trail:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerifyChain = async () => {
    if (!id) return;

    setIsVerifying(true);
    try {
      const result = await parent.recordings.verifyChain(id);
      setChainVerification(result);

      if (result.verified) {
        Alert.alert(
          "Chain Verified",
          "The chain of custody is intact. All access logs are cryptographically linked and unmodified."
        );
      } else {
        Alert.alert(
          "Chain Verification Failed",
          `Found ${result.broken_links?.length || 0} broken links in the chain. This may indicate tampering.`
        );
      }
    } catch (err) {
      Alert.alert("Error", "Failed to verify chain of custody");
    } finally {
      setIsVerifying(false);
    }
  };

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    switch (action) {
      case "VIEW_METADATA":
        return "eye-outline";
      case "GENERATE_URL":
        return "link-outline";
      case "DOWNLOAD":
        return "download-outline";
      case "TRANSCRIPTION_VIEW":
        return "document-text-outline";
      case "EXPORT":
        return "share-outline";
      case "LEGAL_HOLD_SET":
        return "lock-closed";
      case "LEGAL_HOLD_RELEASED":
        return "lock-open";
      case "INTEGRITY_VERIFIED":
        return "shield-checkmark";
      default:
        return "ellipse-outline";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "VIEW_METADATA":
        return "Viewed Details";
      case "GENERATE_URL":
        return "Generated Download URL";
      case "DOWNLOAD":
        return "Downloaded";
      case "TRANSCRIPTION_VIEW":
        return "Viewed Transcription";
      case "EXPORT":
        return "Exported Evidence";
      case "LEGAL_HOLD_SET":
        return "Set Legal Hold";
      case "LEGAL_HOLD_RELEASED":
        return "Released Legal Hold";
      case "INTEGRITY_VERIFIED":
        return "Verified Integrity";
      default:
        return action.replace(/_/g, " ");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Audit Trail" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-secondary-500 mt-4">Loading audit trail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Audit Trail" }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mt-4">
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen options={{ title: "Audit Trail" }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Chain of Custody Status */}
        <View className="px-6 py-4 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  chainVerification?.verified
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-yellow-100 dark:bg-yellow-900/30"
                }`}
              >
                <Ionicons
                  name={chainVerification?.verified ? "shield-checkmark" : "shield-outline"}
                  size={24}
                  color={chainVerification?.verified ? "#16a34a" : "#f59e0b"}
                />
              </View>
              <View className="ml-3">
                <Text className="font-semibold text-secondary-900 dark:text-white">
                  Chain of Custody
                </Text>
                <Text
                  className={`text-sm ${
                    chainVerification?.verified
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                >
                  {chainVerification?.verified
                    ? "Verified & Intact"
                    : chainVerification
                    ? "Verification Failed"
                    : "Not Verified"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-lg flex-row items-center"
              onPress={handleVerifyChain}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#2563eb" />
                  <Text className="text-primary-600 font-medium ml-1">Verify</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {chainVerification && (
            <View className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded-lg">
              <View className="flex-row justify-between mb-2">
                <Text className="text-secondary-500 text-sm">Total Entries</Text>
                <Text className="text-secondary-900 dark:text-white font-medium">
                  {chainVerification.total_entries}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-secondary-500 text-sm">Verified Entries</Text>
                <Text className="text-secondary-900 dark:text-white font-medium">
                  {chainVerification.verified_entries}
                </Text>
              </View>
              {chainVerification.first_access && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-secondary-500 text-sm">First Access</Text>
                  <Text className="text-secondary-900 dark:text-white font-medium">
                    {format(new Date(chainVerification.first_access), "MMM d, yyyy")}
                  </Text>
                </View>
              )}
              {chainVerification.last_access && (
                <View className="flex-row justify-between">
                  <Text className="text-secondary-500 text-sm">Last Access</Text>
                  <Text className="text-secondary-900 dark:text-white font-medium">
                    {format(new Date(chainVerification.last_access), "MMM d, yyyy")}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Broken links warning */}
          {chainVerification?.broken_links && chainVerification.broken_links.length > 0 && (
            <View className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#dc2626" />
                <Text className="text-red-700 dark:text-red-300 font-medium ml-2">
                  {chainVerification.broken_links.length} Broken Link(s) Detected
                </Text>
              </View>
              <Text className="text-red-600 dark:text-red-400 text-sm mt-1">
                The chain of custody may have been tampered with. Review the entries below.
              </Text>
            </View>
          )}
        </View>

        {/* Info Banner */}
        <View className="px-6 py-3">
          <View className="flex-row items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Ionicons name="information-circle" size={20} color="#2563eb" />
            <Text className="flex-1 ml-2 text-sm text-blue-700 dark:text-blue-300">
              Each access event is cryptographically linked to the previous event using SHA-256 hashing.
              This creates an immutable chain of custody suitable for court proceedings.
            </Text>
          </View>
        </View>

        {/* Access History */}
        <View className="px-6 py-2">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            Access History ({accessHistory?.access_count || 0} events)
          </Text>

          {accessHistory?.entries.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="list-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 mt-4">No access history recorded</Text>
            </View>
          ) : (
            <View className="relative">
              {/* Timeline line */}
              <View className="absolute left-5 top-6 bottom-6 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

              {accessHistory?.entries.map((entry, index) => (
                <AccessLogEntryView
                  key={entry.id || index}
                  entry={entry}
                  getActionIcon={getActionIcon}
                  getActionLabel={getActionLabel}
                  isFirst={index === 0}
                  isLast={index === (accessHistory?.entries.length || 0) - 1}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessLogEntryView({
  entry,
  getActionIcon,
  getActionLabel,
  isFirst,
  isLast,
}: {
  entry: AccessLogEntry;
  getActionIcon: (action: string) => keyof typeof Ionicons.glyphMap;
  getActionLabel: (action: string) => string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="flex-row mb-4">
      {/* Timeline dot */}
      <View className="z-10">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            entry.success
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30"
          }`}
        >
          <Ionicons
            name={getActionIcon(entry.action)}
            size={18}
            color={entry.success ? "#16a34a" : "#dc2626"}
          />
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity
        className="flex-1 ml-3 bg-white dark:bg-secondary-800 rounded-lg p-3 border border-secondary-100 dark:border-secondary-700"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-medium text-secondary-900 dark:text-white">
            {getActionLabel(entry.action)}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#94a3b8"
          />
        </View>

        <Text className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
          {format(new Date(entry.accessed_at), "MMM d, yyyy 'at' h:mm:ss a")}
          {" • "}
          {formatDistanceToNow(new Date(entry.accessed_at), { addSuffix: true })}
        </Text>

        {!entry.success && entry.error_message && (
          <Text className="text-red-600 text-sm mt-1">{entry.error_message}</Text>
        )}

        {expanded && (
          <View className="mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
            <DetailRow label="User ID" value={entry.user_id} />
            {entry.user_email && <DetailRow label="Email" value={entry.user_email} />}
            <DetailRow label="Role" value={entry.user_role} />
            {entry.ip_address && <DetailRow label="IP Address" value={entry.ip_address} />}
            {entry.device_type && <DetailRow label="Device" value={entry.device_type} />}
            {entry.action_detail && <DetailRow label="Details" value={entry.action_detail} />}
            <DetailRow label="Sequence #" value={entry.sequence_number.toString()} />
            <DetailRow
              label="Content Hash"
              value={`${entry.content_hash.substring(0, 12)}...`}
              isCode
            />
            {entry.previous_log_hash && (
              <DetailRow
                label="Previous Hash"
                value={`${entry.previous_log_hash.substring(0, 12)}...`}
                isCode
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
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
    <View className="flex-row justify-between py-1">
      <Text className="text-secondary-500 dark:text-secondary-400 text-sm">{label}</Text>
      <Text
        className={`text-secondary-900 dark:text-white text-sm ${
          isCode ? "font-mono" : ""
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Recordings Library Screen
 *
 * Lists all call recordings for the family with status,
 * duration, and quick actions.
 */

import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { router, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import { parent, type Recording } from "@commonground/api-client";
import { useFamilyFile } from "@/hooks/useFamilyFile";

export default function RecordingsScreen() {
  const { familyFile } = useFamilyFile();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    if (!familyFile?.id) return;

    try {
      setError(null);
      const response = await parent.recordings.getRecordings(familyFile.id, {
        limit: 50,
        status: "completed",
      });
      setRecordings(response.recordings);
    } catch (err) {
      setError("Failed to load recordings");
      console.error("Failed to load recordings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [familyFile?.id]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  }, [loadRecordings]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "processing":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-secondary-500";
    }
  };

  const getRecordingIcon = (type: string) => {
    switch (type) {
      case "video_call":
        return "videocam";
      case "audio_call":
        return "call";
      case "screen_share":
        return "desktop";
      default:
        return "document";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Recordings" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-secondary-500 mt-4">Loading recordings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Recordings",
          headerRight: () => (
            <TouchableOpacity
              onPress={onRefresh}
              className="mr-4"
            >
              <Ionicons name="refresh" size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Info */}
        <View className="px-6 py-4 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Ionicons name="videocam" size={20} color="#2563eb" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
                Call Recordings
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                {recordings.length} recording{recordings.length !== 1 ? "s" : ""} available
              </Text>
            </View>
          </View>

          {/* Info banner */}
          <View className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-row items-start">
            <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
            <Text className="ml-2 flex-1 text-sm text-blue-700 dark:text-blue-300">
              All recordings are securely stored with SHA-256 verification for court-admissible documentation.
            </Text>
          </View>
        </View>

        {/* Error state */}
        {error && (
          <View className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Text className="text-red-700 dark:text-red-300">{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {recordings.length === 0 && !error && (
          <View className="px-6 py-12 items-center">
            <View className="w-20 h-20 bg-secondary-100 dark:bg-secondary-800 rounded-full items-center justify-center mb-4">
              <Ionicons name="videocam-outline" size={40} color="#94a3b8" />
            </View>
            <Text className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
              No Recordings Yet
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 text-center">
              Recordings from your video and audio calls will appear here.
            </Text>
          </View>
        )}

        {/* Recordings list */}
        <View className="px-6 py-4">
          {recordings.map((recording) => (
            <TouchableOpacity
              key={recording.id}
              className="bg-white dark:bg-secondary-800 rounded-xl p-4 mb-3 shadow-sm border border-secondary-100 dark:border-secondary-700"
              onPress={() => router.push(`/recordings/${recording.id}`)}
            >
              <View className="flex-row items-start">
                {/* Icon */}
                <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
                  <Ionicons
                    name={getRecordingIcon(recording.recording_type) as any}
                    size={24}
                    color="#2563eb"
                  />
                </View>

                {/* Content */}
                <View className="ml-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-secondary-900 dark:text-white">
                      {recording.recording_type === "video_call"
                        ? "Video Call"
                        : recording.recording_type === "audio_call"
                        ? "Audio Call"
                        : "Screen Share"}
                    </Text>
                    <Text className={`text-xs font-medium ${getStatusColor(recording.status)}`}>
                      {recording.status.charAt(0).toUpperCase() + recording.status.slice(1)}
                    </Text>
                  </View>

                  <Text className="text-secondary-500 dark:text-secondary-400 text-sm mt-1">
                    {recording.started_at
                      ? format(new Date(recording.started_at), "MMM d, yyyy 'at' h:mm a")
                      : format(new Date(recording.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </Text>

                  <View className="flex-row items-center mt-2 gap-4">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text className="text-secondary-500 dark:text-secondary-400 text-xs ml-1">
                        {formatDuration(recording.duration_seconds)}
                      </Text>
                    </View>

                    {recording.file_size_bytes && (
                      <View className="flex-row items-center">
                        <Ionicons name="document-outline" size={14} color="#64748b" />
                        <Text className="text-secondary-500 dark:text-secondary-400 text-xs ml-1">
                          {formatFileSize(recording.file_size_bytes)}
                        </Text>
                      </View>
                    )}

                    {recording.has_transcription && (
                      <View className="flex-row items-center">
                        <Ionicons name="document-text-outline" size={14} color="#2563eb" />
                        <Text className="text-primary-600 text-xs ml-1">Transcript</Text>
                      </View>
                    )}

                    {recording.is_protected && (
                      <View className="flex-row items-center">
                        <Ionicons name="lock-closed" size={14} color="#dc2626" />
                        <Text className="text-red-600 text-xs ml-1">Legal Hold</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

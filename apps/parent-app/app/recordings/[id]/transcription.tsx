/**
 * Transcription Viewer Screen
 *
 * Displays the full transcription with speaker diarization,
 * timestamps, and search functionality.
 */

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { parent, type Transcription, type TranscriptionChunk } from "@commonground/api-client";

export default function TranscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const loadTranscription = useCallback(async () => {
    if (!id) return;

    try {
      setError(null);
      const data = await parent.recordings.getTranscription(id);
      setTranscription(data);
    } catch (err) {
      setError("Failed to load transcription");
      console.error("Failed to load transcription:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTranscription();
  }, [loadTranscription]);

  // Filter chunks based on search query
  const filteredChunks = useMemo(() => {
    if (!transcription?.chunks || !searchQuery.trim()) {
      return transcription?.chunks || [];
    }
    const query = searchQuery.toLowerCase();
    return transcription.chunks.filter(
      (chunk) =>
        chunk.content.toLowerCase().includes(query) ||
        chunk.speaker_name?.toLowerCase().includes(query) ||
        chunk.speaker_label.toLowerCase().includes(query)
    );
  }, [transcription?.chunks, searchQuery]);

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getSpeakerColor = (label: string) => {
    // Generate consistent colors for speakers
    const colors = [
      { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
      { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
      { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
      { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
    ];

    // Use speaker label to get consistent color
    const index = label.charCodeAt(label.length - 1) % colors.length;
    return colors[index];
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Transcription" }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-secondary-500 mt-4">Loading transcription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !transcription) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900">
        <Stack.Screen options={{ title: "Transcription" }} />
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={48} color="#dc2626" />
          <Text className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mt-4">
            {error || "Transcription not available"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: "Transcription",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              className="mr-4"
            >
              <Ionicons
                name={showSearch ? "close" : "search"}
                size={24}
                color="#2563eb"
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search Bar */}
      {showSearch && (
        <View className="px-4 py-3 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
          <View className="flex-row items-center bg-secondary-100 dark:bg-secondary-700 rounded-lg px-3">
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              className="flex-1 py-2 px-2 text-secondary-900 dark:text-white"
              placeholder="Search transcription..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text className="text-secondary-500 text-sm mt-2">
              {filteredChunks.length} result{filteredChunks.length !== 1 ? "s" : ""} found
            </Text>
          )}
        </View>
      )}

      {/* Header Stats */}
      <View className="px-6 py-4 bg-white dark:bg-secondary-800 border-b border-secondary-100 dark:border-secondary-700">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
              {transcription.word_count || 0}
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 text-sm">Words</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
              {transcription.speaker_count || 0}
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 text-sm">Speakers</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-secondary-900 dark:text-white">
              {transcription.chunks?.length || 0}
            </Text>
            <Text className="text-secondary-500 dark:text-secondary-400 text-sm">Segments</Text>
          </View>
        </View>
      </View>

      {/* Transcription Content */}
      <ScrollView className="flex-1 px-4 py-4">
        {filteredChunks.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
            <Text className="text-secondary-500 mt-4">
              {searchQuery ? "No matching segments found" : "No transcription content"}
            </Text>
          </View>
        ) : (
          filteredChunks.map((chunk, index) => (
            <TranscriptionChunkView
              key={chunk.id || index}
              chunk={chunk}
              searchQuery={searchQuery}
              getSpeakerColor={getSpeakerColor}
              formatTimestamp={formatTimestamp}
              highlightText={highlightText}
            />
          ))
        )}
      </ScrollView>

      {/* Full Text Toggle */}
      {transcription.full_text && (
        <FullTextSection fullText={transcription.full_text} searchQuery={searchQuery} />
      )}
    </SafeAreaView>
  );
}

function TranscriptionChunkView({
  chunk,
  searchQuery,
  getSpeakerColor,
  formatTimestamp,
  highlightText,
}: {
  chunk: TranscriptionChunk;
  searchQuery: string;
  getSpeakerColor: (label: string) => { bg: string; text: string };
  formatTimestamp: (seconds: number) => string;
  highlightText: (text: string, query: string) => React.ReactNode;
}) {
  const colors = getSpeakerColor(chunk.speaker_label);

  return (
    <View className="mb-4">
      {/* Speaker & Timestamp */}
      <View className="flex-row items-center mb-2">
        <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
          <Text className={`text-xs font-medium ${colors.text}`}>
            {chunk.speaker_name || chunk.speaker_label}
          </Text>
        </View>
        <Text className="text-secondary-400 text-xs ml-2">
          {formatTimestamp(chunk.start_time)} - {formatTimestamp(chunk.end_time)}
        </Text>
        {chunk.is_flagged && (
          <View className="ml-2 flex-row items-center">
            <Ionicons name="flag" size={12} color="#dc2626" />
            <Text className="text-red-600 text-xs ml-1">{chunk.flag_reason || "Flagged"}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View
        className={`bg-white dark:bg-secondary-800 rounded-lg p-3 border-l-4 ${
          chunk.is_flagged ? "border-red-500" : "border-primary-500"
        }`}
      >
        <Text className="text-secondary-900 dark:text-white leading-6">
          {highlightText(chunk.content, searchQuery)}
        </Text>

        {/* Confidence indicator */}
        {chunk.confidence !== undefined && chunk.confidence < 0.8 && (
          <View className="flex-row items-center mt-2">
            <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
            <Text className="text-yellow-600 text-xs ml-1">
              Low confidence ({Math.round(chunk.confidence * 100)}%)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function FullTextSection({
  fullText,
  searchQuery,
}: {
  fullText: string;
  searchQuery: string;
}) {
  const [showFullText, setShowFullText] = useState(false);

  return (
    <View className="border-t border-secondary-200 dark:border-secondary-700">
      <TouchableOpacity
        className="px-6 py-4 flex-row items-center justify-between bg-white dark:bg-secondary-800"
        onPress={() => setShowFullText(!showFullText)}
      >
        <View className="flex-row items-center">
          <Ionicons name="document-text" size={20} color="#2563eb" />
          <Text className="text-primary-600 font-medium ml-2">
            {showFullText ? "Hide" : "Show"} Full Text
          </Text>
        </View>
        <Ionicons
          name={showFullText ? "chevron-up" : "chevron-down"}
          size={20}
          color="#2563eb"
        />
      </TouchableOpacity>

      {showFullText && (
        <View className="px-6 pb-6 bg-white dark:bg-secondary-800">
          <View className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-4">
            <Text className="text-secondary-700 dark:text-secondary-300 leading-6">
              {fullText}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

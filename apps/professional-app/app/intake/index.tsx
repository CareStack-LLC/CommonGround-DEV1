/**
 * Intake Sessions List Screen
 *
 * Shows all intake sessions for the professional, with filtering and status indicators.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { professional, type IntakeSessionListItem, type IntakeStatus } from '@commonground/api-client';

type FilterStatus = 'all' | IntakeStatus;

const STATUS_CONFIG: Record<IntakeStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#f59e0b', bg: 'bg-amber-100' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: 'bg-blue-100' },
  completed: { label: 'Completed', color: '#22c55e', bg: 'bg-green-100' },
  expired: { label: 'Expired', color: '#6b7280', bg: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'bg-red-100' },
};

export default function IntakeListScreen() {
  const [sessions, setSessions] = useState<IntakeSessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const fetchSessions = useCallback(async () => {
    try {
      const statusFilter = filter === 'all' ? undefined : filter;
      const response = await professional.intake.listSessions({ status: statusFilter as IntakeStatus });
      setSessions(response.items);
    } catch (error) {
      console.error('Failed to fetch intake sessions:', error);
      // Demo data
      setSessions([
        {
          id: '1',
          session_number: 'INT-2026-001',
          case_id: 'case-1',
          parent_id: 'parent-1',
          target_forms: ['FL-300', 'FL-311'],
          status: 'completed',
          message_count: 24,
          parent_confirmed: true,
          professional_reviewed: false,
          clarification_requested: false,
          access_link_expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          id: '2',
          session_number: 'INT-2026-002',
          case_id: 'case-2',
          parent_id: 'parent-2',
          target_forms: ['FL-300'],
          status: 'in_progress',
          message_count: 12,
          parent_confirmed: false,
          professional_reviewed: false,
          clarification_requested: false,
          access_link_expires_at: new Date(Date.now() + 86400000 * 5).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          session_number: 'INT-2026-003',
          case_id: 'case-1',
          parent_id: 'parent-3',
          status: 'pending',
          message_count: 0,
          parent_confirmed: false,
          professional_reviewed: false,
          clarification_requested: false,
          access_link_expires_at: new Date(Date.now() + 86400000 * 6).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSessions();
  }, [fetchSessions]);

  const getStatusConfig = (status: IntakeStatus) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredSessions =
    filter === 'all' ? sessions : sessions.filter((s) => s.status === filter);

  // Count by status
  const statusCounts = sessions.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Intake Center</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/intake/create');
            }}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="add-circle" size={28} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 py-3 bg-white border-b border-gray-100"
      >
        <FilterChip
          label="All"
          count={sessions.length}
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <FilterChip
          label="Pending Review"
          count={
            sessions.filter(
              (s) => s.status === 'completed' && s.parent_confirmed && !s.professional_reviewed
            ).length
          }
          active={false}
          color="#f59e0b"
          onPress={() =>
            setSessions((prev) =>
              prev.filter((s) => s.status === 'completed' && s.parent_confirmed && !s.professional_reviewed)
            )
          }
        />
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <FilterChip
            key={status}
            label={config.label}
            count={statusCounts[status] || 0}
            active={filter === status}
            color={config.color}
            onPress={() => setFilter(status as FilterStatus)}
          />
        ))}
      </ScrollView>

      {/* Sessions List */}
      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredSessions.length === 0 ? (
          <View className="items-center py-12">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-500 text-center">No intake sessions found</Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-6 py-3 rounded-xl"
              onPress={() => router.push('/intake/create')}
            >
              <Text className="text-white font-medium">Create New Intake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredSessions.map((session) => (
            <IntakeCard key={session.id} session={session} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  count,
  active,
  color,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${
        active ? 'bg-blue-600' : 'bg-gray-100'
      }`}
    >
      <Text
        className={`font-medium ${active ? 'text-white' : 'text-gray-700'}`}
        style={!active && color ? { color } : undefined}
      >
        {label}
      </Text>
      <View
        className={`ml-2 px-2 py-0.5 rounded-full ${
          active ? 'bg-blue-500' : 'bg-gray-200'
        }`}
      >
        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-gray-600'}`}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function IntakeCard({ session }: { session: IntakeSessionListItem }) {
  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.pending;
  const needsReview =
    session.status === 'completed' && session.parent_confirmed && !session.professional_reviewed;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/intake/${session.id}`);
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs text-gray-400 font-mono">{session.session_number}</Text>
        <View className="flex-row items-center">
          {needsReview && (
            <View className="bg-amber-100 px-2 py-1 rounded-full mr-2">
              <Text className="text-amber-600 text-xs font-bold">Needs Review</Text>
            </View>
          )}
          <View className={`${statusConfig.bg} px-2 py-1 rounded-full`}>
            <Text style={{ color: statusConfig.color }} className="text-xs font-medium">
              {statusConfig.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Target Forms */}
      {session.target_forms && session.target_forms.length > 0 && (
        <View className="flex-row flex-wrap mb-3">
          {session.target_forms.map((form, i) => (
            <View key={i} className="bg-gray-100 px-2 py-1 rounded mr-2 mb-1">
              <Text className="text-gray-600 text-xs font-medium">{form}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Stats Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={14} color="#6b7280" />
          <Text className="text-gray-500 text-sm ml-1">
            {session.message_count} messages
          </Text>
        </View>

        <View className="flex-row items-center">
          {session.parent_confirmed && (
            <View className="flex-row items-center mr-3">
              <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
              <Text className="text-green-600 text-xs ml-1">Confirmed</Text>
            </View>
          )}
          {session.clarification_requested && (
            <View className="flex-row items-center">
              <Ionicons name="help-circle" size={14} color="#f59e0b" />
              <Text className="text-amber-600 text-xs ml-1">Clarification</Text>
            </View>
          )}
        </View>
      </View>

      {/* Date */}
      <View className="flex-row items-center mt-2 pt-2 border-t border-gray-50">
        <Ionicons name="time-outline" size={12} color="#9ca3af" />
        <Text className="text-gray-400 text-xs ml-1">
          Created {formatDate(session.created_at)}
        </Text>
        {session.status === 'pending' && (
          <Text className="text-gray-400 text-xs ml-auto">
            Expires {formatDate(session.access_link_expires_at)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

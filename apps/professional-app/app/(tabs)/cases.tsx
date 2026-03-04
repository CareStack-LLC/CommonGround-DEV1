/**
 * Cases List Screen
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  professional,
  type CaseSummaryCard,
  type AssignmentStatus,
} from '@commonground/api-client';

const STATUS_FILTERS: { value: AssignmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

export default function CasesScreen() {
  const [cases, setCases] = useState<CaseSummaryCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');

  const fetchCases = useCallback(async () => {
    try {
      const response = await professional.cases.getCases({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 50,
      });
      setCases(response.items);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      // Demo data
      setCases([
        {
          id: '1',
          family_file_id: 'ff-1',
          family_file_number: 'FF-2024-001',
          title: 'Williams v. Williams',
          parent_a_name: 'Sarah Williams',
          parent_b_name: 'Michael Williams',
          assignment_role: 'lead_attorney',
          representing: 'parent_a',
          status: 'active',
          children_count: 2,
          unread_messages: 3,
          pending_actions: 1,
          last_activity_at: new Date().toISOString(),
        },
        {
          id: '2',
          family_file_id: 'ff-2',
          family_file_number: 'FF-2024-002',
          title: 'Johnson v. Johnson',
          parent_a_name: 'Emily Johnson',
          parent_b_name: 'David Johnson',
          assignment_role: 'lead_attorney',
          representing: 'parent_b',
          status: 'active',
          children_count: 1,
          unread_messages: 0,
          pending_actions: 0,
          last_activity_at: new Date().toISOString(),
        },
        {
          id: '3',
          family_file_id: 'ff-3',
          family_file_number: 'FF-2023-045',
          title: 'Martinez v. Martinez',
          parent_a_name: 'Ana Martinez',
          parent_b_name: 'Carlos Martinez',
          assignment_role: 'associate_attorney',
          representing: 'parent_a',
          status: 'completed',
          children_count: 3,
          unread_messages: 0,
          pending_actions: 0,
          last_activity_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    setIsLoading(true);
    fetchCases();
  }, [fetchCases]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCases();
  }, [fetchCases]);

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(searchLower) ||
        c.family_file_number.toLowerCase().includes(searchLower) ||
        c.parent_a_name?.toLowerCase().includes(searchLower) ||
        c.parent_b_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-800 mb-4">Cases</Text>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 mb-4">
          <Ionicons name="search-outline" size={20} color="#6b7280" />
          <TextInput
            className="flex-1 py-3 px-3 text-gray-800"
            placeholder="Search cases..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              className={`px-4 py-2 rounded-full mr-2 ${
                statusFilter === filter.value ? 'bg-blue-600' : 'bg-gray-100'
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(filter.value);
              }}
            >
              <Text
                className={`font-medium ${
                  statusFilter === filter.value ? 'text-white' : 'text-gray-600'
                }`}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cases List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredCases.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-lg">No cases found</Text>
            </View>
          ) : (
            filteredCases.map((caseItem) => (
              <CaseListItem key={caseItem.id} caseData={caseItem} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CaseListItem({ caseData }: { caseData: CaseSummaryCard }) {
  const statusColors = {
    active: { bg: 'bg-green-100', text: 'text-green-600' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-600' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-600' },
    withdrawn: { bg: 'bg-red-100', text: 'text-red-600' },
    terminated: { bg: 'bg-red-100', text: 'text-red-600' },
  };

  const colors = statusColors[caseData.status] || statusColors.active;

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/cases/${caseData.family_file_id}`);
      }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-400 font-medium">
          {caseData.family_file_number}
        </Text>
        <View className={`px-2 py-1 rounded-full ${colors.bg}`}>
          <Text className={`text-xs font-medium capitalize ${colors.text}`}>
            {caseData.status}
          </Text>
        </View>
      </View>

      <Text className="font-bold text-gray-800 text-lg mb-1">{caseData.title}</Text>

      <View className="flex-row items-center mb-2">
        <Ionicons name="people-outline" size={14} color="#6b7280" />
        <Text className="text-gray-500 text-sm ml-1 flex-1" numberOfLines={1}>
          {caseData.parent_a_name} vs {caseData.parent_b_name}
        </Text>
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-gray-50">
        <View className="flex-row items-center">
          <View className="flex-row items-center mr-4">
            <Ionicons name="person-outline" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-sm ml-1">
              {caseData.children_count}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-sm ml-1 capitalize">
              {caseData.assignment_role.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          {caseData.unread_messages > 0 && (
            <View className="bg-blue-500 rounded-full w-6 h-6 items-center justify-center mr-2">
              <Text className="text-white text-xs font-bold">
                {caseData.unread_messages}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Case Detail Screen
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  professional,
  type CaseAssignmentWithDetails,
} from '@commonground/api-client';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseAssignmentWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const data = await professional.cases.getCaseByFamilyFile(id!);
      setCaseData(data);
    } catch (error) {
      console.error('Failed to fetch case:', error);
      // Demo data
      setCaseData({
        id: 'ca-1',
        professional_id: 'p-1',
        firm_id: 'f-1',
        family_file_id: id!,
        assignment_role: 'lead_attorney',
        representing: 'parent_a',
        access_scopes: ['agreement', 'schedule', 'messages', 'compliance'],
        can_control_aria: true,
        can_message_client: true,
        status: 'active',
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        professional_name: 'John Smith',
        firm_name: 'Smith & Associates',
        family_file_title: 'Williams v. Williams',
        family_file_number: 'FF-2024-001',
        parent_a_name: 'Sarah Williams',
        parent_b_name: 'Michael Williams',
        children_count: 2,
        agreement_count: 1,
        unread_messages: 3,
        last_activity_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCase();
  }, [fetchCase]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!caseData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Case not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xs text-gray-400">{caseData.family_file_number}</Text>
            <Text className="text-lg font-bold text-gray-800">
              {caseData.family_file_title}
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
            <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Case Overview Card */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-500 text-sm">Your Role</Text>
              <Text className="font-bold text-gray-800 capitalize">
                {caseData.assignment_role.replace('_', ' ')}
              </Text>
            </View>
            <View>
              <Text className="text-gray-500 text-sm text-right">Representing</Text>
              <Text className="font-bold text-gray-800">
                {caseData.representing === 'parent_a' ? 'Petitioner' : 'Respondent'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center pt-4 border-t border-gray-100">
            <View className="flex-1">
              <Text className="text-gray-500 text-sm">Petitioner</Text>
              <Text className="font-medium text-gray-800">{caseData.parent_a_name}</Text>
            </View>
            <View className="px-4">
              <Text className="text-gray-400">vs</Text>
            </View>
            <View className="flex-1 items-end">
              <Text className="text-gray-500 text-sm">Respondent</Text>
              <Text className="font-medium text-gray-800">{caseData.parent_b_name}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-800">
                {caseData.children_count}
              </Text>
              <Text className="text-gray-500 text-xs">Children</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-800">
                {caseData.agreement_count}
              </Text>
              <Text className="text-gray-500 text-xs">Agreements</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {caseData.unread_messages}
              </Text>
              <Text className="text-gray-500 text-xs">Messages</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2">Quick Actions</Text>
          <View className="flex-row flex-wrap">
            <QuickAction
              icon="time-outline"
              label="Timeline"
              color="#2563eb"
              onPress={() => router.push(`/cases/${id}/timeline`)}
            />
            <QuickAction
              icon="chatbubbles-outline"
              label="Messages"
              color="#7c3aed"
              badge={caseData.unread_messages > 0 ? caseData.unread_messages : undefined}
              onPress={() => router.push(`/cases/${id}/messages`)}
            />
            <QuickAction
              icon="shield-checkmark-outline"
              label="ARIA"
              color="#059669"
              onPress={() => router.push(`/cases/${id}/aria`)}
              disabled={!caseData.can_control_aria}
            />
            <QuickAction
              icon="stats-chart-outline"
              label="Compliance"
              color="#ea580c"
              onPress={() => router.push(`/cases/${id}/compliance`)}
            />
          </View>
        </View>

        {/* Access Scopes */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-100">
          <Text className="text-gray-500 font-medium mb-3">Your Access</Text>
          <View className="flex-row flex-wrap">
            {caseData.access_scopes.map((scope) => (
              <View
                key={scope}
                className="bg-blue-50 px-3 py-1.5 rounded-full mr-2 mb-2"
              >
                <Text className="text-blue-600 text-sm capitalize">{scope}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Permissions */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-100">
          <Text className="text-gray-500 font-medium mb-3">Permissions</Text>
          <View className="flex-row items-center mb-2">
            <Ionicons
              name={caseData.can_message_client ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={caseData.can_message_client ? '#22c55e' : '#ef4444'}
            />
            <Text className="ml-2 text-gray-700">Client Messaging</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={caseData.can_control_aria ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={caseData.can_control_aria ? '#22c55e' : '#ef4444'}
            />
            <Text className="ml-2 text-gray-700">ARIA Control</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  color,
  badge,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  color: string;
  badge?: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`w-[48%] bg-white rounded-xl p-4 mr-[2%] mb-2 border border-gray-100 ${
        disabled ? 'opacity-50' : ''
      }`}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      disabled={disabled}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="w-10 h-10 rounded-lg items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        {badge && (
          <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center">
            <Text className="text-white text-xs font-bold">{badge}</Text>
          </View>
        )}
      </View>
      <Text className="font-medium text-gray-800 mt-2">{label}</Text>
    </TouchableOpacity>
  );
}

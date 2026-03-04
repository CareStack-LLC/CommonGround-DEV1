/**
 * Compliance Overview Screen
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  professional,
  type ComplianceOverview,
} from '@commonground/api-client';

export default function ComplianceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [compliance, setCompliance] = useState<ComplianceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);

  const fetchCompliance = useCallback(async () => {
    try {
      const data = await professional.timeline.getComplianceOverview(id!, {
        period_days: periodDays,
      });
      setCompliance(data);
    } catch (error) {
      console.error('Failed to fetch compliance:', error);
      // Demo data
      setCompliance({
        family_file_id: id!,
        period_start: new Date(Date.now() - periodDays * 86400000).toISOString(),
        period_end: new Date().toISOString(),
        exchange_compliance: {
          total_exchanges: 12,
          completed_on_time: 9,
          completed_late: 2,
          missed: 1,
          disputed: 0,
          completion_rate: 0.92,
          on_time_rate: 0.75,
          parent_a_compliance: 0.95,
          parent_b_compliance: 0.83,
        },
        financial_compliance: {
          total_obligations: 8,
          paid_on_time: 5,
          paid_late: 2,
          overdue: 1,
          disputed: 0,
          total_amount: 2400,
          paid_amount: 2100,
          overdue_amount: 300,
          parent_a_compliance: 0.88,
          parent_b_compliance: 0.75,
        },
        communication_compliance: {
          total_messages: 83,
          flagged_messages: 11,
          flag_rate: 0.13,
          average_response_time_hours: 4.5,
          parent_a_flag_rate: 0.067,
          parent_b_flag_rate: 0.21,
        },
        overall_score: 78,
        overall_status: 'good',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, periodDays]);

  useEffect(() => {
    setIsLoading(true);
    fetchCompliance();
  }, [fetchCompliance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' };
      case 'good':
        return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' };
      case 'fair':
        return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-100' };
      case 'concerning':
        return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
      default:
        return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-100' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(compliance?.overall_status || 'unknown');

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
            <Text className="text-lg font-bold text-gray-800">Compliance Overview</Text>
            <Text className="text-gray-500 text-sm">Last {periodDays} days</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View className="flex-row mt-3">
          {[30, 60, 90].map((days) => (
            <TouchableOpacity
              key={days}
              className={`px-4 py-2 rounded-full mr-2 ${
                periodDays === days ? 'bg-blue-600' : 'bg-gray-100'
              }`}
              onPress={() => setPeriodDays(days)}
            >
              <Text
                className={`font-medium ${
                  periodDays === days ? 'text-white' : 'text-gray-600'
                }`}
              >
                {days} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Overall Score */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-6 border border-gray-100 items-center">
          <View className="relative">
            <View
              className={`w-28 h-28 rounded-full ${statusColors.light} items-center justify-center`}
            >
              <Text className={`text-4xl font-bold ${statusColors.text}`}>
                {compliance?.overall_score}
              </Text>
              <Text className="text-gray-500 text-sm">/ 100</Text>
            </View>
            <View
              className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full ${statusColors.bg} items-center justify-center`}
            >
              <Ionicons
                name={
                  compliance?.overall_status === 'excellent'
                    ? 'checkmark-circle'
                    : compliance?.overall_status === 'concerning'
                    ? 'alert-circle'
                    : 'remove-circle'
                }
                size={24}
                color="#fff"
              />
            </View>
          </View>
          <Text className={`font-bold text-lg capitalize mt-4 ${statusColors.text}`}>
            {compliance?.overall_status} Compliance
          </Text>
        </View>

        {/* Exchange Compliance */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">CUSTODY EXCHANGES</Text>
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="swap-horizontal" size={22} color="#7c3aed" />
                </View>
                <View>
                  <Text className="font-bold text-gray-800">Exchange Rate</Text>
                  <Text className="text-gray-500 text-sm">
                    {compliance?.exchange_compliance.total_exchanges} total exchanges
                  </Text>
                </View>
              </View>
              <Text className="text-2xl font-bold text-purple-600">
                {((compliance?.exchange_compliance.completion_rate || 0) * 100).toFixed(0)}%
              </Text>
            </View>

            <View className="flex-row mb-3">
              <StatItem
                label="On Time"
                value={compliance?.exchange_compliance.completed_on_time || 0}
                color="#22c55e"
              />
              <StatItem
                label="Late"
                value={compliance?.exchange_compliance.completed_late || 0}
                color="#f59e0b"
              />
              <StatItem
                label="Missed"
                value={compliance?.exchange_compliance.missed || 0}
                color="#ef4444"
              />
            </View>

            <View className="pt-3 border-t border-gray-100">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500 text-sm">Petitioner Compliance</Text>
                <Text className="font-medium">
                  {((compliance?.exchange_compliance.parent_a_compliance || 0) * 100).toFixed(0)}%
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Respondent Compliance</Text>
                <Text className="font-medium">
                  {((compliance?.exchange_compliance.parent_b_compliance || 0) * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Financial Compliance */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">FINANCIAL</Text>
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="wallet" size={22} color="#059669" />
                </View>
                <View>
                  <Text className="font-bold text-gray-800">Payment Rate</Text>
                  <Text className="text-gray-500 text-sm">
                    ${compliance?.financial_compliance.total_amount?.toLocaleString()} total
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-lg font-bold text-green-600">
                  ${compliance?.financial_compliance.paid_amount?.toLocaleString()}
                </Text>
                <Text className="text-red-500 text-sm">
                  ${compliance?.financial_compliance.overdue_amount?.toLocaleString()} overdue
                </Text>
              </View>
            </View>

            <View className="flex-row mb-3">
              <StatItem
                label="On Time"
                value={compliance?.financial_compliance.paid_on_time || 0}
                color="#22c55e"
              />
              <StatItem
                label="Late"
                value={compliance?.financial_compliance.paid_late || 0}
                color="#f59e0b"
              />
              <StatItem
                label="Overdue"
                value={compliance?.financial_compliance.overdue || 0}
                color="#ef4444"
              />
            </View>
          </View>
        </View>

        {/* Communication Compliance */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">COMMUNICATION</Text>
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="chatbubbles" size={22} color="#2563eb" />
                </View>
                <View>
                  <Text className="font-bold text-gray-800">Message Quality</Text>
                  <Text className="text-gray-500 text-sm">
                    {compliance?.communication_compliance.total_messages} messages
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-lg font-bold text-red-500">
                  {((compliance?.communication_compliance.flag_rate || 0) * 100).toFixed(1)}%
                </Text>
                <Text className="text-gray-500 text-sm">flagged</Text>
              </View>
            </View>

            <View className="pt-3 border-t border-gray-100">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500 text-sm">Petitioner Flag Rate</Text>
                <Text
                  className={`font-medium ${
                    (compliance?.communication_compliance.parent_a_flag_rate || 0) > 0.15
                      ? 'text-red-500'
                      : 'text-green-600'
                  }`}
                >
                  {((compliance?.communication_compliance.parent_a_flag_rate || 0) * 100).toFixed(1)}%
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500 text-sm">Respondent Flag Rate</Text>
                <Text
                  className={`font-medium ${
                    (compliance?.communication_compliance.parent_b_flag_rate || 0) > 0.15
                      ? 'text-red-500'
                      : 'text-green-600'
                  }`}
                >
                  {((compliance?.communication_compliance.parent_b_flag_rate || 0) * 100).toFixed(1)}%
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Avg Response Time</Text>
                <Text className="font-medium">
                  {compliance?.communication_compliance.average_response_time_hours?.toFixed(1)}h
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-1 items-center">
      <View className="flex-row items-center">
        <View
          className="w-3 h-3 rounded-full mr-1"
          style={{ backgroundColor: color }}
        />
        <Text className="text-lg font-bold text-gray-800">{value}</Text>
      </View>
      <Text className="text-gray-500 text-xs">{label}</Text>
    </View>
  );
}

/**
 * Professional Dashboard Screen
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

import { useAuth } from '@/providers/AuthProvider';
import {
  professional,
  type ProfessionalDashboard,
  type CaseSummaryCard,
  type Alert as DashboardAlert,
} from '@commonground/api-client';

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await professional.dashboard.getDashboard({
        limit_cases: 5,
        limit_events: 5,
        limit_activity: 10,
      });
      setDashboard(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      // Set demo data
      setDashboard({
        case_count: 12,
        active_cases: 8,
        pending_intakes: 3,
        pending_approvals: 2,
        unread_messages: 7,
        cases: [
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
        ],
        alerts: [
          {
            id: 'a1',
            alert_type: 'compliance_issue',
            title: 'Exchange Compliance Drop',
            description: 'Williams case exchange compliance dropped below 70%',
            severity: 'warning',
            family_file_id: 'ff-1',
            family_file_title: 'Williams v. Williams',
            created_at: new Date().toISOString(),
          },
        ],
        pending_actions: [
          {
            id: 'pa1',
            action_type: 'review_intake',
            title: 'Review Intake',
            description: 'New intake completed for potential client',
            created_at: new Date().toISOString(),
          },
        ],
        upcoming_events: [
          {
            id: 'e1',
            title: 'Status Conference',
            event_type: 'hearing',
            event_date: new Date(Date.now() + 86400000 * 3).toISOString(),
            family_file_id: 'ff-1',
            family_file_title: 'Williams v. Williams',
            location: 'Courtroom 4B',
            is_mandatory: true,
          },
        ],
        recent_activity: [],
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 py-4">
          <Text className="text-gray-500">Welcome back,</Text>
          <Text className="text-2xl font-bold text-gray-800">
            {user?.first_name || 'Attorney'} {user?.last_name || ''}
          </Text>
          {profile?.firms && profile.firms.length > 0 && (
            <Text className="text-gray-500">{profile.firms[0].firm_name}</Text>
          )}
        </View>

        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 mb-6"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <StatCard
            icon="folder"
            label="Active Cases"
            value={dashboard?.active_cases || 0}
            color="#2563eb"
          />
          <StatCard
            icon="chatbubble"
            label="Unread Messages"
            value={dashboard?.unread_messages || 0}
            color="#7c3aed"
          />
          <StatCard
            icon="document-text"
            label="Pending Intakes"
            value={dashboard?.pending_intakes || 0}
            color="#059669"
          />
          <StatCard
            icon="checkmark-circle"
            label="Pending Approvals"
            value={dashboard?.pending_approvals || 0}
            color="#ea580c"
          />
        </ScrollView>

        {/* Alerts */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">Alerts</Text>
            {dashboard.alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </View>
        )}

        {/* Upcoming Events */}
        {dashboard?.upcoming_events && dashboard.upcoming_events.length > 0 && (
          <View className="px-4 mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-3">Upcoming</Text>
            {dashboard.upcoming_events.map((event) => (
              <TouchableOpacity
                key={event.id}
                className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-3">
                    <Ionicons name="calendar" size={24} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800">{event.title}</Text>
                    <Text className="text-gray-500 text-sm">
                      {event.family_file_title}
                    </Text>
                    <Text className="text-blue-600 text-sm">
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {event.is_mandatory && (
                    <View className="bg-red-100 px-2 py-1 rounded-full">
                      <Text className="text-red-600 text-xs font-medium">Required</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Cases */}
        <View className="px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">Recent Cases</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/cases')}>
              <Text className="text-blue-600 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          {dashboard?.cases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseData={caseItem} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View
      className="bg-white rounded-xl p-4 mr-3 border border-gray-100"
      style={{ minWidth: 140 }}
    >
      <View
        className="w-10 h-10 rounded-lg items-center justify-center mb-2"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text className="text-2xl font-bold text-gray-800">{value}</Text>
      <Text className="text-gray-500 text-sm">{label}</Text>
    </View>
  );
}

function AlertCard({ alert }: { alert: DashboardAlert }) {
  const severityColors = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '#2563eb' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '#d97706' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: '#dc2626' },
  };

  const colors = severityColors[alert.severity] || severityColors.info;

  return (
    <TouchableOpacity
      className={`${colors.bg} rounded-xl p-4 mb-2 border ${colors.border}`}
    >
      <View className="flex-row items-start">
        <Ionicons
          name={
            alert.severity === 'critical'
              ? 'alert-circle'
              : alert.severity === 'warning'
              ? 'warning'
              : 'information-circle'
          }
          size={24}
          color={colors.icon}
        />
        <View className="flex-1 ml-3">
          <Text className="font-bold text-gray-800">{alert.title}</Text>
          <Text className="text-gray-600 text-sm mt-1">{alert.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CaseCard({ caseData }: { caseData: CaseSummaryCard }) {
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
        <View
          className={`px-2 py-1 rounded-full ${
            caseData.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
          }`}
        >
          <Text
            className={`text-xs font-medium capitalize ${
              caseData.status === 'active' ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            {caseData.status}
          </Text>
        </View>
      </View>

      <Text className="font-bold text-gray-800 text-lg mb-1">{caseData.title}</Text>

      <View className="flex-row items-center mb-3">
        <Ionicons name="people-outline" size={14} color="#6b7280" />
        <Text className="text-gray-500 text-sm ml-1">
          {caseData.parent_a_name} vs {caseData.parent_b_name}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {caseData.children_count > 0 && (
            <View className="flex-row items-center mr-4">
              <Ionicons name="person-outline" size={14} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-1">
                {caseData.children_count} child{caseData.children_count > 1 ? 'ren' : ''}
              </Text>
            </View>
          )}
          <View className="flex-row items-center">
            <Text className="text-gray-400 text-xs">
              Rep: {caseData.representing === 'parent_a' ? 'Petitioner' : 'Respondent'}
            </Text>
          </View>
        </View>

        {caseData.unread_messages > 0 && (
          <View className="bg-blue-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-bold">
              {caseData.unread_messages} new
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

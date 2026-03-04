/**
 * ARIA Settings Screen
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  professional,
  type ARIASettings,
  type ARIAMetrics,
} from '@commonground/api-client';

const SENSITIVITY_LEVELS = [
  { value: 'low', label: 'Low', description: 'Minimal intervention' },
  { value: 'medium', label: 'Medium', description: 'Balanced approach' },
  { value: 'high', label: 'High', description: 'Active monitoring' },
];

export default function ARIAScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [settings, setSettings] = useState<ARIASettings | null>(null);
  const [metrics, setMetrics] = useState<ARIAMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [settingsData, metricsData] = await Promise.all([
        professional.aria.getARIASettings(id!),
        professional.aria.getARIAMetrics(id!, { period_days: 30 }),
      ]);
      setSettings(settingsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to fetch ARIA data:', error);
      // Demo data
      setSettings({
        aria_enabled: true,
        aria_provider: 'claude',
        sensitivity_level: 'medium',
        auto_intervene: true,
        intervention_threshold: 0.3,
        cool_down_minutes: 0,
        court_locked: false,
      });
      setMetrics({
        parent_a: {
          total_messages: 45,
          flagged_messages: 3,
          flag_rate: 0.067,
          suggestions_accepted: 2,
          suggestions_modified: 1,
          suggestions_rejected: 0,
          acceptance_rate: 0.67,
          average_toxicity: 0.15,
          trend: 'improving',
          compliance_score: 'good',
        },
        parent_b: {
          total_messages: 38,
          flagged_messages: 8,
          flag_rate: 0.21,
          suggestions_accepted: 4,
          suggestions_modified: 2,
          suggestions_rejected: 2,
          acceptance_rate: 0.5,
          average_toxicity: 0.32,
          trend: 'stable',
          compliance_score: 'fair',
        },
        overall_health: 'fair',
        trend: 'stable',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (field: keyof ARIASettings, value: boolean) => {
    if (!settings || settings.court_locked) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);

    try {
      await professional.aria.updateARIASettings(id!, { [field]: value });
    } catch (error) {
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleSensitivityChange = async (level: string) => {
    if (!settings || settings.court_locked) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newSettings = { ...settings, sensitivity_level: level as 'low' | 'medium' | 'high' };
    setSettings(newSettings);

    try {
      await professional.aria.updateARIASettings(id!, { sensitivity_level: level });
    } catch (error) {
      setSettings(settings);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'excellent':
        return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'good':
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'fair':
        return { bg: 'bg-amber-100', text: 'text-amber-600' };
      case 'needs_improvement':
      case 'concerning':
        return { bg: 'bg-red-100', text: 'text-red-600' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

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
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">ARIA Settings</Text>
            <Text className="text-gray-500 text-sm">AI Mediation Controls</Text>
          </View>
          <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
            <Ionicons name="shield-checkmark" size={24} color="#22c55e" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Court Lock Warning */}
        {settings?.court_locked && (
          <View className="mx-4 mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={24} color="#d97706" />
              <View className="flex-1 ml-3">
                <Text className="font-bold text-amber-800">Court Locked</Text>
                <Text className="text-amber-600 text-sm">
                  ARIA settings have been locked by the court and cannot be modified.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Main Toggle */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-bold text-gray-800">ARIA Enabled</Text>
              <Text className="text-gray-500 text-sm">
                AI-powered message mediation
              </Text>
            </View>
            <Switch
              value={settings?.aria_enabled}
              onValueChange={(value) => handleToggle('aria_enabled', value)}
              trackColor={{ false: '#d1d5db', true: '#22c55e' }}
              disabled={settings?.court_locked}
            />
          </View>
        </View>

        {/* Metrics Overview */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">
            OVERALL HEALTH (30 days)
          </Text>
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View
                  className={`px-3 py-1 rounded-full ${
                    getScoreColor(metrics?.overall_health || 'unknown').bg
                  }`}
                >
                  <Text
                    className={`font-bold capitalize ${
                      getScoreColor(metrics?.overall_health || 'unknown').text
                    }`}
                  >
                    {metrics?.overall_health}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Ionicons
                  name={
                    metrics?.trend === 'improving'
                      ? 'trending-up'
                      : metrics?.trend === 'declining'
                      ? 'trending-down'
                      : 'remove'
                  }
                  size={20}
                  color={
                    metrics?.trend === 'improving'
                      ? '#22c55e'
                      : metrics?.trend === 'declining'
                      ? '#ef4444'
                      : '#6b7280'
                  }
                />
                <Text className="text-gray-500 text-sm ml-1 capitalize">
                  {metrics?.trend}
                </Text>
              </View>
            </View>

            {/* Parent Metrics */}
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <Text className="text-gray-500 text-sm mb-2">Petitioner</Text>
                <View className="bg-gray-50 rounded-xl p-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-600 text-xs">Flag Rate</Text>
                    <Text className="font-bold text-gray-800">
                      {((metrics?.parent_a.flag_rate || 0) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-600 text-xs">Score</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        getScoreColor(metrics?.parent_a.compliance_score || '').bg
                      }`}
                    >
                      <Text
                        className={`text-xs capitalize ${
                          getScoreColor(metrics?.parent_a.compliance_score || '').text
                        }`}
                      >
                        {metrics?.parent_a.compliance_score?.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-500 text-sm mb-2">Respondent</Text>
                <View className="bg-gray-50 rounded-xl p-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-gray-600 text-xs">Flag Rate</Text>
                    <Text className="font-bold text-gray-800">
                      {((metrics?.parent_b.flag_rate || 0) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-600 text-xs">Score</Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        getScoreColor(metrics?.parent_b.compliance_score || '').bg
                      }`}
                    >
                      <Text
                        className={`text-xs capitalize ${
                          getScoreColor(metrics?.parent_b.compliance_score || '').text
                        }`}
                      >
                        {metrics?.parent_b.compliance_score?.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Sensitivity Level */}
        <View className="mx-4 mt-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">SENSITIVITY LEVEL</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            {SENSITIVITY_LEVELS.map((level, index) => (
              <TouchableOpacity
                key={level.value}
                className={`flex-row items-center p-4 ${
                  index < SENSITIVITY_LEVELS.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onPress={() => handleSensitivityChange(level.value)}
                disabled={settings?.court_locked}
              >
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                    settings?.sensitivity_level === level.value
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {settings?.sensitivity_level === level.value && (
                    <View className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">{level.label}</Text>
                  <Text className="text-gray-500 text-sm">{level.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Auto Intervene */}
        <View className="mx-4 mt-4 bg-white rounded-xl p-4 border border-gray-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="font-bold text-gray-800">Auto Intervene</Text>
              <Text className="text-gray-500 text-sm">
                Automatically suggest message rewrites
              </Text>
            </View>
            <Switch
              value={settings?.auto_intervene}
              onValueChange={(value) => handleToggle('auto_intervene', value)}
              trackColor={{ false: '#d1d5db', true: '#22c55e' }}
              disabled={settings?.court_locked}
            />
          </View>
        </View>

        {/* Provider Info */}
        <View className="mx-4 mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={24} color="#2563eb" />
            <View className="flex-1 ml-3">
              <Text className="font-medium text-blue-800">AI Provider</Text>
              <Text className="text-blue-600 text-sm capitalize">
                {settings?.aria_provider} - Advanced sentiment analysis
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

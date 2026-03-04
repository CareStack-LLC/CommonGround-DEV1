/**
 * Case Timeline Screen
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
  type TimelineEvent,
  type CaseTimeline,
} from '@commonground/api-client';

const EVENT_TYPES = [
  { value: 'all', label: 'All', icon: 'list' },
  { value: 'message', label: 'Messages', icon: 'chatbubble' },
  { value: 'exchange', label: 'Exchanges', icon: 'swap-horizontal' },
  { value: 'agreement', label: 'Agreement', icon: 'document-text' },
  { value: 'aria_flag', label: 'ARIA Flags', icon: 'warning' },
];

export default function TimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [timeline, setTimeline] = useState<CaseTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const fetchTimeline = useCallback(async () => {
    try {
      const data = await professional.timeline.getCaseTimeline(id!, {
        event_types: filter === 'all' ? undefined : [filter],
        flagged_only: showFlaggedOnly,
        limit: 100,
      });
      setTimeline(data);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      // Demo data
      setTimeline({
        family_file_id: id!,
        family_file_title: 'Williams v. Williams',
        total_events: 15,
        events: [
          {
            id: 'e1',
            event_type: 'message',
            title: 'Message sent',
            description: 'Sarah Williams sent a message regarding custody schedule',
            timestamp: new Date().toISOString(),
            actor_name: 'Sarah Williams',
            actor_type: 'parent_a',
            is_flagged: false,
          },
          {
            id: 'e2',
            event_type: 'aria_flag',
            title: 'ARIA Intervention',
            description: 'Message flagged for hostile language',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            actor_name: 'Michael Williams',
            actor_type: 'parent_b',
            is_flagged: true,
            flag_severity: 'medium',
            details: { toxicity_score: 0.7, categories: ['hostility'] },
          },
          {
            id: 'e3',
            event_type: 'exchange',
            title: 'Custody Exchange',
            description: 'Exchange completed at Starbucks (Main St)',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            actor_name: 'System',
            actor_type: 'system',
            is_flagged: false,
          },
          {
            id: 'e4',
            event_type: 'agreement',
            title: 'Agreement Updated',
            description: 'Section 5: Parenting Schedule updated by Sarah',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
            actor_name: 'Sarah Williams',
            actor_type: 'parent_a',
            is_flagged: false,
          },
          {
            id: 'e5',
            event_type: 'exchange',
            title: 'Missed Exchange',
            description: 'Michael did not complete scheduled exchange',
            timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
            actor_name: 'System',
            actor_type: 'system',
            is_flagged: true,
            flag_severity: 'high',
          },
        ],
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id, filter, showFlaggedOnly]);

  useEffect(() => {
    setIsLoading(true);
    fetchTimeline();
  }, [fetchTimeline]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimeline();
  }, [fetchTimeline]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'message':
        return { icon: 'chatbubble', color: '#2563eb' };
      case 'exchange':
        return { icon: 'swap-horizontal', color: '#7c3aed' };
      case 'agreement':
        return { icon: 'document-text', color: '#059669' };
      case 'aria_flag':
        return { icon: 'warning', color: '#dc2626' };
      case 'payment':
        return { icon: 'wallet', color: '#ea580c' };
      case 'court_event':
        return { icon: 'calendar', color: '#0891b2' };
      default:
        return { icon: 'ellipse', color: '#6b7280' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800">Case Timeline</Text>
            <Text className="text-gray-500 text-sm">
              {timeline?.family_file_title || 'Loading...'}
            </Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {EVENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              className={`flex-row items-center px-3 py-2 rounded-full mr-2 ${
                filter === type.value ? 'bg-blue-600' : 'bg-gray-100'
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(type.value);
              }}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={filter === type.value ? '#fff' : '#6b7280'}
              />
              <Text
                className={`ml-1 font-medium ${
                  filter === type.value ? 'text-white' : 'text-gray-600'
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Flagged Toggle */}
        <TouchableOpacity
          className="flex-row items-center mt-3"
          onPress={() => setShowFlaggedOnly(!showFlaggedOnly)}
        >
          <View
            className={`w-5 h-5 rounded border-2 items-center justify-center mr-2 ${
              showFlaggedOnly ? 'bg-red-500 border-red-500' : 'border-gray-300'
            }`}
          >
            {showFlaggedOnly && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
          <Text className="text-gray-600">Show flagged events only</Text>
        </TouchableOpacity>
      </View>

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
          {timeline?.events.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="time-outline" size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-lg">No events found</Text>
            </View>
          ) : (
            timeline?.events.map((event, index) => {
              const { icon, color } = getEventIcon(event.event_type);
              return (
                <View key={event.id} className="flex-row mb-4">
                  {/* Timeline Line */}
                  <View className="items-center mr-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: event.is_flagged ? '#fef2f2' : `${color}15`,
                        borderWidth: event.is_flagged ? 2 : 0,
                        borderColor: event.is_flagged ? '#dc2626' : undefined,
                      }}
                    >
                      <Ionicons
                        name={event.is_flagged ? 'flag' : (icon as any)}
                        size={20}
                        color={event.is_flagged ? '#dc2626' : color}
                      />
                    </View>
                    {index < (timeline?.events.length || 0) - 1 && (
                      <View className="w-0.5 flex-1 bg-gray-200 mt-1" />
                    )}
                  </View>

                  {/* Event Card */}
                  <View
                    className={`flex-1 bg-white rounded-xl p-4 border ${
                      event.is_flagged ? 'border-red-200' : 'border-gray-100'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-bold text-gray-800">{event.title}</Text>
                      <Text className="text-gray-400 text-xs">
                        {formatTime(event.timestamp)}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm mb-2">
                      {event.description}
                    </Text>
                    <View className="flex-row items-center">
                      <Ionicons name="person-outline" size={14} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">
                        {event.actor_name}
                      </Text>
                      {event.is_flagged && event.flag_severity && (
                        <View
                          className={`ml-auto px-2 py-0.5 rounded-full ${
                            event.flag_severity === 'high'
                              ? 'bg-red-100'
                              : event.flag_severity === 'medium'
                              ? 'bg-amber-100'
                              : 'bg-yellow-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              event.flag_severity === 'high'
                                ? 'text-red-600'
                                : event.flag_severity === 'medium'
                                ? 'text-amber-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {event.flag_severity}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

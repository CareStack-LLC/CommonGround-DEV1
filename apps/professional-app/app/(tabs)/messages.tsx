/**
 * Messages Screen - All professional messages
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

import {
  professional,
  type MessageThread,
} from '@commonground/api-client';

export default function MessagesScreen() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      // In real app, would fetch from all cases
      const unread = await professional.messaging.getUnreadMessages({ limit: 50 });
      // Group by thread_id if available, otherwise just show as-is
      // For demo, create fake threads
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }

    // Demo data
    setThreads([
      {
        thread_id: 't1',
        family_file_id: 'ff-1',
        case_assignment_id: 'ca-1',
        subject: 'Question about custody schedule',
        last_message_at: new Date().toISOString(),
        message_count: 5,
        unread_count: 2,
        participants: ['Sarah Williams'],
        messages: [],
        parent_name: 'Sarah Williams',
        family_file_title: 'Williams v. Williams',
      },
      {
        thread_id: 't2',
        family_file_id: 'ff-2',
        case_assignment_id: 'ca-2',
        subject: 'Document submission',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        message_count: 3,
        unread_count: 0,
        participants: ['David Johnson'],
        messages: [],
        parent_name: 'David Johnson',
        family_file_title: 'Johnson v. Johnson',
      },
      {
        thread_id: 't3',
        family_file_id: 'ff-1',
        case_assignment_id: 'ca-1',
        subject: 'Follow up on meeting',
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        message_count: 8,
        unread_count: 0,
        participants: ['Michael Williams'],
        messages: [],
        parent_name: 'Michael Williams',
        family_file_title: 'Williams v. Williams',
      },
    ]);
    setIsLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchThreads();
  }, [fetchThreads]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHrs < 1) {
      return 'Just now';
    } else if (diffHrs < 24) {
      return `${Math.floor(diffHrs)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-800">Messages</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : threads.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 mt-4 text-lg">No messages</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {threads.map((thread) => (
            <TouchableOpacity
              key={thread.thread_id}
              className={`px-4 py-4 border-b border-gray-100 ${
                thread.unread_count > 0 ? 'bg-blue-50' : 'bg-white'
              }`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/cases/${thread.family_file_id}/messages`);
              }}
            >
              <View className="flex-row items-start">
                {/* Avatar */}
                <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-600 font-bold text-lg">
                    {thread.parent_name?.charAt(0) || '?'}
                  </Text>
                </View>

                {/* Content */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className={`font-bold ${thread.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                      {thread.parent_name}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {formatTime(thread.last_message_at)}
                    </Text>
                  </View>

                  <Text className="text-gray-500 text-sm mb-1">
                    {thread.family_file_title}
                  </Text>

                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`flex-1 ${
                        thread.unread_count > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                      }`}
                      numberOfLines={1}
                    >
                      {thread.subject || 'No subject'}
                    </Text>
                    {thread.unread_count > 0 && (
                      <View className="bg-blue-600 rounded-full w-6 h-6 items-center justify-center ml-2">
                        <Text className="text-white text-xs font-bold">
                          {thread.unread_count}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

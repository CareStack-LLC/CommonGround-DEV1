/**
 * Intake Session Detail Screen
 *
 * Shows intake session details, transcript, summary, and allows review.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import {
  professional,
  type IntakeSessionDetail,
  type IntakeTranscript,
  type IntakeSummary,
} from '@commonground/api-client';

type Tab = 'overview' | 'transcript' | 'summary';

export default function IntakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<IntakeSessionDetail | null>(null);
  const [transcript, setTranscript] = useState<IntakeTranscript | null>(null);
  const [summary, setSummary] = useState<IntakeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isReviewing, setIsReviewing] = useState(false);
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarificationRequest, setClarificationRequest] = useState('');

  const fetchSession = useCallback(async () => {
    if (!id) return;

    try {
      const [sessionData, transcriptData, summaryData] = await Promise.all([
        professional.intake.getSession(id),
        professional.intake.getTranscript(id).catch(() => null),
        professional.intake.getSummary(id).catch(() => null),
      ]);

      setSession(sessionData);
      setTranscript(transcriptData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch intake session:', error);
      // Demo data
      setSession({
        id: id!,
        session_number: 'INT-2026-001',
        case_id: 'case-1',
        family_file_id: 'ff-1',
        professional_id: 'prof-1',
        parent_id: 'parent-1',
        intake_link: 'https://example.com/intake/abc123',
        access_link_expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        access_link_used_at: new Date(Date.now() - 86400000).toISOString(),
        target_forms: ['FL-300', 'FL-311'],
        status: 'completed',
        started_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 3600000).toISOString(),
        message_count: 24,
        parent_confirmed: true,
        parent_confirmed_at: new Date(Date.now() - 3600000).toISOString(),
        professional_reviewed: false,
        clarification_requested: false,
        aria_summary:
          'Sarah Williams is seeking modification of custody arrangement due to work schedule changes. Primary concerns include transportation logistics and consistent communication regarding school events. She proposes a 60/40 custody split with flexibility for work travel.',
        extracted_data: {
          full_name: 'Sarah Williams',
          employment: 'Marketing Director at Tech Corp',
          proposed_custody: '60/40 split',
          primary_concerns: ['Transportation', 'Communication', 'Schedule flexibility'],
        },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      });

      setTranscript({
        session_number: 'INT-2026-001',
        messages: [
          {
            role: 'assistant',
            content:
              "Hello! I'm ARIA, your intake assistant. I'll help gather information for your custody case. Let's start with some basic information. What is your full legal name?",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            role: 'user',
            content: 'My name is Sarah Williams.',
            timestamp: new Date(Date.now() - 86400000 + 60000).toISOString(),
          },
          {
            role: 'assistant',
            content: 'Thank you, Sarah. Can you tell me about your current employment situation?',
            timestamp: new Date(Date.now() - 86400000 + 120000).toISOString(),
          },
          {
            role: 'user',
            content:
              "I work as a Marketing Director at Tech Corp. I've been there for 5 years. Sometimes I need to travel for work, maybe once or twice a month.",
            timestamp: new Date(Date.now() - 86400000 + 180000).toISOString(),
          },
        ],
        message_count: 24,
        started_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 3600000).toISOString(),
      });

      setSummary({
        session_number: 'INT-2026-001',
        aria_summary:
          'Sarah Williams is seeking modification of custody arrangement due to work schedule changes. Primary concerns include transportation logistics and consistent communication regarding school events. She proposes a 60/40 custody split with flexibility for work travel.',
        extracted_data: {
          full_name: 'Sarah Williams',
          employment: 'Marketing Director at Tech Corp',
          proposed_custody: '60/40 split',
          primary_concerns: ['Transportation', 'Communication', 'Schedule flexibility'],
        },
        target_forms: ['FL-300', 'FL-311'],
        message_count: 24,
        parent_confirmed: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleCopyLink = async () => {
    if (session?.intake_link) {
      await Clipboard.setStringAsync(session.intake_link);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied', 'Intake link copied to clipboard');
    }
  };

  const handleMarkReviewed = async () => {
    if (!session) return;

    setIsReviewing(true);
    try {
      await professional.intake.markReviewed(session.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              professional_reviewed: true,
              professional_reviewed_at: new Date().toISOString(),
            }
          : null
      );
      Alert.alert('Success', 'Intake marked as reviewed');
    } catch (error) {
      console.error('Failed to mark reviewed:', error);
      Alert.alert('Error', 'Failed to mark intake as reviewed');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRequestClarification = async () => {
    if (!session || !clarificationRequest.trim()) return;

    try {
      await professional.intake.requestClarification(session.id, clarificationRequest);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowClarificationModal(false);
      setClarificationRequest('');
      setSession((prev) =>
        prev
          ? {
              ...prev,
              clarification_requested: true,
              clarification_request: clarificationRequest,
            }
          : null
      );
      Alert.alert('Sent', 'Clarification request sent to parent');
    } catch (error) {
      console.error('Failed to request clarification:', error);
      Alert.alert('Error', 'Failed to send clarification request');
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'in_progress':
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-600' };
      case 'expired':
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
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

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">Session not found</Text>
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(session.status);

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
          <Text className="text-lg font-bold text-gray-800">{session.session_number}</Text>
          <View className={`${statusColors.bg} px-3 py-1 rounded-full`}>
            <Text className={`${statusColors.text} text-sm font-medium capitalize`}>
              {session.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-100">
        {(['overview', 'transcript', 'summary'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === tab ? 'border-blue-600' : 'border-transparent'
            }`}
          >
            <Text
              className={`font-medium capitalize ${
                activeTab === tab ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'overview' && (
          <View className="p-4">
            {/* Status Badges */}
            <View className="flex-row flex-wrap mb-4">
              {session.parent_confirmed && (
                <View className="flex-row items-center bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text className="text-green-600 text-sm font-medium ml-1">
                    Parent Confirmed
                  </Text>
                </View>
              )}
              {session.professional_reviewed && (
                <View className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Ionicons name="checkmark-done" size={16} color="#2563eb" />
                  <Text className="text-blue-600 text-sm font-medium ml-1">Reviewed</Text>
                </View>
              )}
              {session.clarification_requested && (
                <View className="flex-row items-center bg-amber-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Ionicons name="help-circle" size={16} color="#f59e0b" />
                  <Text className="text-amber-600 text-sm font-medium ml-1">
                    Awaiting Clarification
                  </Text>
                </View>
              )}
            </View>

            {/* Info Cards */}
            <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
              <Text className="font-bold text-gray-800 mb-3">Session Details</Text>
              <InfoRow label="Messages" value={session.message_count.toString()} />
              <InfoRow label="Started" value={formatDateTime(session.started_at)} />
              <InfoRow label="Completed" value={formatDateTime(session.completed_at)} />
              <InfoRow label="Link Used" value={formatDateTime(session.access_link_used_at)} />
            </View>

            {/* Target Forms */}
            {session.target_forms && session.target_forms.length > 0 && (
              <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <Text className="font-bold text-gray-800 mb-3">Target Forms</Text>
                <View className="flex-row flex-wrap">
                  {session.target_forms.map((form, i) => (
                    <View key={i} className="bg-blue-50 px-3 py-2 rounded-lg mr-2 mb-2">
                      <Text className="text-blue-600 font-medium">{form}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Intake Link */}
            {session.status !== 'completed' && (
              <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                <Text className="font-bold text-gray-800 mb-2">Intake Link</Text>
                <View className="flex-row items-center">
                  <Text
                    className="flex-1 text-blue-600 text-sm"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {session.intake_link}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyLink}
                    className="ml-2 bg-blue-100 p-2 rounded-lg"
                  >
                    <Ionicons name="copy-outline" size={20} color="#2563eb" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-400 text-xs mt-2">
                  Expires {formatDateTime(session.access_link_expires_at)}
                </Text>
              </View>
            )}

            {/* Actions */}
            {session.status === 'completed' && session.parent_confirmed && (
              <View className="mt-4">
                {!session.professional_reviewed && (
                  <TouchableOpacity
                    onPress={handleMarkReviewed}
                    disabled={isReviewing}
                    className="bg-blue-600 py-4 rounded-xl items-center mb-3"
                  >
                    {isReviewing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-done" size={20} color="white" />
                        <Text className="text-white font-bold text-lg ml-2">
                          Mark as Reviewed
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {!session.clarification_requested && (
                  <TouchableOpacity
                    onPress={() => setShowClarificationModal(true)}
                    className="bg-amber-500 py-4 rounded-xl items-center"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="help-circle" size={20} color="white" />
                      <Text className="text-white font-bold text-lg ml-2">
                        Request Clarification
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'transcript' && transcript && (
          <View className="p-4">
            {transcript.messages.map((msg, i) => (
              <View
                key={i}
                className={`mb-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[85%] p-3 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-blue-600 rounded-br-none'
                      : 'bg-white border border-gray-100 rounded-bl-none'
                  }`}
                >
                  <Text className={msg.role === 'user' ? 'text-white' : 'text-gray-800'}>
                    {msg.content}
                  </Text>
                </View>
                <Text className="text-xs text-gray-400 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'summary' && summary && (
          <View className="p-4">
            {/* ARIA Summary */}
            <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-2">
                  <Ionicons name="sparkles" size={16} color="#7c3aed" />
                </View>
                <Text className="font-bold text-gray-800">ARIA Summary</Text>
              </View>
              <Text className="text-gray-600 leading-6">
                {summary.aria_summary || 'No summary available yet.'}
              </Text>
            </View>

            {/* Extracted Data */}
            {summary.extracted_data && Object.keys(summary.extracted_data).length > 0 && (
              <View className="bg-white rounded-xl p-4 border border-gray-100">
                <Text className="font-bold text-gray-800 mb-3">Extracted Information</Text>
                {Object.entries(summary.extracted_data).map(([key, value]) => (
                  <View key={key} className="mb-3">
                    <Text className="text-gray-400 text-xs uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </Text>
                    <Text className="text-gray-800 mt-1">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Clarification Modal */}
      <Modal
        visible={showClarificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClarificationModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800">Request Clarification</Text>
              <TouchableOpacity onPress={() => setShowClarificationModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 mb-4">
              Ask the parent for additional information or clarification.
            </Text>

            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-800 mb-4"
              placeholder="What information do you need?"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={clarificationRequest}
              onChangeText={setClarificationRequest}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleRequestClarification}
              disabled={!clarificationRequest.trim()}
              className={`py-4 rounded-xl items-center ${
                clarificationRequest.trim() ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <Text className="text-white font-bold text-lg">Send Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-gray-50">
      <Text className="text-gray-500">{label}</Text>
      <Text className="text-gray-800 font-medium">{value}</Text>
    </View>
  );
}

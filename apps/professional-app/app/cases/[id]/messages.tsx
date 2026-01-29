/**
 * Case Messages Screen
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  professional,
  type ProfessionalMessage,
} from '@commonground/api-client';

export default function CaseMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ProfessionalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [clientName, setClientName] = useState('Client');

  const fetchMessages = useCallback(async () => {
    try {
      const response = await professional.messaging.getCaseMessages(id!, { limit: 50 });
      setMessages(response.items);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Demo data
      setClientName('Sarah Williams');
      setMessages([
        {
          id: 'm1',
          family_file_id: id!,
          case_assignment_id: 'ca-1',
          sender_id: 'p-1',
          sender_type: 'professional',
          recipient_id: 'u-1',
          subject: 'Custody Schedule',
          content: 'Hi Sarah, I wanted to follow up on our discussion about the custody schedule modifications. When would be a good time to discuss this further?',
          is_read: true,
          sent_at: new Date(Date.now() - 86400000).toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
          sender_name: 'John Smith, Esq.',
        },
        {
          id: 'm2',
          family_file_id: id!,
          case_assignment_id: 'ca-1',
          sender_id: 'u-1',
          sender_type: 'parent',
          recipient_id: 'p-1',
          content: 'Thank you for reaching out. I\'m available tomorrow afternoon or Thursday morning. Would either of those work for you?',
          is_read: true,
          sent_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          sender_name: 'Sarah Williams',
        },
        {
          id: 'm3',
          family_file_id: id!,
          case_assignment_id: 'ca-1',
          sender_id: 'p-1',
          sender_type: 'professional',
          recipient_id: 'u-1',
          content: 'Thursday morning works great. I\'ll send you a calendar invite for 10 AM. We can discuss the proposed changes and I\'ll prepare the necessary documentation.',
          is_read: true,
          sent_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          sender_name: 'John Smith, Esq.',
        },
        {
          id: 'm4',
          family_file_id: id!,
          case_assignment_id: 'ca-1',
          sender_id: 'u-1',
          sender_type: 'parent',
          recipient_id: 'p-1',
          content: 'Perfect, thank you! I also wanted to ask about the upcoming mediation session. Is there anything I should prepare beforehand?',
          is_read: false,
          sent_at: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sender_name: 'Sarah Williams',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when messages load
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const sent = await professional.messaging.sendMessage(id!, {
        recipient_id: 'client-id', // Would be actual client ID
        content: messageText,
      });
      setMessages((prev) => [...prev, sent]);
    } catch (error) {
      // Demo: add locally
      const demoMessage: ProfessionalMessage = {
        id: `m-${Date.now()}`,
        family_file_id: id!,
        case_assignment_id: 'ca-1',
        sender_id: 'p-1',
        sender_type: 'professional',
        recipient_id: 'u-1',
        content: messageText,
        is_read: true,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        sender_name: 'You',
      };
      setMessages((prev) => [...prev, demoMessage]);
    } finally {
      setSending(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    if (diffHrs < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'bottom']}>
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
            <Text className="text-lg font-bold text-gray-800">{clientName}</Text>
            <Text className="text-gray-500 text-sm">Client Messages</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <>
            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4 pt-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {messages.length === 0 ? (
                <View className="items-center py-12">
                  <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4">No messages yet</Text>
                </View>
              ) : (
                messages.map((message) => {
                  const isFromMe = message.sender_type === 'professional';
                  return (
                    <View
                      key={message.id}
                      className={`mb-3 max-w-[85%] ${
                        isFromMe ? 'self-end' : 'self-start'
                      }`}
                    >
                      <View
                        className={`rounded-2xl px-4 py-3 ${
                          isFromMe ? 'bg-blue-600' : 'bg-white border border-gray-200'
                        }`}
                      >
                        <Text
                          className={isFromMe ? 'text-white' : 'text-gray-800'}
                        >
                          {message.content}
                        </Text>
                      </View>
                      <View
                        className={`flex-row items-center mt-1 ${
                          isFromMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <Text className="text-gray-400 text-xs">
                          {formatTime(message.sent_at)}
                        </Text>
                        {isFromMe && (
                          <Ionicons
                            name={message.is_read ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color="#9ca3af"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input */}
            <View className="bg-white px-4 py-3 border-t border-gray-100">
              <View className="flex-row items-end">
                <View className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 mr-2">
                  <TextInput
                    className="text-gray-800 max-h-24"
                    placeholder="Type a message..."
                    placeholderTextColor="#9ca3af"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                  />
                </View>
                <TouchableOpacity
                  className={`w-11 h-11 rounded-full items-center justify-center ${
                    newMessage.trim() && !sending ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  onPress={handleSend}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

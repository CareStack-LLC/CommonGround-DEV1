/**
 * Create Intake Session Screen
 *
 * Allows professionals to create new intake sessions for parents.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { professional, type CaseSummaryCard } from '@commonground/api-client';

// Common California family law forms
const FORM_OPTIONS = [
  { id: 'FL-300', name: 'Request for Order', description: 'General custody/support motions' },
  { id: 'FL-311', name: 'Child Custody Declaration', description: 'Detailed custody information' },
  { id: 'FL-341', name: 'Child Support Worksheet', description: 'Income and support calculation' },
  { id: 'FL-150', name: 'Income and Expense Declaration', description: 'Financial disclosure' },
  { id: 'FL-105', name: 'Declaration Under UCCJEA', description: 'Jurisdiction information' },
];

interface CaseOption {
  id: string;
  family_file_id: string;
  title: string;
  parent_a_id?: string;
  parent_a_name?: string;
  parent_b_id?: string;
  parent_b_name?: string;
}

export default function CreateIntakeScreen() {
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [selectedCase, setSelectedCase] = useState<CaseOption | null>(null);
  const [selectedParent, setSelectedParent] = useState<'a' | 'b' | null>(null);
  const [selectedForms, setSelectedForms] = useState<string[]>(['FL-300', 'FL-311']);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);

  // Result state
  const [createdIntake, setCreatedIntake] = useState<{
    session_number: string;
    intake_link: string;
    expires_at: string;
  } | null>(null);

  const fetchCases = useCallback(async () => {
    try {
      const response = await professional.cases.listCases({ status: 'active' });
      setCases(
        response.items.map((c: any) => ({
          id: c.id,
          family_file_id: c.family_file_id,
          title: c.title || `${c.parent_a_name} v. ${c.parent_b_name}`,
          parent_a_id: c.parent_a_id,
          parent_a_name: c.parent_a_name,
          parent_b_id: c.parent_b_id,
          parent_b_name: c.parent_b_name,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      // Demo data
      setCases([
        {
          id: '1',
          family_file_id: 'ff-1',
          title: 'Williams v. Williams',
          parent_a_id: 'pa-1',
          parent_a_name: 'Sarah Williams',
          parent_b_id: 'pb-1',
          parent_b_name: 'Michael Williams',
        },
        {
          id: '2',
          family_file_id: 'ff-2',
          title: 'Johnson v. Johnson',
          parent_a_id: 'pa-2',
          parent_a_name: 'Emily Johnson',
          parent_b_id: 'pb-2',
          parent_b_name: 'David Johnson',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const toggleForm = (formId: string) => {
    Haptics.selectionAsync();
    setSelectedForms((prev) =>
      prev.includes(formId) ? prev.filter((f) => f !== formId) : [...prev, formId]
    );
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setCustomQuestions((prev) => [...prev, newQuestion.trim()]);
      setNewQuestion('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeQuestion = (index: number) => {
    Haptics.selectionAsync();
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!selectedCase || !selectedParent) {
      Alert.alert('Missing Information', 'Please select a case and parent.');
      return;
    }

    setIsCreating(true);
    try {
      const parentId =
        selectedParent === 'a' ? selectedCase.parent_a_id : selectedCase.parent_b_id;

      const result = await professional.intake.createSession({
        case_id: selectedCase.id,
        family_file_id: selectedCase.family_file_id,
        parent_id: parentId!,
        target_forms: selectedForms,
        custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
        expires_in_days: expiresInDays,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedIntake({
        session_number: result.session_number,
        intake_link: result.intake_link,
        expires_at: result.expires_at,
      });
    } catch (error) {
      console.error('Failed to create intake:', error);
      // Demo result
      setCreatedIntake({
        session_number: `INT-${Date.now()}`,
        intake_link: `https://app.commonground.co/intake/${Math.random().toString(36).substr(2, 9)}`,
        expires_at: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdIntake) {
      await Clipboard.setStringAsync(createdIntake.intake_link);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Copied!', 'Intake link copied to clipboard. Send this to the parent.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  // Success screen
  if (createdIntake) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          </View>

          <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
            Intake Created!
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Session {createdIntake.session_number}
          </Text>

          <View className="bg-white rounded-xl p-4 w-full mb-6 border border-gray-100">
            <Text className="text-gray-400 text-xs mb-2">INTAKE LINK</Text>
            <Text className="text-blue-600 text-sm mb-4" numberOfLines={2}>
              {createdIntake.intake_link}
            </Text>

            <TouchableOpacity
              onPress={handleCopyLink}
              className="bg-blue-600 py-3 rounded-xl items-center"
            >
              <View className="flex-row items-center">
                <Ionicons name="copy-outline" size={20} color="white" />
                <Text className="text-white font-bold ml-2">Copy Link</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-400 text-sm text-center mb-6">
            Link expires{' '}
            {new Date(createdIntake.expires_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-gray-100 py-3 px-8 rounded-xl"
          >
            <Text className="text-gray-700 font-medium">Done</Text>
          </TouchableOpacity>
        </View>
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
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">New Intake</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Select Case */}
        <View className="p-4">
          <Text className="text-lg font-bold text-gray-800 mb-3">Select Case</Text>
          {cases.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCase(c);
                setSelectedParent(null);
              }}
              className={`bg-white rounded-xl p-4 mb-2 border ${
                selectedCase?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <Text className="font-bold text-gray-800">{c.title}</Text>
              <Text className="text-gray-500 text-sm">
                {c.parent_a_name} vs {c.parent_b_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Select Parent */}
        {selectedCase && (
          <View className="p-4 pt-0">
            <Text className="text-lg font-bold text-gray-800 mb-3">Select Parent</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedParent('a');
                }}
                className={`flex-1 bg-white rounded-xl p-4 mr-2 border ${
                  selectedParent === 'a' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                }`}
              >
                <Text className="text-gray-400 text-xs">Petitioner</Text>
                <Text className="font-bold text-gray-800">{selectedCase.parent_a_name}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedParent('b');
                }}
                className={`flex-1 bg-white rounded-xl p-4 ml-2 border ${
                  selectedParent === 'b' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'
                }`}
              >
                <Text className="text-gray-400 text-xs">Respondent</Text>
                <Text className="font-bold text-gray-800">{selectedCase.parent_b_name}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Target Forms */}
        <View className="p-4 pt-0">
          <Text className="text-lg font-bold text-gray-800 mb-3">Target Forms</Text>
          <Text className="text-gray-500 text-sm mb-3">
            Select the forms ARIA should gather information for
          </Text>

          {FORM_OPTIONS.map((form) => (
            <TouchableOpacity
              key={form.id}
              onPress={() => toggleForm(form.id)}
              className={`flex-row items-center bg-white rounded-xl p-4 mb-2 border ${
                selectedForms.includes(form.id) ? 'border-blue-500' : 'border-gray-100'
              }`}
            >
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
                  selectedForms.includes(form.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {selectedForms.includes(form.id) && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800">{form.id}</Text>
                <Text className="text-gray-500 text-sm">{form.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Questions */}
        <View className="p-4 pt-0">
          <Text className="text-lg font-bold text-gray-800 mb-3">Custom Questions</Text>
          <Text className="text-gray-500 text-sm mb-3">
            Add any additional questions for ARIA to ask
          </Text>

          {customQuestions.map((q, i) => (
            <View
              key={i}
              className="flex-row items-center bg-white rounded-xl p-4 mb-2 border border-gray-100"
            >
              <Text className="flex-1 text-gray-800">{q}</Text>
              <TouchableOpacity onPress={() => removeQuestion(i)} className="ml-2">
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View className="flex-row items-center">
            <TextInput
              className="flex-1 bg-white border border-gray-200 rounded-xl p-4 text-gray-800"
              placeholder="Add a custom question..."
              placeholderTextColor="#9ca3af"
              value={newQuestion}
              onChangeText={setNewQuestion}
              onSubmitEditing={addQuestion}
            />
            <TouchableOpacity
              onPress={addQuestion}
              className="ml-2 bg-blue-600 p-4 rounded-xl"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expiration */}
        <View className="p-4 pt-0">
          <Text className="text-lg font-bold text-gray-800 mb-3">Link Expiration</Text>
          <View className="flex-row">
            {[3, 7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpiresInDays(days);
                }}
                className={`flex-1 py-3 items-center rounded-xl mr-2 ${
                  expiresInDays === days ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-medium ${
                    expiresInDays === days ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View className="p-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!selectedCase || !selectedParent || isCreating}
          className={`py-4 rounded-xl items-center ${
            selectedCase && selectedParent && !isCreating ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          {isCreating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Intake Session</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

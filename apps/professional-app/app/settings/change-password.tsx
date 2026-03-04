/**
 * Change Password Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // Would call API to change password
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password changed successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text className="text-lg font-bold text-gray-800">Change Password</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-white rounded-xl p-4 border border-gray-100">
          {/* Current Password */}
          <View className="mb-4">
            <Text className="text-gray-600 mb-2">Current Password</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
              <TextInput
                className="flex-1 py-3 text-gray-800"
                placeholder="Enter current password"
                placeholderTextColor="#9ca3af"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View className="mb-4">
            <Text className="text-gray-600 mb-2">New Password</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
              <TextInput
                className="flex-1 py-3 text-gray-800"
                placeholder="Minimum 8 characters"
                placeholderTextColor="#9ca3af"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="mb-6">
            <Text className="text-gray-600 mb-2">Confirm New Password</Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
              <TextInput
                className="flex-1 py-3 text-gray-800"
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {confirmPassword.length > 0 && (
                <Ionicons
                  name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={newPassword === confirmPassword ? '#22c55e' : '#ef4444'}
                />
              )}
            </View>
          </View>

          <TouchableOpacity
            className={`py-4 rounded-xl items-center ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600'
            }`}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Password Requirements */}
        <View className="mt-4 bg-blue-50 rounded-xl p-4">
          <Text className="text-blue-800 font-medium mb-2">Password Requirements</Text>
          <View className="flex-row items-center mb-1">
            <Ionicons
              name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={newPassword.length >= 8 ? '#22c55e' : '#6b7280'}
            />
            <Text className="text-blue-600 text-sm ml-2">At least 8 characters</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={/[A-Z]/.test(newPassword) ? '#22c55e' : '#6b7280'}
            />
            <Text className="text-blue-600 text-sm ml-2">
              Include uppercase letter (recommended)
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

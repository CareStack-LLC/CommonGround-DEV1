/**
 * Forgot Password Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { professional } from '@commonground/api-client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await professional.auth.forgotPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1e40af', '#1e3a8a', '#172554']} className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center px-4 pt-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View className="items-center pt-8 pb-8">
            <View className="w-16 h-16 bg-white/10 rounded-full items-center justify-center mb-4">
              <Ionicons name="key-outline" size={32} color="#fff" />
            </View>
            <Text className="text-2xl font-bold text-white">Reset Password</Text>
          </View>

          {/* Form */}
          <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
            {sent ? (
              <View className="items-center py-8">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-2">Check Your Email</Text>
                <Text className="text-gray-500 text-center mb-8">
                  We've sent a password reset link to{'\n'}
                  <Text className="font-medium">{email}</Text>
                </Text>
                <TouchableOpacity
                  className="bg-blue-600 py-4 px-8 rounded-xl"
                  onPress={() => router.replace('/login')}
                >
                  <Text className="text-white font-bold text-lg">Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="text-gray-500 mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

                {/* Email Input */}
                <View className="mb-6">
                  <Text className="text-gray-600 font-medium mb-2">Email</Text>
                  <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                    <Ionicons name="mail-outline" size={20} color="#6b7280" />
                    <TextInput
                      className="flex-1 py-4 px-3 text-gray-800"
                      placeholder="you@lawfirm.com"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
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
                    <Text className="text-white font-bold text-lg">Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

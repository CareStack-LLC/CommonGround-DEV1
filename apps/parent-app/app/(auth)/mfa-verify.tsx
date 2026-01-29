/**
 * MFA Verification Screen
 *
 * Shown when login requires two-factor authentication
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '@/providers/AuthProvider';

const CODE_LENGTH = 6;

export default function MFAVerifyScreen() {
  const { verifyMFA, isLoading, error, clearError } = useAuth();
  const [code, setCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadMFAToken();
    inputRef.current?.focus();
  }, []);

  const loadMFAToken = async () => {
    const token = await SecureStore.getItemAsync('mfa_token');
    if (token) {
      setMfaToken(token);
    } else {
      // No MFA token - go back to login
      router.replace('/(auth)/login');
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits
    const digits = text.replace(/[^0-9]/g, '');
    setCode(digits);
    clearError();

    // Auto-submit when code is complete
    if (digits.length === CODE_LENGTH) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (verificationCode: string = code) => {
    if (verificationCode.length !== CODE_LENGTH || !mfaToken) return;

    const success = await verifyMFA(verificationCode, mfaToken);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleCancel = async () => {
    await SecureStore.deleteItemAsync('mfa_token');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12 pb-8">
          {/* Header */}
          <TouchableOpacity
            className="mb-8"
            onPress={handleCancel}
          >
            <Ionicons name="arrow-back" size={24} color="#64748b" />
          </TouchableOpacity>

          {/* Icon */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Ionicons name="shield-checkmark" size={40} color="#2563eb" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-secondary-900 dark:text-white text-center mb-2">
            Two-Factor Authentication
          </Text>
          <Text className="text-secondary-500 dark:text-secondary-400 text-center mb-8">
            Enter the 6-digit code from your authenticator app
          </Text>

          {/* Code Input */}
          <View className="mb-6">
            <TextInput
              ref={inputRef}
              className="text-4xl font-mono text-center text-secondary-900 dark:text-white tracking-[0.5em] py-4 border-b-2 border-secondary-200 dark:border-secondary-700 focus:border-primary-500"
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
              placeholder="000000"
              placeholderTextColor="#d1d5db"
            />
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-danger-50 dark:bg-danger-500/10 p-3 rounded-lg mb-6">
              <Text className="text-danger-600 dark:text-danger-500 text-sm text-center">
                {error}
              </Text>
            </View>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            className={`btn-primary ${isLoading || code.length !== CODE_LENGTH ? 'opacity-70' : ''}`}
            onPress={() => handleVerify()}
            disabled={isLoading || code.length !== CODE_LENGTH}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Verify
              </Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View className="mt-8">
            <Text className="text-secondary-500 dark:text-secondary-400 text-center text-sm">
              Open your authenticator app (like Google Authenticator or Authy) and enter the code for CommonGround.
            </Text>
          </View>

          {/* Resend/Help */}
          <View className="flex-row justify-center mt-6">
            <TouchableOpacity>
              <Text className="text-primary-600 font-medium">
                Lost access to your authenticator?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

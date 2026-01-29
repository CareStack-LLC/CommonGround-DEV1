import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '@/providers/AuthProvider';
import { getBiometryDisplayName } from '@/services/biometric';
import { isAppleSignInAvailable, isGoogleSignInAvailable } from '@/services/oauth';

export default function LoginScreen() {
  const {
    login,
    loginWithBiometric,
    loginWithGoogle,
    loginWithApple,
    isLoading,
    error,
    clearError,
    biometricCapability,
    isBiometricEnabled,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    checkOAuthAvailability();
  }, []);

  const checkOAuthAvailability = async () => {
    const [apple, google] = await Promise.all([
      isAppleSignInAvailable(),
      isGoogleSignInAvailable(),
    ]);
    setAppleAvailable(apple);
    setGoogleAvailable(google);
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    clearError();

    const success = await login(email, password);
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleBiometricLogin = async () => {
    clearError();
    const success = await loginWithBiometric();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    const success = await loginWithGoogle();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleAppleLogin = async () => {
    clearError();
    const success = await loginWithApple();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const biometryName = biometricCapability?.biometryType
    ? getBiometryDisplayName(biometricCapability.biometryType)
    : 'Biometric';

  const showBiometric =
    biometricCapability?.isAvailable &&
    biometricCapability?.isEnrolled &&
    isBiometricEnabled;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-12 pb-8">
            {/* Logo/Header */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-primary-600 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="people" size={40} color="white" />
              </View>
              <Text className="text-3xl font-bold text-secondary-900 dark:text-white">
                CommonGround
              </Text>
              <Text className="text-secondary-500 dark:text-secondary-400 mt-2">
                Co-parenting made easier
              </Text>
            </View>

            {/* Biometric Login */}
            {showBiometric && (
              <TouchableOpacity
                className="mb-6 py-4 bg-secondary-100 dark:bg-secondary-800 rounded-xl flex-row items-center justify-center"
                onPress={handleBiometricLogin}
                disabled={isLoading}
              >
                <Ionicons
                  name={biometricCapability?.biometryType === 'facial' ? 'scan' : 'finger-print'}
                  size={24}
                  color="#2563eb"
                />
                <Text className="text-primary-600 font-semibold text-lg ml-3">
                  Sign in with {biometryName}
                </Text>
              </TouchableOpacity>
            )}

            {/* OAuth Buttons */}
            {(appleAvailable || googleAvailable) && (
              <View className="mb-6">
                {appleAvailable && Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={{ height: 50, marginBottom: 12 }}
                    onPress={handleAppleLogin}
                  />
                )}

                {googleAvailable && (
                  <TouchableOpacity
                    className="py-3.5 bg-white border border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700 rounded-xl flex-row items-center justify-center"
                    onPress={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <View className="w-6 h-6 mr-3">
                      <Ionicons name="logo-google" size={24} color="#4285F4" />
                    </View>
                    <Text className="text-secondary-900 dark:text-white font-semibold">
                      Continue with Google
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View className="flex-row items-center my-6">
                  <View className="flex-1 h-px bg-secondary-200 dark:bg-secondary-700" />
                  <Text className="mx-4 text-secondary-400 text-sm">or</Text>
                  <View className="flex-1 h-px bg-secondary-200 dark:bg-secondary-700" />
                </View>
              </View>
            )}

            {/* Login Form */}
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Email
                </Text>
                <TextInput
                  className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700"
                  placeholder="Enter your email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    className="input dark:bg-secondary-800 dark:text-white dark:border-secondary-700 pr-12"
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View className="bg-danger-50 dark:bg-danger-500/10 p-3 rounded-lg">
                  <Text className="text-danger-600 dark:text-danger-500 text-sm">
                    {error}
                  </Text>
                </View>
              )}

              {/* Forgot Password */}
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity className="self-end">
                  <Text className="text-primary-600 text-sm font-medium">
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </Link>

              {/* Login Button */}
              <TouchableOpacity
                className={`btn-primary mt-4 ${isLoading ? 'opacity-70' : ''}`}
                onPress={handleLogin}
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-semibold text-lg">
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-secondary-500 dark:text-secondary-400">
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text className="text-primary-600 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

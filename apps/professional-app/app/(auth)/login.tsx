/**
 * Professional Login Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Login Failed',
        error.message || 'Please check your credentials and try again'
      );
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
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View className="items-center pt-12 pb-8">
              <View className="w-20 h-20 bg-white/10 rounded-2xl items-center justify-center mb-4">
                <Ionicons name="briefcase" size={40} color="#fff" />
              </View>
              <Text className="text-3xl font-bold text-white">CommonGround</Text>
              <Text className="text-blue-200 text-lg mt-1">Professional Portal</Text>
            </View>

            {/* Login Form */}
            <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
              <Text className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</Text>
              <Text className="text-gray-500 mb-8">
                Sign in to access your cases and clients
              </Text>

              {/* Email Input */}
              <View className="mb-4">
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

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-gray-600 font-medium mb-2">Password</Text>
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                  <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-gray-800"
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <Link href="/forgot-password" asChild>
                <TouchableOpacity className="mb-8">
                  <Text className="text-blue-600 text-right font-medium">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </Link>

              {/* Login Button */}
              <TouchableOpacity
                className={`py-4 rounded-xl items-center ${
                  isLoading ? 'bg-blue-400' : 'bg-blue-600'
                }`}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Register Link */}
              <View className="flex-row justify-center mt-6 mb-8">
                <Text className="text-gray-500">Don't have an account? </Text>
                <Link href="/register" asChild>
                  <TouchableOpacity>
                    <Text className="text-blue-600 font-bold">Register</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Demo Credentials */}
              <View className="bg-blue-50 rounded-xl p-4 mb-8">
                <Text className="text-blue-800 font-medium mb-2">Demo Account</Text>
                <Text className="text-blue-600 text-sm">
                  Email: attorney@demo.com{'\n'}
                  Password: demo123
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

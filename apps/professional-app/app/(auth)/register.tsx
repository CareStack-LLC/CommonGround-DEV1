/**
 * Professional Registration Screen
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

import { professional, type ProfessionalType } from '@commonground/api-client';

const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string; icon: string }[] = [
  { value: 'attorney', label: 'Attorney', icon: 'briefcase' },
  { value: 'mediator', label: 'Mediator', icon: 'people' },
  { value: 'parenting_coordinator', label: 'Parenting Coordinator', icon: 'heart' },
  { value: 'paralegal', label: 'Paralegal', icon: 'document-text' },
];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Account Info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Professional Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [professionalType, setProfessionalType] = useState<ProfessionalType>('attorney');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');

  const handleContinue = () => {
    if (step === 1) {
      if (!email.trim() || !password || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters');
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await professional.auth.register({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        professional_type: professionalType,
        license_number: licenseNumber.trim() || undefined,
        license_state: licenseState.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Registration Successful',
        'Welcome to CommonGround Pro! Your account has been created.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Registration Failed', error.message || 'Please try again');
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
            <View className="flex-row items-center px-4 pt-4">
              <TouchableOpacity
                onPress={() => (step === 1 ? router.back() : setStep(1))}
                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="items-center pt-4 pb-6">
              <Text className="text-2xl font-bold text-white">Create Account</Text>
              <Text className="text-blue-200 mt-1">Step {step} of 2</Text>
            </View>

            {/* Progress Bar */}
            <View className="px-6 mb-6">
              <View className="flex-row h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="bg-white rounded-full"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </View>
            </View>

            {/* Form */}
            <View className="flex-1 bg-white rounded-t-3xl px-6 pt-8">
              {step === 1 ? (
                <>
                  <Text className="text-xl font-bold text-gray-800 mb-6">
                    Account Information
                  </Text>

                  {/* Email */}
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
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View className="mb-4">
                    <Text className="text-gray-600 font-medium mb-2">Password</Text>
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                      <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-gray-800"
                        placeholder="Minimum 8 characters"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  {/* Confirm Password */}
                  <View className="mb-8">
                    <Text className="text-gray-600 font-medium mb-2">Confirm Password</Text>
                    <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                      <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                      <TextInput
                        className="flex-1 py-4 px-3 text-gray-800"
                        placeholder="Confirm your password"
                        placeholderTextColor="#9ca3af"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-blue-600 py-4 rounded-xl items-center mb-6"
                    onPress={handleContinue}
                  >
                    <Text className="text-white font-bold text-lg">Continue</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-xl font-bold text-gray-800 mb-6">
                    Professional Information
                  </Text>

                  {/* Name */}
                  <View className="flex-row mb-4">
                    <View className="flex-1 mr-2">
                      <Text className="text-gray-600 font-medium mb-2">First Name</Text>
                      <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                        placeholder="John"
                        placeholderTextColor="#9ca3af"
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                    <View className="flex-1 ml-2">
                      <Text className="text-gray-600 font-medium mb-2">Last Name</Text>
                      <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                        placeholder="Smith"
                        placeholderTextColor="#9ca3af"
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>

                  {/* Professional Type */}
                  <View className="mb-4">
                    <Text className="text-gray-600 font-medium mb-2">I am a...</Text>
                    <View className="flex-row flex-wrap">
                      {PROFESSIONAL_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          className={`w-[48%] mr-[2%] mb-2 p-3 rounded-xl border-2 ${
                            professionalType === type.value
                              ? 'bg-blue-50 border-blue-500'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                          onPress={() => setProfessionalType(type.value)}
                        >
                          <View className="flex-row items-center">
                            <Ionicons
                              name={type.icon as any}
                              size={20}
                              color={professionalType === type.value ? '#2563eb' : '#6b7280'}
                            />
                            <Text
                              className={`ml-2 font-medium ${
                                professionalType === type.value
                                  ? 'text-blue-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {type.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* License Info */}
                  <View className="flex-row mb-6">
                    <View className="flex-[2] mr-2">
                      <Text className="text-gray-600 font-medium mb-2">
                        License # (optional)
                      </Text>
                      <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                        placeholder="123456"
                        placeholderTextColor="#9ca3af"
                        value={licenseNumber}
                        onChangeText={setLicenseNumber}
                      />
                    </View>
                    <View className="flex-1 ml-2">
                      <Text className="text-gray-600 font-medium mb-2">State</Text>
                      <TextInput
                        className="bg-gray-100 rounded-xl px-4 py-4 text-gray-800"
                        placeholder="CA"
                        placeholderTextColor="#9ca3af"
                        value={licenseState}
                        onChangeText={setLicenseState}
                        maxLength={2}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    className={`py-4 rounded-xl items-center mb-6 ${
                      isLoading ? 'bg-blue-400' : 'bg-blue-600'
                    }`}
                    onPress={handleRegister}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Create Account</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Login Link */}
              <View className="flex-row justify-center mb-8">
                <Text className="text-gray-500">Already have an account? </Text>
                <Link href="/login" asChild>
                  <TouchableOpacity>
                    <Text className="text-blue-600 font-bold">Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

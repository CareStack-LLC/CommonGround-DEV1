/**
 * Edit Profile Screen
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

import { useAuth } from '@/providers/AuthProvider';
import { professional } from '@commonground/api-client';

export default function ProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [professionalEmail, setProfessionalEmail] = useState(
    profile?.professional_email || ''
  );
  const [professionalPhone, setProfessionalPhone] = useState(
    profile?.professional_phone || ''
  );
  const [licenseNumber, setLicenseNumber] = useState(
    profile?.license_number || ''
  );
  const [licenseState, setLicenseState] = useState(
    profile?.license_state || ''
  );

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await professional.profile.updateProfile({
        professional_email: professionalEmail.trim() || undefined,
        professional_phone: professionalPhone.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        license_state: licenseState.trim() || undefined,
      });
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800">Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            className="w-10 h-10 items-center justify-center"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text className="text-blue-600 font-bold">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Contact Info */}
        <View className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
          <Text className="text-gray-500 font-medium mb-4">CONTACT INFORMATION</Text>

          <View className="mb-4">
            <Text className="text-gray-600 mb-2">Professional Email</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
              placeholder="attorney@lawfirm.com"
              placeholderTextColor="#9ca3af"
              value={professionalEmail}
              onChangeText={setProfessionalEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-gray-600 mb-2">Professional Phone</Text>
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
              placeholder="(555) 123-4567"
              placeholderTextColor="#9ca3af"
              value={professionalPhone}
              onChangeText={setProfessionalPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* License Info */}
        <View className="bg-white rounded-xl p-4 border border-gray-100">
          <Text className="text-gray-500 font-medium mb-4">LICENSE INFORMATION</Text>

          <View className="flex-row mb-4">
            <View className="flex-[2] mr-2">
              <Text className="text-gray-600 mb-2">License Number</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                placeholder="123456"
                placeholderTextColor="#9ca3af"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-gray-600 mb-2">State</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                placeholder="CA"
                placeholderTextColor="#9ca3af"
                value={licenseState}
                onChangeText={setLicenseState}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {profile?.license_verified ? (
            <View className="bg-green-50 rounded-xl p-3 flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text className="text-green-700 ml-2">License verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              className="bg-blue-50 rounded-xl p-3 flex-row items-center"
              onPress={() => Alert.alert('Verification', 'License verification request sent')}
            >
              <Ionicons name="shield-outline" size={20} color="#2563eb" />
              <Text className="text-blue-700 ml-2">Request verification</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

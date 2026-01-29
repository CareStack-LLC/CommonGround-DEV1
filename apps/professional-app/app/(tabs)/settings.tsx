/**
 * Settings Screen
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/providers/AuthProvider';

export default function SettingsScreen() {
  const { user, profile, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-4 py-4 bg-white border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-800">Settings</Text>
        </View>

        {/* Profile Section */}
        <View className="bg-white mt-4 mx-4 rounded-xl border border-gray-100 p-4">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center">
              <Text className="text-blue-600 font-bold text-2xl">
                {user?.first_name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-lg font-bold text-gray-800">
                {user?.first_name} {user?.last_name}
              </Text>
              <Text className="text-gray-500">{user?.email}</Text>
              <Text className="text-blue-600 text-sm capitalize mt-1">
                {profile?.professional_type?.replace('_', ' ') || 'Professional'}
              </Text>
            </View>
          </View>

          {profile?.license_number && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="card-outline" size={16} color="#6b7280" />
                <Text className="text-gray-500 ml-2">
                  License: {profile.license_number} ({profile.license_state})
                </Text>
                {profile.license_verified && (
                  <View className="bg-green-100 px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-green-600 text-xs">Verified</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Firm Section */}
        {profile?.firms && profile.firms.length > 0 && (
          <View className="mt-4 mx-4">
            <Text className="text-gray-500 font-medium mb-2 px-2">FIRM</Text>
            <View className="bg-white rounded-xl border border-gray-100">
              {profile.firms.map((firm, index) => (
                <TouchableOpacity
                  key={firm.id}
                  className={`flex-row items-center p-4 ${
                    index < profile.firms.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center">
                    <Ionicons name="business-outline" size={20} color="#2563eb" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-medium text-gray-800">{firm.firm_name}</Text>
                    <Text className="text-gray-500 text-sm capitalize">
                      {firm.role.replace('_', ' ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Settings Options */}
        <View className="mt-4 mx-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">ACCOUNT</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            <SettingsItem
              icon="person-outline"
              label="Edit Profile"
              onPress={() => router.push('/settings/profile')}
            />
            <SettingsItem
              icon="notifications-outline"
              label="Notifications"
              onPress={() => router.push('/settings/notifications')}
            />
            <SettingsItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={() => router.push('/settings/change-password')}
            />
          </View>
        </View>

        <View className="mt-4 mx-4">
          <Text className="text-gray-500 font-medium mb-2 px-2">SUPPORT</Text>
          <View className="bg-white rounded-xl border border-gray-100">
            <SettingsItem
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => {}}
            />
            <SettingsItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => {}}
            />
            <SettingsItem
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Logout */}
        <View className="mt-4 mx-4">
          <TouchableOpacity
            className="bg-white rounded-xl border border-gray-100 p-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
              <Text className="text-red-600 font-medium ml-2">Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center mt-8 mb-4">
          <Text className="text-gray-400 text-sm">CommonGround Pro v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon,
  label,
  onPress,
  showBorder = true,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center p-4 ${showBorder ? 'border-b border-gray-100' : ''}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Ionicons name={icon as any} size={22} color="#6b7280" />
      <Text className="flex-1 text-gray-800 ml-3">{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

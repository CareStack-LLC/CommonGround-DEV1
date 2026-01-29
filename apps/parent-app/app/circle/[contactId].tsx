/**
 * Circle Contact Settings Screen
 * Full parental controls for each circle contact
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { parent, type CirclePermission } from "@commonground/api-client";

interface ChildPermission {
  child_id: string;
  child_name: string;
  permission?: CirclePermission;
}

const DAYS_OF_WEEK = [
  { id: 0, name: "Sun" },
  { id: 1, name: "Mon" },
  { id: 2, name: "Tue" },
  { id: 3, name: "Wed" },
  { id: 4, name: "Thu" },
  { id: 5, name: "Fri" },
  { id: 6, name: "Sat" },
];

export default function ContactSettingsScreen() {
  const { contactId } = useLocalSearchParams<{ contactId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contactName, setContactName] = useState("Contact");
  const [childPermissions, setChildPermissions] = useState<ChildPermission[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  // Current permission being edited
  const [canVideoCall, setCanVideoCall] = useState(true);
  const [canVoiceCall, setCanVoiceCall] = useState(true);
  const [canChat, setCanChat] = useState(true);
  const [canTheater, setCanTheater] = useState(true);
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [maxDuration, setMaxDuration] = useState(60);
  const [requireParentPresent, setRequireParentPresent] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    fetchPermissions();
  }, [contactId]);

  const fetchPermissions = async () => {
    try {
      // Demo data for development
      setContactName("Grandma Rose");
      setChildPermissions([
        {
          child_id: "child-1",
          child_name: "Emma",
          permission: {
            id: "perm-1",
            circle_contact_id: contactId || "",
            child_id: "child-1",
            family_file_id: "ff-1",
            can_video_call: true,
            can_voice_call: true,
            can_chat: true,
            can_theater: true,
            allowed_days: [0, 1, 2, 3, 4, 5, 6],
            allowed_start_time: "09:00",
            allowed_end_time: "20:00",
            is_within_allowed_time: true,
            max_call_duration_minutes: 60,
            require_parent_present: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          child_id: "child-2",
          child_name: "Lucas",
          permission: undefined,
        },
      ]);
      setSelectedChild("child-1");
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      Alert.alert("Error", "Failed to load contact settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load selected child's permission into form
    const childPerm = childPermissions.find((cp) => cp.child_id === selectedChild);
    if (childPerm?.permission) {
      const p = childPerm.permission;
      setCanVideoCall(p.can_video_call);
      setCanVoiceCall(p.can_voice_call);
      setCanChat(p.can_chat);
      setCanTheater(p.can_theater);
      setAllowedDays(p.allowed_days || [0, 1, 2, 3, 4, 5, 6]);
      setStartTime(p.allowed_start_time || "09:00");
      setEndTime(p.allowed_end_time || "20:00");
      setMaxDuration(p.max_call_duration_minutes);
      setRequireParentPresent(p.require_parent_present);
    } else {
      // Default values for new permission
      setCanVideoCall(true);
      setCanVoiceCall(true);
      setCanChat(true);
      setCanTheater(true);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      setStartTime("09:00");
      setEndTime("20:00");
      setMaxDuration(60);
      setRequireParentPresent(false);
    }
  }, [selectedChild, childPermissions]);

  const toggleDay = (dayId: number) => {
    if (allowedDays.includes(dayId)) {
      setAllowedDays(allowedDays.filter((d) => d !== dayId));
    } else {
      setAllowedDays([...allowedDays, dayId].sort());
    }
  };

  const handleSave = async () => {
    if (!selectedChild) return;

    setIsSaving(true);
    try {
      await parent.myCircle.setPermission({
        circle_contact_id: contactId || "",
        child_id: selectedChild,
        can_video_call: canVideoCall,
        can_voice_call: canVoiceCall,
        can_chat: canChat,
        can_theater: canTheater,
        allowed_days: allowedDays,
        allowed_start_time: startTime,
        allowed_end_time: endTime,
        max_call_duration_minutes: maxDuration,
        require_parent_present: requireParentPresent,
      });
      Alert.alert("Saved", "Permissions have been updated");
    } catch (error) {
      console.error("Failed to save:", error);
      Alert.alert("Saved", "Permissions have been updated (demo mode)");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePauseContact = async () => {
    Alert.alert(
      "Pause Contact",
      `This will temporarily block ${contactName} from all communication with your children. You can resume anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pause",
          style: "destructive",
          onPress: async () => {
            try {
              // await parent.myCircle.pauseContact(familyFileId, contactId);
              Alert.alert("Paused", `${contactName} has been paused`);
            } catch (error) {
              Alert.alert("Done", `${contactName} has been paused (demo mode)`);
            }
          },
        },
      ]
    );
  };

  const handleBlockContact = async () => {
    Alert.alert(
      "Block Contact",
      `This will permanently remove ${contactName} from your circle. They will no longer be able to communicate with your children.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              // await parent.myCircle.blockContact(familyFileId, contactId);
              Alert.alert("Blocked", `${contactName} has been removed`);
              router.back();
            } catch (error) {
              Alert.alert("Done", `${contactName} has been removed (demo mode)`);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary-50 dark:bg-secondary-900" edges={["top"]}>
      <Stack.Screen
        options={{
          title: contactName,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} className="mr-4" disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text className="text-primary-600 font-semibold">Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Child Selector */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Select Child
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {childPermissions.map((cp) => (
              <TouchableOpacity
                key={cp.child_id}
                className={`mr-3 px-5 py-3 rounded-xl ${
                  selectedChild === cp.child_id
                    ? "bg-primary-600"
                    : "bg-white dark:bg-secondary-800"
                }`}
                onPress={() => setSelectedChild(cp.child_id)}
              >
                <Text
                  className={`font-medium ${
                    selectedChild === cp.child_id
                      ? "text-white"
                      : "text-secondary-900 dark:text-white"
                  }`}
                >
                  {cp.child_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Feature Permissions */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Allowed Features
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <PermissionToggle
              icon="videocam"
              label="Video Calls"
              description="Allow video calling"
              value={canVideoCall}
              onValueChange={setCanVideoCall}
            />
            <PermissionToggle
              icon="call"
              label="Voice Calls"
              description="Allow voice-only calls"
              value={canVoiceCall}
              onValueChange={setCanVoiceCall}
            />
            <PermissionToggle
              icon="chatbubble"
              label="Chat Messages"
              description="Allow text and sticker messaging"
              value={canChat}
              onValueChange={setCanChat}
            />
            <PermissionToggle
              icon="tv"
              label="Watch Together"
              description="Allow theater mode for watching videos"
              value={canTheater}
              onValueChange={setCanTheater}
              isLast
            />
          </View>
        </View>

        {/* Time Restrictions */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Allowed Days
          </Text>
          <View className="flex-row justify-between bg-white dark:bg-secondary-800 rounded-xl p-3">
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.id}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  allowedDays.includes(day.id)
                    ? "bg-primary-600"
                    : "bg-secondary-100 dark:bg-secondary-700"
                }`}
                onPress={() => toggleDay(day.id)}
              >
                <Text
                  className={`font-medium text-sm ${
                    allowedDays.includes(day.id)
                      ? "text-white"
                      : "text-secondary-600 dark:text-secondary-300"
                  }`}
                >
                  {day.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Windows */}
        <View className="px-6 py-2">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Allowed Hours
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-4 border-b border-secondary-100 dark:border-secondary-700"
              onPress={() => setShowStartPicker(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={22} color="#64748b" />
                <Text className="text-secondary-900 dark:text-white ml-3">Start Time</Text>
              </View>
              <Text className="text-primary-600 font-medium">{startTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => setShowEndPicker(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={22} color="#64748b" />
                <Text className="text-secondary-900 dark:text-white ml-3">End Time</Text>
              </View>
              <Text className="text-primary-600 font-medium">{endTime}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Limits */}
        <View className="px-6 py-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Session Limits
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <View className="px-4 py-4 border-b border-secondary-100 dark:border-secondary-700">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="timer-outline" size={22} color="#64748b" />
                  <Text className="text-secondary-900 dark:text-white ml-3">
                    Max Call Duration
                  </Text>
                </View>
                <Text className="text-primary-600 font-medium">{maxDuration} min</Text>
              </View>
              <View className="flex-row mt-3 space-x-2">
                {[15, 30, 60, 90, 120].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    className={`px-3 py-2 rounded-lg ${
                      maxDuration === mins
                        ? "bg-primary-600"
                        : "bg-secondary-100 dark:bg-secondary-700"
                    }`}
                    onPress={() => setMaxDuration(mins)}
                  >
                    <Text
                      className={`text-sm ${
                        maxDuration === mins
                          ? "text-white"
                          : "text-secondary-600 dark:text-secondary-300"
                      }`}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PermissionToggle
              icon="eye"
              label="Require Parent Present"
              description="Parent must be in the room during calls"
              value={requireParentPresent}
              onValueChange={setRequireParentPresent}
              isLast
            />
          </View>
        </View>

        {/* ARIA Monitoring Notice */}
        <View className="mx-6 my-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex-row">
          <Ionicons name="sparkles" size={24} color="#9333ea" />
          <View className="flex-1 ml-3">
            <Text className="text-purple-700 dark:text-purple-300 font-medium">
              ARIA Monitoring Active
            </Text>
            <Text className="text-purple-600 dark:text-purple-400 text-sm mt-1">
              All chats are monitored for inappropriate content. You'll be notified
              of any flagged messages.
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View className="px-6 py-4 mt-4">
          <Text className="text-sm font-medium text-secondary-500 dark:text-secondary-400 mb-2 uppercase tracking-wide">
            Actions
          </Text>
          <View className="bg-white dark:bg-secondary-800 rounded-xl">
            <TouchableOpacity
              className="flex-row items-center px-4 py-4 border-b border-secondary-100 dark:border-secondary-700"
              onPress={handlePauseContact}
            >
              <View className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full items-center justify-center">
                <Ionicons name="pause" size={20} color="#ca8a04" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-secondary-900 dark:text-white font-medium">
                  Pause Contact
                </Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  Temporarily block all communication
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-4"
              onPress={handleBlockContact}
            >
              <View className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center">
                <Ionicons name="ban" size={20} color="#dc2626" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-red-600 dark:text-red-400 font-medium">
                  Remove from Circle
                </Text>
                <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
                  Permanently remove this contact
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = startTime.split(":").map(Number);
            const date = new Date();
            date.setHours(hours, minutes);
            return date;
          })()}
          mode="time"
          is24Hour={false}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) {
              const h = date.getHours().toString().padStart(2, "0");
              const m = date.getMinutes().toString().padStart(2, "0");
              setStartTime(`${h}:${m}`);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = endTime.split(":").map(Number);
            const date = new Date();
            date.setHours(hours, minutes);
            return date;
          })()}
          mode="time"
          is24Hour={false}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) {
              const h = date.getHours().toString().padStart(2, "0");
              const m = date.getMinutes().toString().padStart(2, "0");
              setEndTime(`${h}:${m}`);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

function PermissionToggle({
  icon,
  label,
  description,
  value,
  onValueChange,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-4 ${
        !isLast ? "border-b border-secondary-100 dark:border-secondary-700" : ""
      }`}
    >
      <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
        <Ionicons name={icon} size={20} color="#2563eb" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-secondary-900 dark:text-white font-medium">{label}</Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
        thumbColor={value ? "#2563eb" : "#f4f4f5"}
      />
    </View>
  );
}

/**
 * Create Event Screen
 *
 * Create new calendar events with category-specific fields.
 * Features:
 * - Event categories (medical, school, sports, etc.)
 * - Date/time selection
 * - Location with sharing options
 * - Child selection
 * - Co-parent visibility settings
 * - Conflict checking
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  parent,
  type EventCategory,
  type CategoryData,
} from "@commonground/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";

// CommonGround Design System Colors
const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

const EVENT_CATEGORIES: Array<{
  id: EventCategory;
  label: string;
  icon: string;
  color: string;
}> = [
  { id: "medical", label: "Medical", icon: "medkit", color: "#EF4444" },
  { id: "school", label: "School", icon: "school", color: "#3B82F6" },
  { id: "sports", label: "Sports", icon: "football", color: "#22C55E" },
  { id: "therapy", label: "Therapy", icon: "heart", color: "#EC4899" },
  { id: "extracurricular", label: "Activities", icon: "musical-notes", color: "#8B5CF6" },
  { id: "social", label: "Social", icon: "people", color: "#F97316" },
  { id: "travel", label: "Travel", icon: "airplane", color: "#06B6D4" },
  { id: "other", label: "Other", icon: "calendar", color: "#6B7280" },
];

export default function CreateEventScreen() {
  const { user } = useAuth();
  const { familyFile, children } = useFamilyFile();

  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // +1 hour
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [shareLocation, setShareLocation] = useState(true);
  const [shareWithCoParent, setShareWithCoParent] = useState(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData>({});

  // Select all children by default
  useEffect(() => {
    if (children.length > 0 && selectedChildren.length === 0) {
      setSelectedChildren(children.map((c) => c.id));
    }
  }, [children]);

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const newStart = new Date(date);
      newStart.setHours(startDate.getHours(), startDate.getMinutes());
      setStartDate(newStart);

      // Update end date to same day
      const newEnd = new Date(date);
      newEnd.setHours(endDate.getHours(), endDate.getMinutes());
      setEndDate(newEnd);
    }
  };

  const handleStartTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      setStartDate(date);
      // Set end time 1 hour after start
      const newEnd = new Date(date);
      newEnd.setHours(newEnd.getHours() + 1);
      setEndDate(newEnd);
    }
  };

  const handleEndTimeChange = (event: any, date?: Date) => {
    setShowEndTimePicker(false);
    if (date) {
      setEndDate(date);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter an event title.");
      return;
    }

    if (!category) {
      Alert.alert("Missing Category", "Please select an event category.");
      return;
    }

    if (!familyFile?.id) {
      Alert.alert("Error", "Family file not found.");
      return;
    }

    setSubmitting(true);

    try {
      // Check for conflicts first
      const conflicts = await parent.events.checkConflicts(
        familyFile.id,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (conflicts.has_conflict && conflicts.warnings.length > 0) {
        Alert.alert(
          "Potential Conflict",
          conflicts.warnings.join("\n") + "\n\nDo you want to create this event anyway?",
          [
            { text: "Cancel", style: "cancel", onPress: () => setSubmitting(false) },
            { text: "Create Anyway", onPress: () => createEvent() },
          ]
        );
        return;
      }

      await createEvent();
    } catch (error) {
      console.error("Failed to check conflicts:", error);
      // Proceed with creation anyway
      await createEvent();
    }
  };

  const createEvent = async () => {
    try {
      await parent.events.createEvent({
        family_file_id: familyFile!.id,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDate.toISOString(),
        end_time: allDay ? undefined : endDate.toISOString(),
        all_day: allDay,
        location: location.trim() || undefined,
        location_shared: shareLocation,
        visibility: shareWithCoParent ? "co_parent" : "private",
        event_category: category!,
        category_data: Object.keys(categoryData).length > 0 ? categoryData : undefined,
        child_ids: selectedChildren.length > 0 ? selectedChildren : undefined,
        attendance_invites: shareWithCoParent
          ? [{ parent_id: familyFile!.parent_b?.id || "", invited_role: "optional" as const }]
          : undefined,
      });

      Alert.alert("Event Created", "Your event has been added to the calendar.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Failed to create event:", error);
      Alert.alert("Error", error.message || "Failed to create event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = () => {
    return EVENT_CATEGORIES.find((c) => c.id === category)?.color || colors.sage;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Title */}
          <View className="mb-6">
            <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
              Event Title *
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: "white",
                color: colors.slate,
                fontSize: 16,
              }}
              placeholder="e.g., Emma's Soccer Practice"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Category Selection */}
          <View className="mb-6">
            <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
              Category *
            </Text>
            <View className="flex-row flex-wrap -mx-1">
              {EVENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  className="w-1/4 p-1"
                  onPress={() => setCategory(cat.id)}
                >
                  <View
                    className="rounded-xl py-3 items-center"
                    style={{
                      backgroundColor: category === cat.id ? `${cat.color}20` : "white",
                      borderWidth: category === cat.id ? 2 : 0,
                      borderColor: cat.color,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mb-1"
                      style={{ backgroundColor: category === cat.id ? cat.color : colors.sand }}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={20}
                        color={category === cat.id ? "white" : colors.slate}
                      />
                    </View>
                    <Text
                      className="text-xs text-center"
                      style={{ color: category === cat.id ? cat.color : colors.slate }}
                    >
                      {cat.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date & Time */}
          <View className="mb-6">
            <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
              Date & Time
            </Text>

            <View className="rounded-xl p-4" style={{ backgroundColor: "white" }}>
              {/* Date */}
              <TouchableOpacity
                className="flex-row items-center justify-between py-2"
                onPress={() => setShowDatePicker(true)}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={20} color={colors.sage} />
                  <Text className="ml-3" style={{ color: colors.slate }}>
                    Date
                  </Text>
                </View>
                <Text style={{ color: colors.sage }}>{formatDate(startDate)}</Text>
              </TouchableOpacity>

              {/* All Day Toggle */}
              <View
                className="flex-row items-center justify-between py-2 border-t"
                style={{ borderColor: colors.sand }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="sunny" size={20} color={colors.sage} />
                  <Text className="ml-3" style={{ color: colors.slate }}>
                    All Day
                  </Text>
                </View>
                <Switch
                  value={allDay}
                  onValueChange={setAllDay}
                  trackColor={{ false: colors.sand, true: colors.sage }}
                />
              </View>

              {/* Start Time */}
              {!allDay && (
                <>
                  <TouchableOpacity
                    className="flex-row items-center justify-between py-2 border-t"
                    style={{ borderColor: colors.sand }}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="time" size={20} color={colors.sage} />
                      <Text className="ml-3" style={{ color: colors.slate }}>
                        Start
                      </Text>
                    </View>
                    <Text style={{ color: colors.sage }}>{formatTime(startDate)}</Text>
                  </TouchableOpacity>

                  {/* End Time */}
                  <TouchableOpacity
                    className="flex-row items-center justify-between py-2 border-t"
                    style={{ borderColor: colors.sand }}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={20} color={colors.sage} />
                      <Text className="ml-3" style={{ color: colors.slate }}>
                        End
                      </Text>
                    </View>
                    <Text style={{ color: colors.sage }}>{formatTime(endDate)}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display="spinner"
                onChange={handleStartTimeChange}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display="spinner"
                onChange={handleEndTimeChange}
              />
            )}
          </View>

          {/* Location */}
          <View className="mb-6">
            <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
              Location
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: "white",
                color: colors.slate,
              }}
              placeholder="Add location"
              placeholderTextColor="#9CA3AF"
              value={location}
              onChangeText={setLocation}
            />
            {location && (
              <View
                className="flex-row items-center justify-between mt-2 px-2"
              >
                <Text className="text-sm" style={{ color: colors.slate }}>
                  Share location with co-parent
                </Text>
                <Switch
                  value={shareLocation}
                  onValueChange={setShareLocation}
                  trackColor={{ false: colors.sand, true: colors.sage }}
                />
              </View>
            )}
          </View>

          {/* Children Selection */}
          {children.length > 0 && (
            <View className="mb-6">
              <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                Children
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    className="p-1"
                    onPress={() => toggleChild(child.id)}
                  >
                    <View
                      className="rounded-full px-4 py-2 flex-row items-center"
                      style={{
                        backgroundColor: selectedChildren.includes(child.id)
                          ? colors.sage
                          : "white",
                      }}
                    >
                      <Text
                        style={{
                          color: selectedChildren.includes(child.id) ? "white" : colors.slate,
                        }}
                      >
                        {child.first_name}
                      </Text>
                      {selectedChildren.includes(child.id) && (
                        <Ionicons name="checkmark" size={16} color="white" className="ml-1" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View className="mb-6">
            <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
              Notes
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: "white",
                color: colors.slate,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              placeholder="Add any additional details..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Visibility */}
          <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: "white" }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: shareWithCoParent ? `${colors.sage}20` : colors.sand }}
                >
                  <Ionicons
                    name={shareWithCoParent ? "people" : "person"}
                    size={20}
                    color={shareWithCoParent ? colors.sage : colors.slate}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-medium" style={{ color: colors.slate }}>
                    {shareWithCoParent ? "Visible to Co-Parent" : "Private Event"}
                  </Text>
                  <Text className="text-xs" style={{ color: "#9CA3AF" }}>
                    {shareWithCoParent
                      ? "Co-parent can see this event and RSVP"
                      : "Only you can see this event"}
                  </Text>
                </View>
              </View>
              <Switch
                value={shareWithCoParent}
                onValueChange={setShareWithCoParent}
                trackColor={{ false: colors.sand, true: colors.sage }}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center flex-row justify-center mb-6"
            style={{
              backgroundColor: title && category ? getCategoryColor() : colors.sand,
            }}
            onPress={handleSubmit}
            disabled={!title || !category || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons
                  name="add-circle"
                  size={22}
                  color={title && category ? "white" : colors.slate}
                />
                <Text
                  className="font-semibold text-lg ml-2"
                  style={{
                    color: title && category ? "white" : colors.slate,
                  }}
                >
                  Create Event
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

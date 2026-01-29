/**
 * Time Blocks Screen
 *
 * Manage time blocks within a collection.
 * Time blocks represent availability/busy periods for specific days.
 * Features:
 * - View weekly time blocks
 * - Create/edit/delete time blocks
 * - Set availability (available/busy)
 * - Add notes to blocks
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  parent,
  type TimeBlock,
} from "@commonground/api-client";

const colors = {
  sage: "#4A6C58",
  sageDark: "#3D5A4A",
  slate: "#475569",
  amber: "#D4A574",
  sand: "#F5F0E8",
  cream: "#FFFBF5",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TimeBlocksScreen() {
  const { collectionId, name } = useLocalSearchParams<{ collectionId: string; name: string }>();

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [selectedDay, setSelectedDay] = useState(1); // Monday default
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [isAvailable, setIsAvailable] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchTimeBlocks = useCallback(async () => {
    if (!collectionId) return;

    try {
      const data = await parent.events.getTimeBlocks(collectionId);
      setTimeBlocks(data);
    } catch (error) {
      console.error("Failed to fetch time blocks:", error);
      // Demo data
      setTimeBlocks([
        {
          id: "tb-1",
          collection_id: collectionId,
          day_of_week: 1,
          start_time: "09:00",
          end_time: "12:00",
          is_available: true,
          notes: "Available for morning activities",
        },
        {
          id: "tb-2",
          collection_id: collectionId,
          day_of_week: 1,
          start_time: "15:00",
          end_time: "18:00",
          is_available: false,
          notes: "Soccer practice",
        },
        {
          id: "tb-3",
          collection_id: collectionId,
          day_of_week: 3,
          start_time: "09:00",
          end_time: "17:00",
          is_available: true,
        },
        {
          id: "tb-4",
          collection_id: collectionId,
          day_of_week: 5,
          start_time: "14:00",
          end_time: "16:00",
          is_available: false,
          notes: "Therapy session",
        },
      ]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchTimeBlocks();
  }, [fetchTimeBlocks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTimeBlocks();
  }, [fetchTimeBlocks]);

  const getBlocksForDay = (dayOfWeek: number) => {
    return timeBlocks
      .filter((b) => b.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const timeToString = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const openCreateModal = (dayOfWeek: number) => {
    setEditingBlock(null);
    setSelectedDay(dayOfWeek);
    const now = new Date();
    now.setMinutes(0);
    setStartTime(now);
    setEndTime(new Date(now.getTime() + 60 * 60 * 1000));
    setIsAvailable(true);
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (block: TimeBlock) => {
    setEditingBlock(block);
    setSelectedDay(block.day_of_week);

    const [startHours, startMins] = block.start_time.split(":");
    const start = new Date();
    start.setHours(parseInt(startHours), parseInt(startMins));
    setStartTime(start);

    const [endHours, endMins] = block.end_time.split(":");
    const end = new Date();
    end.setHours(parseInt(endHours), parseInt(endMins));
    setEndTime(end);

    setIsAvailable(block.is_available);
    setNotes(block.notes || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!collectionId) return;

    setSaving(true);
    try {
      if (editingBlock) {
        const updated = await parent.events.updateTimeBlock(editingBlock.id, {
          start_time: timeToString(startTime),
          end_time: timeToString(endTime),
          is_available: isAvailable,
          notes: notes.trim() || undefined,
        });
        setTimeBlocks((prev) =>
          prev.map((b) => (b.id === editingBlock.id ? updated : b))
        );
      } else {
        const created = await parent.events.createTimeBlock({
          collection_id: collectionId,
          day_of_week: selectedDay,
          start_time: timeToString(startTime),
          end_time: timeToString(endTime),
          is_available: isAvailable,
          notes: notes.trim() || undefined,
        });
        setTimeBlocks((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save time block:", error);
      // Demo mode
      if (editingBlock) {
        setTimeBlocks((prev) =>
          prev.map((b) =>
            b.id === editingBlock.id
              ? {
                  ...b,
                  start_time: timeToString(startTime),
                  end_time: timeToString(endTime),
                  is_available: isAvailable,
                  notes: notes.trim() || undefined,
                }
              : b
          )
        );
      } else {
        const newBlock: TimeBlock = {
          id: `tb-${Date.now()}`,
          collection_id: collectionId,
          day_of_week: selectedDay,
          start_time: timeToString(startTime),
          end_time: timeToString(endTime),
          is_available: isAvailable,
          notes: notes.trim() || undefined,
        };
        setTimeBlocks((prev) => [...prev, newBlock]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (block: TimeBlock) => {
    Alert.alert(
      "Delete Time Block",
      "Are you sure you want to delete this time block?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await parent.events.deleteTimeBlock(block.id);
              setTimeBlocks((prev) => prev.filter((b) => b.id !== block.id));
            } catch (error) {
              console.error("Failed to delete time block:", error);
              setTimeBlocks((prev) => prev.filter((b) => b.id !== block.id));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.sage} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: name || "Time Blocks" }} />

      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }} edges={["bottom"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sage} />
          }
        >
          {/* Legend */}
          <View className="flex-row items-center justify-center mb-4 space-x-6">
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded" style={{ backgroundColor: "#DCFCE7" }} />
              <Text className="text-sm text-slate-500 ml-2">Available</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded" style={{ backgroundColor: "#FEE2E2" }} />
              <Text className="text-sm text-slate-500 ml-2">Busy</Text>
            </View>
          </View>

          {/* Days of Week */}
          {DAYS.map((day, index) => {
            const blocks = getBlocksForDay(index);
            return (
              <View key={day} className="bg-white rounded-2xl p-4 mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-semibold" style={{ color: colors.slate }}>
                    {day}
                  </Text>
                  <TouchableOpacity
                    className="flex-row items-center px-2 py-1 rounded-lg"
                    style={{ backgroundColor: `${colors.sage}15` }}
                    onPress={() => openCreateModal(index)}
                  >
                    <Ionicons name="add" size={16} color={colors.sage} />
                    <Text className="ml-1 text-sm font-medium" style={{ color: colors.sage }}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                {blocks.length === 0 ? (
                  <Text className="text-sm text-slate-400 italic">No time blocks</Text>
                ) : (
                  <View className="space-y-2">
                    {blocks.map((block) => (
                      <TouchableOpacity
                        key={block.id}
                        className="flex-row items-center p-3 rounded-xl"
                        style={{
                          backgroundColor: block.is_available ? "#DCFCE7" : "#FEE2E2",
                        }}
                        onPress={() => openEditModal(block)}
                      >
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Ionicons
                              name={block.is_available ? "checkmark-circle" : "close-circle"}
                              size={18}
                              color={block.is_available ? "#166534" : "#991B1B"}
                            />
                            <Text
                              className="ml-2 font-medium"
                              style={{ color: block.is_available ? "#166534" : "#991B1B" }}
                            >
                              {formatTime(block.start_time)} - {formatTime(block.end_time)}
                            </Text>
                          </View>
                          {block.notes && (
                            <Text
                              className="text-sm mt-1 ml-6"
                              style={{ color: block.is_available ? "#15803D" : "#B91C1C" }}
                            >
                              {block.notes}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          className="p-1"
                          onPress={() => handleDelete(block)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Create/Edit Modal */}
        <Modal
          visible={showModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowModal(false)}
        >
          <SafeAreaView className="flex-1" style={{ backgroundColor: colors.cream }}>
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.sand }}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.sage }}>Cancel</Text>
              </TouchableOpacity>
              <Text className="font-semibold" style={{ color: colors.slate }}>
                {editingBlock ? "Edit Time Block" : "New Time Block"}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.sage} />
                ) : (
                  <Text className="font-semibold" style={{ color: colors.sage }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
              {/* Day Selection */}
              {!editingBlock && (
                <View className="mb-6">
                  <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                    Day
                  </Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {DAYS_SHORT.map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        className="w-[14.28%] p-1"
                        onPress={() => setSelectedDay(index)}
                      >
                        <View
                          className="py-3 rounded-xl items-center"
                          style={{
                            backgroundColor: selectedDay === index ? colors.sage : "white",
                          }}
                        >
                          <Text
                            className="font-medium"
                            style={{
                              color: selectedDay === index ? "white" : colors.slate,
                            }}
                          >
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Time Selection */}
              <View className="mb-6">
                <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                  Time
                </Text>
                <View className="bg-white rounded-xl p-4">
                  <TouchableOpacity
                    className="flex-row items-center justify-between py-2"
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={{ color: colors.slate }}>Start Time</Text>
                    <Text style={{ color: colors.sage }}>
                      {startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center justify-between py-2 border-t"
                    style={{ borderColor: colors.sand }}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={{ color: colors.slate }}>End Time</Text>
                    <Text style={{ color: colors.sage }}>
                      {endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showStartPicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setStartTime(date);
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndTime(date);
                    }}
                  />
                )}
              </View>

              {/* Availability Toggle */}
              <View className="mb-6">
                <Text className="font-semibold mb-3" style={{ color: colors.slate }}>
                  Availability
                </Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl items-center flex-row justify-center"
                    style={{
                      backgroundColor: isAvailable ? "#DCFCE7" : "white",
                      borderWidth: isAvailable ? 2 : 0,
                      borderColor: "#22C55E",
                    }}
                    onPress={() => setIsAvailable(true)}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={isAvailable ? "#166534" : "#94a3b8"}
                    />
                    <Text
                      className="ml-2 font-medium"
                      style={{ color: isAvailable ? "#166534" : colors.slate }}
                    >
                      Available
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl items-center flex-row justify-center"
                    style={{
                      backgroundColor: !isAvailable ? "#FEE2E2" : "white",
                      borderWidth: !isAvailable ? 2 : 0,
                      borderColor: "#EF4444",
                    }}
                    onPress={() => setIsAvailable(false)}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={!isAvailable ? "#991B1B" : "#94a3b8"}
                    />
                    <Text
                      className="ml-2 font-medium"
                      style={{ color: !isAvailable ? "#991B1B" : colors.slate }}
                    >
                      Busy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notes */}
              <View className="mb-6">
                <Text className="font-semibold mb-2" style={{ color: colors.slate }}>
                  Notes (Optional)
                </Text>
                <TextInput
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "white",
                    color: colors.slate,
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  placeholder="e.g., Soccer practice, Work meeting"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

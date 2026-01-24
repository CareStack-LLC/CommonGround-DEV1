import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useSchedule } from "@/hooks/useSchedule";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ScheduleScreen() {
  const { events, isLoading, refresh } = useSchedule();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number | null) => {
    if (!day) return false;
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-secondary-900" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <TouchableOpacity
            onPress={() => navigateMonth(-1)}
            className="p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() => navigateMonth(1)}
            className="p-2"
          >
            <Ionicons name="chevron-forward" size={24} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View className="flex-row px-2 mb-2">
          {DAYS.map((day) => (
            <View key={day} className="flex-1 items-center py-2">
              <Text className="text-secondary-500 dark:text-secondary-400 text-xs font-medium">
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap px-2">
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              className={`w-[14.28%] aspect-square items-center justify-center p-1`}
              onPress={() => {
                if (day) {
                  const newDate = new Date(currentMonth);
                  newDate.setDate(day);
                  setSelectedDate(newDate);
                }
              }}
              disabled={!day}
            >
              {day && (
                <View
                  className={`w-10 h-10 items-center justify-center rounded-full ${
                    isSelected(day)
                      ? "bg-primary-600"
                      : isToday(day)
                      ? "bg-primary-100 dark:bg-primary-900/30"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected(day)
                        ? "text-white"
                        : isToday(day)
                        ? "text-primary-600"
                        : "text-secondary-900 dark:text-white"
                    }`}
                  >
                    {day}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Events for Selected Date */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {events.length === 0 ? (
            <View className="card items-center py-8">
              <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
              <Text className="text-secondary-500 dark:text-secondary-400 mt-3">
                No events scheduled
              </Text>
              <TouchableOpacity className="mt-4">
                <Text className="text-primary-600 font-medium">
                  + Add Event
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Event Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg"
        onPress={() => {}}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  type: string;
}

function EventCard({ event }: { event: Event }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "exchange":
        return "swap-horizontal";
      case "appointment":
        return "medical";
      case "school":
        return "school";
      default:
        return "calendar";
    }
  };

  return (
    <TouchableOpacity className="card flex-row items-center">
      <View className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
        <Ionicons
          name={getEventIcon(event.type) as keyof typeof Ionicons.glyphMap}
          size={24}
          color="#2563eb"
        />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-secondary-900 dark:text-white font-semibold">
          {event.title}
        </Text>
        <Text className="text-secondary-500 dark:text-secondary-400 text-sm">
          {new Date(event.start_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

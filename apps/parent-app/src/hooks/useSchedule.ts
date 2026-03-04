import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

interface ScheduleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  type: string;
  description?: string;
  location?: string;
}

interface UseScheduleReturn {
  events: ScheduleEvent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEvent: (event: Partial<ScheduleEvent>) => Promise<boolean>;
  updateEvent: (eventId: string, updates: Partial<ScheduleEvent>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
}

const TOKEN_KEY = "auth_token";

export function useSchedule(): UseScheduleReturn {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/schedule/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.items || data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events";
      setError(message);
      console.error("Schedule fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (event: Partial<ScheduleEvent>): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/schedule/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      const newEvent = await response.json();
      setEvents((prev) => [...prev, newEvent]);
      return true;
    } catch (err) {
      console.error("Create event error:", err);
      return false;
    }
  }, []);

  const updateEvent = useCallback(async (
    eventId: string,
    updates: Partial<ScheduleEvent>
  ): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/schedule/events/${eventId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update event");
      }

      const updatedEvent = await response.json();
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updatedEvent : e))
      );
      return true;
    } catch (err) {
      console.error("Update event error:", err);
      return false;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/schedule/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to delete event");
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      return true;
    } catch (err) {
      console.error("Delete event error:", err);
      return false;
    }
  }, []);

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

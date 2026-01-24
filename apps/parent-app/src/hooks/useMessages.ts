import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  is_read: boolean;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sendMessage: (content: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
}

const TOKEN_KEY = "auth_token";

export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.items || data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages";
      setError(message);
      console.error("Messages fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      const response = await fetch(`${apiUrl}/api/v1/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const newMessage = await response.json();
      setMessages((prev) => [newMessage, ...prev]);
      return true;
    } catch (err) {
      console.error("Send message error:", err);
      return false;
    }
  }, []);

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      await fetch(`${apiUrl}/api/v1/messages/${messageId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    refresh: fetchMessages,
    sendMessage,
    markAsRead,
  };
}

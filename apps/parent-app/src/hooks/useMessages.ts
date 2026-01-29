import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

interface Message {
  id: string;
  thread_id?: string;
  family_file_id?: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  recipient_id?: string;
  created_at: string;
  is_read: boolean;
  is_flagged?: boolean;
  toxicity_level?: string;
  attachments?: Array<{
    id: string;
    filename: string;
    content_type: string;
    size: number;
    url?: string;
  }>;
}

interface UseMessagesOptions {
  familyFileId?: string;
  agreementId?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sendMessage: (content: string, recipientId?: string) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const TOKEN_KEY = "auth_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { familyFileId, agreementId } = options;
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

      // Build the correct endpoint URL based on context
      let endpoint = "";
      if (agreementId) {
        endpoint = `${API_URL}/api/v1/messages/agreement/${agreementId}`;
      } else if (familyFileId) {
        // For family file messages, we need to get messages for that context
        // The backend uses a threads/messages structure
        endpoint = `${API_URL}/api/v1/messages/agreement/${familyFileId}`;
      } else {
        // Get all messages for the user - need to get family files first
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No messages found is OK
          setMessages([]);
          return;
        }
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.items || data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages";
      setError(message);
      console.error("Messages fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [familyFileId, agreementId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = useCallback(async (content: string, recipientId?: string): Promise<boolean> => {
    if (!familyFileId) {
      console.error("Cannot send message without family file ID");
      return false;
    }

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${API_URL}/api/v1/messages/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          family_file_id: familyFileId,
          recipient_id: recipientId,
        }),
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
  }, [familyFileId]);

  const markAsRead = useCallback(async (messageId: string): Promise<void> => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      await fetch(`${API_URL}/api/v1/messages/${messageId}/acknowledge`, {
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

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!familyFileId) return;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      await fetch(`${API_URL}/api/v1/messages/family-file/${familyFileId}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
    } catch (err) {
      console.error("Mark all as read error:", err);
    }
  }, [familyFileId]);

  return {
    messages,
    isLoading,
    error,
    refresh: fetchMessages,
    sendMessage,
    markAsRead,
    markAllAsRead,
  };
}

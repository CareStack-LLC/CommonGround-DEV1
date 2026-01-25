import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export interface CircleContact {
  id: string;
  name: string;
  display_name?: string;
  relationship?: string;
  avatar_url?: string;
  is_online?: boolean;
  family_file_id?: string;
  // Parent-controlled permissions
  can_video_call?: boolean;
  can_voice_call?: boolean;
  can_chat?: boolean;
  can_theater?: boolean;
  is_within_allowed_time?: boolean;
  require_parent_present?: boolean;
}

interface UseCircleContactsReturn {
  contacts: CircleContact[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TOKEN_KEY = "kidscom_auth_token";

export function useCircleContacts(): UseCircleContactsReturn {
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/children/circle`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const data = await response.json();
      // API returns contacts with permission info from parent settings
      setContacts(data.contacts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
      // Use demo data for development - includes permission flags
      setContacts([
        {
          id: "1",
          name: "Grandma",
          display_name: "Grandma Rose",
          relationship: "grandparent",
          is_online: true,
          family_file_id: "demo-family-file",
          can_video_call: true,
          can_voice_call: true,
          can_chat: true,
          can_theater: true,
          is_within_allowed_time: true,
          require_parent_present: false,
        },
        {
          id: "2",
          name: "Grandpa",
          display_name: "Grandpa Joe",
          relationship: "grandparent",
          is_online: false,
          family_file_id: "demo-family-file",
          can_video_call: true,
          can_voice_call: true,
          can_chat: false, // Chat disabled by parent
          can_theater: true,
          is_within_allowed_time: true,
          require_parent_present: false,
        },
        {
          id: "3",
          name: "Aunt Sarah",
          display_name: "Aunt Sarah",
          relationship: "aunt",
          is_online: true,
          family_file_id: "demo-family-file",
          can_video_call: true,
          can_voice_call: true,
          can_chat: true,
          can_theater: true,
          is_within_allowed_time: false, // Outside allowed hours
          require_parent_present: true, // Requires parent
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return {
    contacts,
    isLoading,
    error,
    refresh: fetchContacts,
  };
}

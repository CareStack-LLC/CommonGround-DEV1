import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export interface CircleContact {
  id: string;
  contact_id?: string;
  contact_type?: string;
  name: string;
  display_name?: string;
  relationship?: string;
  avatar_url?: string;
  is_online?: boolean;
  family_file_id?: string;
  room_number?: number;
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
const CONTACTS_KEY = "kidscom_contacts_data";

export function useCircleContacts(): UseCircleContactsReturn {
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First try to load contacts from storage (saved during login)
      const storedContacts = await SecureStore.getItemAsync(CONTACTS_KEY);
      if (storedContacts) {
        const parsedContacts = JSON.parse(storedContacts);
        // Map API response format to our CircleContact interface
        const mappedContacts: CircleContact[] = parsedContacts.map((c: any) => ({
          id: c.contact_id || c.id,
          contact_id: c.contact_id,
          contact_type: c.contact_type,
          name: c.display_name || c.name || "Unknown",
          display_name: c.display_name,
          relationship: c.contact_type === "parent_a" ? "Mom" : c.contact_type === "parent_b" ? "Dad" : c.contact_type,
          room_number: c.room_number,
          can_video_call: c.can_video_call ?? true,
          can_voice_call: c.can_voice_call ?? true,
          can_chat: c.can_chat ?? true,
          can_theater: c.can_theater ?? true,
          is_within_allowed_time: true,
          require_parent_present: false,
        }));
        setContacts(mappedContacts);
        setIsLoading(false);
        return;
      }

      // If no stored contacts, try to fetch from API
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/my-circle/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const data = await response.json();
      const mappedContacts: CircleContact[] = (data.contacts || data || []).map((c: any) => ({
        id: c.contact_id || c.id,
        contact_id: c.contact_id,
        contact_type: c.contact_type,
        name: c.display_name || c.name || "Unknown",
        display_name: c.display_name,
        relationship: c.contact_type === "parent_a" ? "Mom" : c.contact_type === "parent_b" ? "Dad" : c.contact_type,
        room_number: c.room_number,
        can_video_call: c.can_video_call ?? true,
        can_voice_call: c.can_voice_call ?? true,
        can_chat: c.can_chat ?? true,
        can_theater: c.can_theater ?? true,
        is_within_allowed_time: true,
        require_parent_present: false,
      }));

      // Save to storage for future use
      await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(data.contacts || data));
      setContacts(mappedContacts);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
      console.log("Using demo contacts due to error:", err.message);
      // Use demo data for development
      setContacts([
        {
          id: "demo-mom",
          name: "Mom",
          display_name: "Mom (Tasha)",
          relationship: "Mom",
          is_online: true,
          can_video_call: true,
          can_voice_call: true,
          can_chat: true,
          can_theater: true,
          is_within_allowed_time: true,
          require_parent_present: false,
        },
        {
          id: "demo-dad",
          name: "Dad",
          display_name: "Dad (Marcus)",
          relationship: "Dad",
          is_online: true,
          can_video_call: true,
          can_voice_call: true,
          can_chat: true,
          can_theater: true,
          is_within_allowed_time: true,
          require_parent_present: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return {
    contacts,
    isLoading,
    error,
    refresh: loadContacts,
  };
}

import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export interface CircleContact {
  id: string;
  name: string;
  display_name?: string;
  relationship?: string;
  avatar_url?: string;
  is_online?: boolean;
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
      setContacts(data.contacts || []);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
      // Use demo data for development
      setContacts([
        {
          id: "1",
          name: "Grandma",
          display_name: "Grandma Rose",
          relationship: "grandparent",
          is_online: true,
        },
        {
          id: "2",
          name: "Grandpa",
          display_name: "Grandpa Joe",
          relationship: "grandparent",
          is_online: false,
        },
        {
          id: "3",
          name: "Aunt Sarah",
          display_name: "Aunt Sarah",
          relationship: "aunt",
          is_online: true,
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

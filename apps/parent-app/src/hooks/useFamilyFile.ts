import { useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";

import type { FamilyFile, Child, CircleContact, User } from "@commonground/types";

interface UseFamilyFileReturn {
  familyFile: FamilyFile | null;
  children: Child[];
  coParent: User | null;
  circleContacts: CircleContact[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TOKEN_KEY = "auth_token";

export function useFamilyFile(): UseFamilyFileReturn {
  const [familyFile, setFamilyFile] = useState<FamilyFile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [coParent, setCoParent] = useState<User | null>(null);
  const [circleContacts, setCircleContacts] = useState<CircleContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilyData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        throw new Error("Not authenticated");
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      // Fetch family file
      const familyResponse = await fetch(`${apiUrl}/api/v1/family-files/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!familyResponse.ok) {
        if (familyResponse.status === 404) {
          // No family file yet
          setFamilyFile(null);
          return;
        }
        throw new Error("Failed to fetch family file");
      }

      const familyData = await familyResponse.json();
      setFamilyFile(familyData);

      // Fetch children
      if (familyData.id) {
        const childrenResponse = await fetch(
          `${apiUrl}/api/v1/family-files/${familyData.id}/children`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (childrenResponse.ok) {
          const childrenData = await childrenResponse.json();
          setChildren(childrenData.items || childrenData);
        }

        // Fetch circle contacts
        const circleResponse = await fetch(
          `${apiUrl}/api/v1/family-files/${familyData.id}/circle`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (circleResponse.ok) {
          const circleData = await circleResponse.json();
          setCircleContacts(circleData.items || circleData);
        }
      }

      // Get co-parent from family file data
      if (familyData.parent_b) {
        setCoParent(familyData.parent_b);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load family data";
      setError(message);
      console.error("Family file fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyData();
  }, [fetchFamilyData]);

  return {
    familyFile,
    children,
    coParent,
    circleContacts,
    isLoading,
    error,
    refresh: fetchFamilyData,
  };
}

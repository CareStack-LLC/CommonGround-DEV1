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
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";

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
      console.log("[useFamilyFile] Token check:", token ? `found (${token.substring(0, 20)}...)` : "NOT FOUND");

      if (!token) {
        // Not authenticated yet - don't treat as error, just return empty state
        console.log("[useFamilyFile] No token - returning empty state");
        setFamilyFile(null);
        setChildren([]);
        setCoParent(null);
        setCircleContacts([]);
        setIsLoading(false);
        return;
      }

      console.log("[useFamilyFile] Fetching from:", `${API_URL}/api/v1/family-files/`);

      // Fetch family files list (backend returns paginated response)
      const familyResponse = await fetch(`${API_URL}/api/v1/family-files/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("[useFamilyFile] Response status:", familyResponse.status);

      if (!familyResponse.ok) {
        const errorText = await familyResponse.text();
        console.log("[useFamilyFile] Error response:", errorText);
        if (familyResponse.status === 404) {
          // No family file yet
          setFamilyFile(null);
          return;
        }
        throw new Error(`Failed to fetch family file: ${familyResponse.status}`);
      }

      const responseData = await familyResponse.json();
      console.log("[useFamilyFile] Response data:", JSON.stringify(responseData).substring(0, 200));

      // Backend returns {items: [...], total: N} - extract first family file
      const familyFiles = responseData.items || responseData;
      console.log("[useFamilyFile] Family files count:", Array.isArray(familyFiles) ? familyFiles.length : "not array");

      if (!familyFiles || familyFiles.length === 0) {
        console.log("[useFamilyFile] No family files found");
        setFamilyFile(null);
        return;
      }

      // Get the first (primary) family file
      const familyData = familyFiles[0];

      // Map backend fields to mobile types (backend uses 'title', mobile expects 'family_name')
      const mappedFamilyFile: FamilyFile = {
        ...familyData,
        family_name: familyData.title || familyData.family_file_number || "My Family",
      };

      setFamilyFile(mappedFamilyFile);

      // Fetch children
      if (mappedFamilyFile.id) {
        const childrenResponse = await fetch(
          `${API_URL}/api/v1/family-files/${mappedFamilyFile.id}/children`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (childrenResponse.ok) {
          const childrenData = await childrenResponse.json();
          setChildren(childrenData.items || childrenData);
        }

        // Fetch circle contacts
        const circleResponse = await fetch(
          `${API_URL}/api/v1/family-files/${mappedFamilyFile.id}/circle`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (circleResponse.ok) {
          const circleData = await circleResponse.json();
          setCircleContacts(circleData.items || circleData);
        }
      }

      // Get co-parent from family file data (backend returns parent_b_info not parent_b)
      const coParentInfo = familyData.parent_b_info || familyData.parent_b;
      if (coParentInfo) {
        setCoParent(coParentInfo);
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

import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  avatar_id?: string;
  family_file_id: string;
}

interface CircleContact {
  contact_id: string;
  contact_type: string;
  display_name: string;
  room_number?: number;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
}

interface ChildAuthContextType {
  child: Child | null;
  contacts: CircleContact[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  loginWithPin: (familyFileId: string, username: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ChildAuthContext = createContext<ChildAuthContextType | undefined>(undefined);

const TOKEN_KEY = "kidscom_auth_token";
const CHILD_KEY = "kidscom_child_data";
const CONTACTS_KEY = "kidscom_contacts_data";

export function ChildAuthProvider({ children }: { children: React.ReactNode }) {
  const [child, setChild] = useState<Child | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const childData = await SecureStore.getItemAsync(CHILD_KEY);
      const contactsData = await SecureStore.getItemAsync(CONTACTS_KEY);

      if (token && childData) {
        setChild(JSON.parse(childData));
        if (contactsData) {
          setContacts(JSON.parse(contactsData));
        }
      }
    } catch (err) {
      console.error("Error loading stored auth:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (familyFileId: string, username: string, pin: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://commonground-api-gdxg.onrender.com";
      const response = await fetch(`${apiUrl}/api/v1/my-circle/child-users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family_file_id: familyFileId,
          username,
          pin
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid login");
      }

      const data = await response.json();

      // Store authentication data
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(CHILD_KEY, JSON.stringify(data.child));

      // Store contacts from login response
      if (data.contacts) {
        await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(data.contacts));
        setContacts(data.contacts);
      }

      setChild(data.child);
      return true;
    } catch (err: any) {
      setError(err.message || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(CHILD_KEY);
      await SecureStore.deleteItemAsync(CONTACTS_KEY);
      setChild(null);
      setContacts([]);
      router.replace("/login");
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };

  return (
    <ChildAuthContext.Provider
      value={{
        child,
        contacts,
        isLoading,
        isAuthenticated: !!child,
        error,
        loginWithPin,
        logout,
      }}
    >
      {children}
    </ChildAuthContext.Provider>
  );
}

export function useChildAuth() {
  const context = useContext(ChildAuthContext);
  if (context === undefined) {
    throw new Error("useChildAuth must be used within a ChildAuthProvider");
  }
  return context;
}

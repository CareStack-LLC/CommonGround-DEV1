import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { AppState, AppStateStatus } from "react-native";

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

interface DeviceSetup {
  family_file_id: string;
  username: string;
  child_name?: string;
}

interface ChildAuthContextType {
  child: Child | null;
  contacts: CircleContact[];
  deviceSetup: DeviceSetup | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDeviceConfigured: boolean;
  isTokenExpired: boolean;
  error: string | null;
  loginWithPin: (pin: string) => Promise<boolean>;
  setupDevice: (setup: DeviceSetup) => Promise<void>;
  clearDeviceSetup: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  checkTokenValidity: () => Promise<boolean>;
}

const ChildAuthContext = createContext<ChildAuthContextType | undefined>(undefined);

const TOKEN_KEY = "kidscom_auth_token";
const TOKEN_EXPIRES_KEY = "kidscom_token_expires";
const CHILD_KEY = "kidscom_child_data";
const CONTACTS_KEY = "kidscom_contacts_data";
const SETUP_KEY = "kidscom_device_setup"; // Stores family_file_id + username

// Buffer time before expiration to consider token as "expired" (5 minutes)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export function ChildAuthProvider({ children }: { children: React.ReactNode }) {
  const [child, setChild] = useState<Child | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [deviceSetup, setDeviceSetup] = useState<DeviceSetup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if token is expired based on stored expiration time
  const isTokenExpiredCheck = useCallback(async (): Promise<boolean> => {
    try {
      const expiresAt = await SecureStore.getItemAsync(TOKEN_EXPIRES_KEY);
      if (!expiresAt) return true;

      const expirationTime = parseInt(expiresAt, 10);
      const now = Date.now();

      // Consider expired if within buffer time of expiration
      return now >= (expirationTime - TOKEN_EXPIRY_BUFFER_MS);
    } catch {
      return true;
    }
  }, []);

  // Get token if valid, null if expired
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const expired = await isTokenExpiredCheck();
      if (expired) {
        setIsTokenExpired(true);
        return null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }, [isTokenExpiredCheck]);

  // Check token validity and update state
  const checkTokenValidity = useCallback(async (): Promise<boolean> => {
    const expired = await isTokenExpiredCheck();
    setIsTokenExpired(expired);

    if (expired && child) {
      // Token expired but we have stored child data - redirect to login
      console.log("[ChildAuth] Token expired, user needs to re-enter PIN");
    }

    return !expired;
  }, [isTokenExpiredCheck, child]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Check token validity when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && child) {
        checkTokenValidity();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [child, checkTokenValidity]);

  const loadStoredAuth = async () => {
    try {
      const [token, childData, contactsData, setupData, expiresAt] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(CHILD_KEY),
        SecureStore.getItemAsync(CONTACTS_KEY),
        SecureStore.getItemAsync(SETUP_KEY),
        SecureStore.getItemAsync(TOKEN_EXPIRES_KEY),
      ]);

      if (setupData) {
        setDeviceSetup(JSON.parse(setupData));
      }

      if (token && childData) {
        // Check if token is expired
        let tokenExpired = true;
        if (expiresAt) {
          const expirationTime = parseInt(expiresAt, 10);
          tokenExpired = Date.now() >= (expirationTime - TOKEN_EXPIRY_BUFFER_MS);
        }

        setIsTokenExpired(tokenExpired);

        // Still load child data so we can show personalized login
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

  const setupDevice = async (setup: DeviceSetup): Promise<void> => {
    await SecureStore.setItemAsync(SETUP_KEY, JSON.stringify(setup));
    setDeviceSetup(setup);
  };

  const clearDeviceSetup = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(SETUP_KEY);
    setDeviceSetup(null);
  };

  const loginWithPin = async (pin: string): Promise<boolean> => {
    if (!deviceSetup) {
      setError("Device not configured. Please set up this device first.");
      return false;
    }

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
          family_file_id: deviceSetup.family_file_id,
          username: deviceSetup.username,
          pin
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid login");
      }

      const data = await response.json();

      // Calculate token expiration time (expires_in is in seconds)
      const expiresIn = data.expires_in || 3600; // Default 1 hour
      const expiresAt = Date.now() + (expiresIn * 1000);

      // Store authentication data with expiration
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(TOKEN_EXPIRES_KEY, expiresAt.toString());
      await SecureStore.setItemAsync(CHILD_KEY, JSON.stringify(data.child));

      // Store contacts from login response
      if (data.contacts) {
        await SecureStore.setItemAsync(CONTACTS_KEY, JSON.stringify(data.contacts));
        setContacts(data.contacts);
      }

      setChild(data.child);
      setIsTokenExpired(false);
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
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(TOKEN_EXPIRES_KEY),
        SecureStore.deleteItemAsync(CHILD_KEY),
        SecureStore.deleteItemAsync(CONTACTS_KEY),
      ]);
      setChild(null);
      setContacts([]);
      setIsTokenExpired(false);
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
        deviceSetup,
        isLoading,
        isAuthenticated: !!child && !isTokenExpired,
        isDeviceConfigured: !!deviceSetup,
        isTokenExpired,
        error,
        loginWithPin,
        setupDevice,
        clearDeviceSetup,
        logout,
        getToken,
        checkTokenValidity,
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

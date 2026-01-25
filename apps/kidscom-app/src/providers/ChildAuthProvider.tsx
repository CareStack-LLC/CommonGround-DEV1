import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  family_file_id: string;
}

interface ChildAuthContextType {
  child: Child | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const ChildAuthContext = createContext<ChildAuthContextType | undefined>(undefined);

const TOKEN_KEY = "kidscom_auth_token";
const CHILD_KEY = "kidscom_child_data";

export function ChildAuthProvider({ children }: { children: React.ReactNode }) {
  const [child, setChild] = useState<Child | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const childData = await SecureStore.getItemAsync(CHILD_KEY);

      if (token && childData) {
        setChild(JSON.parse(childData));
      }
    } catch (err) {
      console.error("Error loading stored auth:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (pin: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/children/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid PIN");
      }

      const data = await response.json();

      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(CHILD_KEY, JSON.stringify(data.child));

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
      setChild(null);
      router.replace("/login");
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };

  return (
    <ChildAuthContext.Provider
      value={{
        child,
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

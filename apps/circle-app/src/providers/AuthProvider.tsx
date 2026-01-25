/**
 * Auth Provider for My Circle App
 * Handles circle user authentication and connected children
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

import { circle } from "@commonground/api-client";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  relationship?: string;
  family_file_id?: string;
}

interface ConnectedChild {
  id: string;
  name: string;
  avatar_url?: string;
  age?: number;
  is_online: boolean;
  family_file_id: string;
  can_video_call?: boolean;
  can_voice_call?: boolean;
  can_chat?: boolean;
}

interface AuthContextType {
  user: User | null;
  connectedChildren: ConnectedChild[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  acceptInvite: (token: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "circle_auth_token";
const USER_KEY = "circle_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connectedChildren, setConnectedChildren] = useState<ConnectedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Validate session and refresh data
        try {
          const { valid, profile } = await circle.auth.validateSession();
          if (valid && profile) {
            const updatedUser: User = {
              id: profile.id,
              email: profile.email,
              name: profile.contact_name,
              relationship: profile.relationship_type,
              family_file_id: profile.family_file_id,
            };
            setUser(updatedUser);
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
            await fetchConnectedChildren();
          } else {
            // Session invalid, clear stored data
            await logout();
          }
        } catch (error) {
          console.error("Session validation failed:", error);
          // Keep using stored data if validation fails (offline support)
          await fetchConnectedChildren();
        }
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedChildren = async () => {
    try {
      const response = await circle.auth.getConnectedChildren();
      setConnectedChildren(
        response.items.map((child) => ({
          id: child.id,
          name: child.name,
          avatar_url: child.avatar_url,
          age: child.age,
          is_online: child.is_online,
          family_file_id: child.family_file_id,
          can_video_call: child.can_video_call,
          can_voice_call: child.can_voice_call,
          can_chat: child.can_chat,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch children:", error);
      // Fall back to demo data for development
      setConnectedChildren([
        {
          id: "child-1",
          name: "Emma",
          avatar_url: undefined,
          age: 8,
          is_online: true,
          family_file_id: "ff-1",
        },
        {
          id: "child-2",
          name: "Lucas",
          avatar_url: undefined,
          age: 6,
          is_online: false,
          family_file_id: "ff-1",
        },
      ]);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const response = await circle.auth.login(email, password);

      const loggedInUser: User = {
        id: response.user_id,
        email: email,
        name: response.contact_name,
        family_file_id: response.family_file_id,
      };

      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.access_token),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(loggedInUser)),
      ]);

      setUser(loggedInUser);
      await fetchConnectedChildren();
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (_name: string, _email: string, _password: string): Promise<boolean> => {
      // Circle users don't self-register - they accept invitations
      // This is here for interface compatibility
      console.warn("Circle users should use acceptInvite instead of register");
      return false;
    },
    []
  );

  const acceptInvite = useCallback(
    async (inviteToken: string, password: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        const response = await circle.auth.acceptInvitation(
          inviteToken,
          password,
          password // confirm password same as password
        );

        const invitedUser: User = {
          id: response.user_id,
          email: "", // Email will be fetched from profile
          name: response.contact_name,
          family_file_id: response.family_file_id,
        };

        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, response.access_token),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(invitedUser)),
        ]);

        setUser(invitedUser);
        await fetchConnectedChildren();
        return true;
      } catch (error) {
        console.error("Accept invite failed:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await circle.auth.logout();
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
      setUser(null);
      setConnectedChildren([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const refreshChildren = useCallback(async () => {
    await fetchConnectedChildren();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        connectedChildren,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        acceptInvite,
        logout,
        refreshChildren,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

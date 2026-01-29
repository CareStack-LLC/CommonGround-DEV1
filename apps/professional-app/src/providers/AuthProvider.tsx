/**
 * Authentication Provider for Professional App
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  configure,
  createNativeStorage,
  isAuthenticated,
  professional,
  type ProfessionalUser,
  type ProfessionalProfileWithFirms,
} from '@commonground/api-client';

interface AuthContextValue {
  user: ProfessionalUser | null;
  profile: ProfessionalProfileWithFirms | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ProfessionalUser | null>(null);
  const [profile, setProfile] = useState<ProfessionalProfileWithFirms | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize API client
  useEffect(() => {
    configure({
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com',
      storage: createNativeStorage(),
      onUnauthorized: () => {
        setUser(null);
        setProfile(null);
        router.replace('/login');
      },
    });

    // Check existing auth
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const currentUser = await professional.auth.getCurrentUser();
        setUser(currentUser);
        const currentProfile = await professional.profile.getProfile();
        setProfile(currentProfile);
      }
    } catch {
      // Not authenticated
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await professional.auth.login({ email, password });
    setUser(response.user);
    const currentProfile = await professional.profile.getProfile();
    setProfile(currentProfile);
  }, []);

  const logout = useCallback(async () => {
    await professional.auth.logout();
    setUser(null);
    setProfile(null);
    router.replace('/login');
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const currentProfile = await professional.profile.getProfile();
      setProfile(currentProfile);
    } catch {
      // Ignore errors
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isLoggedIn: !!user,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

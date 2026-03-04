'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, usersAPI, User, UserProfile } from './api';
import { DEFAULT_TIMEZONE } from './timezone';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  timezone: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed timezone from profile or default
  const timezone = profile?.timezone || DEFAULT_TIMEZONE;

  // Load user and profile from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        if (authAPI.isAuthenticated()) {
          // Try to get fresh user data from API
          const userData = await authAPI.me();
          setUser(userData);

          // Also load profile
          try {
            const profileData = await usersAPI.getProfile();
            setProfile(profileData);
          } catch (profileError) {
            console.error('Failed to load profile:', profileError);
            // Profile load failure is not critical - continue with default timezone
          }
        } else {
          // Try to get from localStorage as fallback
          const cachedUser = authAPI.getCurrentUser();
          setUser(cachedUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    setUser(response.user);

    // Load profile after login
    try {
      const profileData = await usersAPI.getProfile();
      setProfile(profileData);
    } catch (profileError) {
      console.error('Failed to load profile after login:', profileError);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    const response = await authAPI.register(data);
    setUser(response.user);

    // Load profile after registration
    try {
      const profileData = await usersAPI.getProfile();
      setProfile(profileData);
    } catch (profileError) {
      console.error('Failed to load profile after registration:', profileError);
    }
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    setProfile(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.me();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const profileData = await usersAPI.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    timezone,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

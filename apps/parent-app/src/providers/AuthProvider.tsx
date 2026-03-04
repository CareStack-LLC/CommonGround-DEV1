/**
 * Authentication Provider
 *
 * Comprehensive auth with:
 * - Email/password login
 * - OAuth (Google, Apple)
 * - Biometric authentication
 * - Subscription checking
 * - Push notification registration
 * - MFA support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';

import type { User, Subscription } from '@commonground/types';
import { setAuthTokens, clearAuthTokens as clearAPIClientTokens, setUser as setAPIClientUser } from '@commonground/api-client';

// Services
import * as BiometricService from '../services/biometric';
import * as OAuthService from '../services/oauth';
import * as NotificationService from '../services/notifications';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  // State
  user: User | null;
  token: string | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Biometric
  biometricCapability: BiometricService.BiometricCapability | null;
  isBiometricEnabled: boolean;

  // Auth actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  loginWithApple: () => Promise<boolean>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;

  // Biometric actions
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;

  // MFA
  verifyMFA: (code: string, mfaToken: string) => Promise<boolean>;

  // Utilities
  clearError: () => void;
  checkMobileAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const SUBSCRIPTION_KEY = 'subscription_data';

// ============================================================================
// API Helper
// ============================================================================

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://commonground-api-gdxg.onrender.com';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useAuth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}/api/v1${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(data.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricCapability, setBiometricCapability] = useState<BiometricService.BiometricCapability | null>(null);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Refs for notification cleanup
  const notificationListenerRef = useRef<any>(null);
  const responseListenerRef = useRef<any>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializeAuth();

    return () => {
      // Cleanup notification listeners
      if (notificationListenerRef.current) {
        NotificationService.removeNotificationListener(notificationListenerRef.current);
      }
      if (responseListenerRef.current) {
        NotificationService.removeNotificationListener(responseListenerRef.current);
      }
    };
  }, []);

  const initializeAuth = async () => {
    try {
      // Check biometric capability
      const capability = await BiometricService.checkBiometricCapability();
      setBiometricCapability(capability);

      const biometricEnabled = await BiometricService.isBiometricEnabled();
      setIsBiometricEnabled(biometricEnabled);

      // Initialize Google Sign-In
      if (Platform.OS !== 'web') {
        OAuthService.initGoogleSignIn();
      }

      // Load stored auth
      await loadStoredAuth();
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoredAuth = async () => {
    try {
      const [storedToken, userData, subscriptionData] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(SUBSCRIPTION_KEY),
      ]);

      if (storedToken && userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        setToken(storedToken);

        // Sync tokens with @commonground/api-client for parent.* API calls
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        await setAuthTokens(storedToken, refreshToken || '');
        await setAPIClientUser({
          id: parsedUser.id,
          email: parsedUser.email,
          first_name: parsedUser.first_name,
          last_name: parsedUser.last_name,
        });

        if (subscriptionData) {
          setSubscription(JSON.parse(subscriptionData) as Subscription);
        }

        // Validate token and refresh subscription
        try {
          const subResponse = await apiRequest<{
            tier: string;
            tier_display_name: string;
            status: string;
            features: Record<string, any>;
            period_end?: string;
          }>('/subscriptions/current');

          // Map to our Subscription type
          const mappedSubscription: Subscription = {
            tier: subResponse.tier as any,
            status: subResponse.status as any,
            mobile_access: ['plus', 'family_plus'].includes(subResponse.tier),
            video_calls_enabled: subResponse.features?.kidcoms_access || false,
            aria_enabled: subResponse.features?.aria_advanced || true,
            max_children: subResponse.tier === 'family_plus' ? 10 : subResponse.tier === 'plus' ? 5 : 2,
            clearfund_fee_exempt: subResponse.features?.clearfund_fee_exempt || false,
            expires_at: subResponse.period_end,
          };

          setSubscription(mappedSubscription);
          await SecureStore.setItemAsync(SUBSCRIPTION_KEY, JSON.stringify(mappedSubscription));

          // Check mobile access
          if (!mappedSubscription.mobile_access) {
            showUpgradePrompt();
          }

          // Setup push notifications
          await setupPushNotifications();
        } catch {
          // Token might be expired - try to refresh
          await refreshTokens();
        }
      }
    } catch (err) {
      console.error('Failed to load stored auth:', err);
      await clearAuthData();
    }
  };

  // ============================================================================
  // Auth Helpers
  // ============================================================================

  // Backend login response type
  type BackendAuthResponse = {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: {
      id: string;
      email: string;
      email_verified: boolean;
      first_name: string;
      last_name: string;
    };
  };

  const storeAuthData = async (response: BackendAuthResponse) => {
    // Store in SecureStore (for useFamilyFile hook and other direct fetch calls)
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, response.access_token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refresh_token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
    ]);

    // Also sync tokens with @commonground/api-client (for parent.* API calls)
    await setAuthTokens(response.access_token, response.refresh_token);
    await setAPIClientUser({
      id: response.user.id,
      email: response.user.email,
      first_name: response.user.first_name,
      last_name: response.user.last_name,
    });

    // Map backend user to our User type
    const mappedUser: User = {
      id: response.user.id,
      email: response.user.email,
      first_name: response.user.first_name,
      last_name: response.user.last_name,
      email_verified: response.user.email_verified,
    };
    setUser(mappedUser);
    setToken(response.access_token);
  };

  const fetchAndSetSubscription = async () => {
    try {
      const subResponse = await apiRequest<{
        tier: string;
        tier_display_name: string;
        status: string;
        features: Record<string, any>;
        period_end?: string;
      }>('/subscriptions/current');

      // Map to our Subscription type
      const mappedSubscription: Subscription = {
        tier: subResponse.tier as any,
        status: subResponse.status as any,
        mobile_access: ['plus', 'family_plus'].includes(subResponse.tier),
        video_calls_enabled: subResponse.features?.kidcoms_access || false,
        aria_enabled: subResponse.features?.aria_advanced || true,
        max_children: subResponse.tier === 'family_plus' ? 10 : subResponse.tier === 'plus' ? 5 : 2,
        clearfund_fee_exempt: subResponse.features?.clearfund_fee_exempt || false,
        expires_at: subResponse.period_end,
      };

      setSubscription(mappedSubscription);
      await SecureStore.setItemAsync(SUBSCRIPTION_KEY, JSON.stringify(mappedSubscription));
      return mappedSubscription;
    } catch (err) {
      console.log('Could not fetch subscription:', err);
      return null;
    }
  };

  const clearAuthData = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync(SUBSCRIPTION_KEY),
    ]);
    // Also clear API client tokens
    await clearAPIClientTokens();
    setUser(null);
    setToken(null);
    setSubscription(null);
  };

  const refreshTokens = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await apiRequest<BackendAuthResponse>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
        false
      );

      await storeAuthData(response);
      await fetchAndSetSubscription();
    } catch {
      await clearAuthData();
    }
  };

  const showUpgradePrompt = () => {
    Alert.alert(
      'Upgrade Required',
      'Your current subscription does not include mobile app access. Upgrade to use the app on your phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: () => Linking.openURL('https://app.commonground.com/settings/subscription'),
        },
      ]
    );
  };

  const setupPushNotifications = async () => {
    // Push notifications are optional - don't block login if they fail
    // This is expected to fail in development without EAS project ID
    try {
      const result = await NotificationService.registerForPushNotifications();
      if (result.success && result.token) {
        // Register token with backend (optional, ignore failures)
        try {
          await apiRequest('/users/me/push-tokens', {
            method: 'POST',
            body: JSON.stringify({
              token: result.token,
              platform: Platform.OS,
            }),
          });
        } catch {
          console.log('Push token backend registration skipped');
        }

        // Setup listeners
        notificationListenerRef.current = NotificationService.addNotificationReceivedListener(
          (notification) => {
            console.log('Notification received:', notification);
          }
        );

        responseListenerRef.current = NotificationService.addNotificationResponseListener(
          (response) => {
            const data = response.notification.request.content.data;
            handleNotificationNavigation(data);
          }
        );
      } else {
        console.log('Push notifications not available:', result.error);
      }
    } catch (err) {
      // Push notification setup is non-critical, just log and continue
      console.log('Push notification setup skipped (development mode)');
    }
  };

  const handleNotificationNavigation = (data: Record<string, any>) => {
    // Navigate based on notification type
    switch (data.type) {
      case 'message':
        router.push(`/messages/${data.thread_id}` as any);
        break;
      case 'exchange':
        router.push(`/exchange/${data.exchange_id}` as any);
        break;
      case 'schedule':
        router.push('/(tabs)/schedule');
        break;
      default:
        break;
    }
  };

  // ============================================================================
  // Login Methods
  // ============================================================================

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Login to get tokens
      const response = await apiRequest<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        user: {
          id: string;
          email: string;
          email_verified: boolean;
          first_name: string;
          last_name: string;
        };
      }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
        false
      );

      // Store tokens
      await Promise.all([
        SecureStore.setItemAsync(TOKEN_KEY, response.access_token),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refresh_token),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      // Map backend user to our User type
      const mappedUser: User = {
        id: response.user.id,
        email: response.user.email,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
        email_verified: response.user.email_verified,
      };
      setUser(mappedUser);
      setToken(response.access_token);

      // Sync with API client
      await setAuthTokens(response.access_token, response.refresh_token);
      await setAPIClientUser({
        id: response.user.id,
        email: response.user.email,
        first_name: response.user.first_name,
        last_name: response.user.last_name,
      });

      // Fetch subscription status
      try {
        const subResponse = await apiRequest<{
          tier: string;
          tier_display_name: string;
          status: string;
          features: Record<string, any>;
          period_end?: string;
        }>('/subscriptions/current');

        // Map to our Subscription type
        const mappedSubscription: Subscription = {
          tier: subResponse.tier as any,
          status: subResponse.status as any,
          // Plus and Family+ plans have mobile access
          mobile_access: ['plus', 'family_plus'].includes(subResponse.tier),
          video_calls_enabled: subResponse.features?.kidcoms_access || false,
          aria_enabled: subResponse.features?.aria_advanced || true,
          max_children: subResponse.tier === 'family_plus' ? 10 : subResponse.tier === 'plus' ? 5 : 2,
          clearfund_fee_exempt: subResponse.features?.clearfund_fee_exempt || false,
          expires_at: subResponse.period_end,
        };

        setSubscription(mappedSubscription);
        await SecureStore.setItemAsync(SUBSCRIPTION_KEY, JSON.stringify(mappedSubscription));

        // Check mobile access - Plus and Family+ plans have it
        if (!mappedSubscription.mobile_access) {
          showUpgradePrompt();
          await clearAuthData();
          return false;
        }
      } catch (subErr) {
        console.log('Could not fetch subscription, continuing anyway:', subErr);
        // If subscription check fails, still allow login for now
      }

      await setupPushNotifications();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await BiometricService.authenticateWithBiometric();
      if (!result.success || !result.email) {
        setError(result.error || 'Biometric authentication failed');
        return false;
      }

      // We need the password stored securely for biometric login
      // This requires a different approach - using stored refresh token instead
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        setError('Please login with password first to enable biometric');
        return false;
      }

      await refreshTokens();
      if (user) {
        await setupPushNotifications();
        return true;
      }

      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const oauthResult = await OAuthService.signInWithGoogle();
      if (!oauthResult.success || !oauthResult.idToken) {
        setError(oauthResult.error || 'Google sign-in failed');
        return false;
      }

      const response = await apiRequest<BackendAuthResponse>(
        '/auth/oauth/sync',
        {
          method: 'POST',
          body: JSON.stringify({
            supabase_id: oauthResult.userId || '',
            email: oauthResult.email || '',
            first_name: oauthResult.givenName || '',
            last_name: oauthResult.familyName || '',
          }),
        },
        false
      );

      await storeAuthData(response);
      const sub = await fetchAndSetSubscription();

      if (sub && !sub.mobile_access) {
        showUpgradePrompt();
        await clearAuthData();
        return false;
      }

      await setupPushNotifications();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithApple = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const oauthResult = await OAuthService.signInWithApple();
      if (!oauthResult.success || !oauthResult.idToken) {
        setError(oauthResult.error || 'Apple sign-in failed');
        return false;
      }

      const response = await apiRequest<BackendAuthResponse>(
        '/auth/oauth/sync',
        {
          method: 'POST',
          body: JSON.stringify({
            supabase_id: oauthResult.userId || '',
            email: oauthResult.email || '',
            first_name: oauthResult.givenName || '',
            last_name: oauthResult.familyName || '',
          }),
        },
        false
      );

      await storeAuthData(response);
      const sub = await fetchAndSetSubscription();

      if (sub && !sub.mobile_access) {
        showUpgradePrompt();
        await clearAuthData();
        return false;
      }

      await setupPushNotifications();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<BackendAuthResponse>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        },
        false
      );

      await storeAuthData(response);
      await fetchAndSetSubscription();
      await setupPushNotifications();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyMFA = useCallback(async (code: string, mfaToken: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest<BackendAuthResponse>(
        '/auth/mfa/verify',
        {
          method: 'POST',
          body: JSON.stringify({ code, mfa_token: mfaToken }),
        },
        false
      );

      await SecureStore.deleteItemAsync('mfa_token');
      await storeAuthData(response);
      const sub = await fetchAndSetSubscription();

      if (sub && !sub.mobile_access) {
        showUpgradePrompt();
        await clearAuthData();
        return false;
      }

      await setupPushNotifications();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MFA verification failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Unregister push token
      const pushToken = await NotificationService.registerForPushNotifications();
      if (pushToken.token) {
        await apiRequest('/users/me/push-tokens', {
          method: 'DELETE',
          body: JSON.stringify({ token: pushToken.token }),
        }).catch(() => {});
      }

      // Sign out from OAuth providers
      await OAuthService.signOutGoogle();

      // Clear stored data
      await clearAuthData();

      // Navigate to login
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
      await clearAuthData();
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    await refreshTokens();
  }, []);

  // ============================================================================
  // Biometric Methods
  // ============================================================================

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const success = await BiometricService.enableBiometric(user.email);
    if (success) {
      setIsBiometricEnabled(true);
    }
    return success;
  }, [user]);

  const disableBiometric = useCallback(async () => {
    await BiometricService.disableBiometric();
    setIsBiometricEnabled(false);
  }, []);

  // ============================================================================
  // Subscription Check
  // ============================================================================

  const checkMobileAccess = useCallback(async (): Promise<boolean> => {
    try {
      const subResponse = await apiRequest<{
        tier: string;
        tier_display_name: string;
        status: string;
        features: Record<string, any>;
        period_end?: string;
      }>('/subscriptions/current');

      // Map to our Subscription type
      const mappedSubscription: Subscription = {
        tier: subResponse.tier as any,
        status: subResponse.status as any,
        mobile_access: ['plus', 'family_plus'].includes(subResponse.tier),
        video_calls_enabled: subResponse.features?.kidcoms_access || false,
        aria_enabled: subResponse.features?.aria_advanced || true,
        max_children: subResponse.tier === 'family_plus' ? 10 : subResponse.tier === 'plus' ? 5 : 2,
        clearfund_fee_exempt: subResponse.features?.clearfund_fee_exempt || false,
        expires_at: subResponse.period_end,
      };

      setSubscription(mappedSubscription);
      return mappedSubscription.mobile_access;
    } catch {
      return false;
    }
  }, []);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: AuthContextType = {
    // State
    user,
    token,
    subscription,
    isLoading,
    isAuthenticated: !!user,
    error,
    biometricCapability,
    isBiometricEnabled,

    // Auth actions
    login,
    loginWithBiometric,
    loginWithGoogle,
    loginWithApple,
    register,
    logout,
    refreshAuth,

    // Biometric
    enableBiometric,
    disableBiometric,

    // MFA
    verifyMFA,

    // Utilities
    clearError: () => setError(null),
    checkMobileAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

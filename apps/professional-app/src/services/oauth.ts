/**
 * OAuth Authentication Service
 *
 * Handles Google and Apple sign-in for mobile apps
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface OAuthResult {
  success: boolean;
  provider: 'google' | 'apple';
  idToken?: string;
  accessToken?: string;
  nonce?: string;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  error?: string;
}

// ============================================================================
// Apple Sign-In
// ============================================================================

/**
 * Check if Apple Sign-In is available
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<OAuthResult> {
  try {
    // Generate nonce for security
    const nonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(36).substring(2, 15)
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });

    if (!credential.identityToken) {
      return {
        success: false,
        provider: 'apple',
        error: 'No identity token received',
      };
    }

    return {
      success: true,
      provider: 'apple',
      idToken: credential.identityToken,
      nonce,
      user: {
        email: credential.email ?? undefined,
        firstName: credential.fullName?.givenName ?? undefined,
        lastName: credential.fullName?.familyName ?? undefined,
      },
    };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        success: false,
        provider: 'apple',
        error: 'Sign in was canceled',
      };
    }

    console.error('Apple sign-in error:', error);
    return {
      success: false,
      provider: 'apple',
      error: error.message || 'Apple sign-in failed',
    };
  }
}

// ============================================================================
// Google Sign-In
// ============================================================================

// Note: Google Sign-In requires additional setup:
// 1. Install @react-native-google-signin/google-signin
// 2. Configure in app.json/app.config.js
// 3. Set up Google Cloud Console project

let GoogleSignin: any = null;

/**
 * Initialize Google Sign-In (call once on app start)
 */
export async function initGoogleSignIn(): Promise<boolean> {
  try {
    // Dynamically import to avoid errors if not installed
    const module = await import('@react-native-google-signin/google-signin').catch(() => null);
    if (!module) {
      console.warn('Google Sign-In package not installed');
      return false;
    }

    GoogleSignin = module.GoogleSignin;

    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Google Sign-In:', error);
    return false;
  }
}

/**
 * Check if Google Sign-In is available
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  if (!GoogleSignin) {
    await initGoogleSignIn();
  }
  return GoogleSignin !== null;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  try {
    if (!GoogleSignin) {
      const initialized = await initGoogleSignIn();
      if (!initialized) {
        return {
          success: false,
          provider: 'google',
          error: 'Google Sign-In not available',
        };
      }
    }

    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();

    if (!tokens.idToken) {
      return {
        success: false,
        provider: 'google',
        error: 'No ID token received',
      };
    }

    return {
      success: true,
      provider: 'google',
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
      user: {
        email: userInfo.data?.user.email ?? undefined,
        firstName: userInfo.data?.user.givenName ?? undefined,
        lastName: userInfo.data?.user.familyName ?? undefined,
      },
    };
  } catch (error: any) {
    if (error.code === 'SIGN_IN_CANCELLED') {
      return {
        success: false,
        provider: 'google',
        error: 'Sign in was canceled',
      };
    }

    console.error('Google sign-in error:', error);
    return {
      success: false,
      provider: 'google',
      error: error.message || 'Google sign-in failed',
    };
  }
}

/**
 * Sign out from Google (call on logout)
 */
export async function signOutGoogle(): Promise<void> {
  try {
    if (GoogleSignin) {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }
    }
  } catch (error) {
    console.error('Google sign-out error:', error);
  }
}

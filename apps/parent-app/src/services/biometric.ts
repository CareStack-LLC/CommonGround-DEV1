/**
 * Biometric Authentication Service
 *
 * Handles Face ID / Touch ID authentication for secure login
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

export interface BiometricCapability {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'facial' | 'iris' | null;
  isEnrolled: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  email?: string;
  error?: string;
}

/**
 * Check device biometric capabilities
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType: BiometricCapability['biometryType'] = null;
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometryType = 'iris';
    }

    return {
      isAvailable: hasHardware,
      biometryType,
      isEnrolled,
    };
  } catch (error) {
    console.error('Failed to check biometric capability:', error);
    return {
      isAvailable: false,
      biometryType: null,
      isEnrolled: false,
    };
  }
}

/**
 * Check if biometric login is enabled for this device
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable biometric login for an email
 */
export async function enableBiometric(email: string): Promise<boolean> {
  try {
    // Verify biometric first
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric login',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return false;
    }

    // Store biometric settings
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);

    return true;
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    return false;
  }
}

/**
 * Disable biometric login
 */
export async function disableBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
  } catch (error) {
    console.error('Failed to disable biometric:', error);
  }
}

/**
 * Authenticate with biometric and return stored email
 */
export async function authenticateWithBiometric(): Promise<BiometricAuthResult> {
  try {
    // Check if enabled
    const enabled = await isBiometricEnabled();
    if (!enabled) {
      return { success: false, error: 'Biometric login not enabled' };
    }

    // Get stored email
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    if (!email) {
      return { success: false, error: 'No stored credentials' };
    }

    // Authenticate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to CommonGround',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true, email };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get friendly name for biometry type
 */
export function getBiometryDisplayName(type: BiometricCapability['biometryType']): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Touch ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
}

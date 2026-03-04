/**
 * Native platform storage adapter using expo-secure-store
 * Used by React Native / Expo mobile apps
 *
 * Note: This file requires expo-secure-store as a peer dependency.
 * Install it in your Expo app: npx expo install expo-secure-store
 */

import type { TokenStorage } from '../core/storage';

// Lazy import to avoid requiring expo-secure-store in web builds
let SecureStore: typeof import('expo-secure-store') | null = null;

async function getSecureStore(): Promise<typeof import('expo-secure-store')> {
  if (!SecureStore) {
    SecureStore = await import('expo-secure-store');
  }
  return SecureStore;
}

/**
 * Expo SecureStore-based token storage for native platforms
 * Uses encrypted storage for sensitive tokens
 */
export class NativeStorage implements TokenStorage {
  private prefix: string;

  constructor(prefix: string = 'commonground_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    // SecureStore keys must be alphanumeric with underscores/dashes
    return `${this.prefix}${key}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async getToken(key: string): Promise<string | null> {
    try {
      const store = await getSecureStore();
      return await store.getItemAsync(this.getKey(key));
    } catch {
      return null;
    }
  }

  async setToken(key: string, value: string): Promise<void> {
    try {
      const store = await getSecureStore();
      await store.setItemAsync(this.getKey(key), value);
    } catch {
      // Storage error - fail silently
    }
  }

  async removeToken(key: string): Promise<void> {
    try {
      const store = await getSecureStore();
      await store.deleteItemAsync(this.getKey(key));
    } catch {
      // Fail silently
    }
  }
}

/**
 * Create a native storage adapter
 */
export function createNativeStorage(prefix?: string): TokenStorage {
  return new NativeStorage(prefix);
}

/**
 * Check if running on native platform
 */
export function isNativePlatform(): boolean {
  try {
    // Check for React Native environment
    const nav = (globalThis as any).navigator;
    return (
      typeof nav !== 'undefined' &&
      nav.product === 'ReactNative'
    );
  } catch {
    return false;
  }
}

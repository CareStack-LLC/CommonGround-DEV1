/**
 * Storage adapter interface for cross-platform token storage
 *
 * This abstraction allows the API client to work with both:
 * - Web: localStorage
 * - Mobile: expo-secure-store
 */

import type { TokenStorage } from '@commonground/types';

// Re-export the interface
export type { TokenStorage };

// Token keys
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  CHILD_TOKEN: 'child_token',
  CIRCLE_TOKEN: 'circle_token',
  USER: 'user',
} as const;

export type TokenKey = (typeof TOKEN_KEYS)[keyof typeof TOKEN_KEYS];

/**
 * In-memory storage fallback (for SSR or testing)
 */
export class MemoryStorage implements TokenStorage {
  private store: Map<string, string> = new Map();

  async getToken(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setToken(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeToken(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Default storage instance (will be overridden by platform adapters)
let currentStorage: TokenStorage = new MemoryStorage();

/**
 * Set the storage adapter to use
 */
export function setStorage(storage: TokenStorage): void {
  currentStorage = storage;
}

/**
 * Get the current storage adapter
 */
export function getStorage(): TokenStorage {
  return currentStorage;
}

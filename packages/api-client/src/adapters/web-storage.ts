/**
 * Web platform storage adapter using localStorage
 * Used by Next.js web app
 */

import type { TokenStorage } from '../core/storage';

/**
 * LocalStorage-based token storage for web platforms
 */
export class WebStorage implements TokenStorage {
  private prefix: string;

  constructor(prefix: string = 'commonground_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async getToken(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(this.getKey(key));
    } catch {
      return null;
    }
  }

  async setToken(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this.getKey(key), value);
    } catch {
      // Storage full or disabled - fail silently
    }
  }

  async removeToken(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(this.getKey(key));
    } catch {
      // Fail silently
    }
  }

  /**
   * Clear all tokens with this prefix
   */
  async clearAll(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Fail silently
    }
  }
}

/**
 * Create a web storage adapter
 */
export function createWebStorage(prefix?: string): TokenStorage {
  return new WebStorage(prefix);
}

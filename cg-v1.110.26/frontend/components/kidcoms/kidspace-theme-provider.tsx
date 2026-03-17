'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type KidSpaceTheme = 'light' | 'dark' | 'system';

interface KidSpaceThemeContextType {
  theme: KidSpaceTheme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: KidSpaceTheme) => void;
  toggleTheme: () => void;
}

const KidSpaceThemeContext = createContext<KidSpaceThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'cg_kidspace_theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: KidSpaceTheme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

export function KidSpaceThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<KidSpaceTheme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as KidSpaceTheme | null;
      const initial = stored || 'dark';
      setThemeState(initial);
      setResolvedTheme(resolveTheme(initial));
    } catch {
      setResolvedTheme('dark');
    }
  }, []);

  // Listen for system theme changes when set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Apply dark class to document root for CSS variable resolution
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: KidSpaceTheme) => {
    setThemeState(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <KidSpaceThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      <div className="child-portal">
        {children}
      </div>
    </KidSpaceThemeContext.Provider>
  );
}

export function useKidSpaceTheme() {
  return useContext(KidSpaceThemeContext);
}

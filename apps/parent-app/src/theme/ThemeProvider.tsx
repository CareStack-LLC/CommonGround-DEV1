/**
 * ThemeProvider — Light / Dark / System theme support
 *
 * Wraps the app and provides semantic colors based on the current theme.
 * Persists user preference to AsyncStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { lightColors, darkColors, type ThemeColors } from "./colors";

// ── Types ───────────────────────────────────────────────────────────

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** Resolved semantic colors for the active theme */
  colors: ThemeColors;
  /** Whether the resolved theme is dark */
  isDark: boolean;
  /** The resolved theme ("light" | "dark") */
  colorScheme: ResolvedTheme;
  /** The user's preference ("light" | "dark" | "system") */
  preference: ThemePreference;
  /** Change the theme preference */
  setTheme: (pref: ThemePreference) => void;
}

const STORAGE_KEY = "cg_theme_preference";

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setPreference(val);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((pref: ThemePreference) => {
    setPreference(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: resolvedTheme === "dark" ? darkColors : lightColors,
      isDark: resolvedTheme === "dark",
      colorScheme: resolvedTheme,
      preference,
      setTheme,
    }),
    [resolvedTheme, preference, setTheme],
  );

  // Don't render children until preference is loaded to avoid flash
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

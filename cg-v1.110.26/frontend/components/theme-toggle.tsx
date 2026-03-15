"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem("cg_theme_preference") as ThemePreference | null;
    if (stored) {
      setPreference(stored);
      applyTheme(stored);
    } else {
      applyTheme("system");
    }
  }, []);

  function applyTheme(pref: ThemePreference) {
    const root = document.documentElement;
    if (pref === "dark") {
      root.classList.add("dark");
    } else if (pref === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }

  function setTheme(pref: ThemePreference) {
    setPreference(pref);
    localStorage.setItem("cg_theme_preference", pref);
    applyTheme(pref);
  }

  const options: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            preference === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

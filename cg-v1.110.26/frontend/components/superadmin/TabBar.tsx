"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { useCallback } from "react";

interface Tab {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  size?: "sm" | "md";
}

export function TabBar({ tabs, activeTab, onTabChange, size = "md" }: TabBarProps) {
  const sizeClass = size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2";

  return (
    <div className="flex items-center gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition-all ${sizeClass} ${
              isActive
                ? "bg-[#3DAA8A]/15 text-[#5BC4A0] shadow-sm"
                : "text-[#6B8A9A] hover:text-white hover:bg-[#2D6A8F]/15"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Hook to sync tab state with URL ?tab= param */
export function useTabState(defaultTab: string): [string, (tab: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || defaultTab;

  const setTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === defaultTab) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname, defaultTab]
  );

  return [currentTab, setTab];
}

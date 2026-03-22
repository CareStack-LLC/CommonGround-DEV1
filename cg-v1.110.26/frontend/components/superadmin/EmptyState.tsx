"use client";

import { type LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 rounded-full bg-[#2D6A8F]/20 mb-3">
        <Icon className="w-6 h-6 text-[#6B8A9A]" />
      </div>
      <p className="text-sm font-medium text-[#8AACBC] mb-1">{title}</p>
      <p className="text-xs text-[#4A6E7F] max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-xs font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

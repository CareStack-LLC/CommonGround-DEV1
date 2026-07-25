"use client";

import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertTriangle className="w-8 h-8 text-cg-amber mb-3" />
      <p className="text-sm text-[#8AACBC] mb-4 text-center max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

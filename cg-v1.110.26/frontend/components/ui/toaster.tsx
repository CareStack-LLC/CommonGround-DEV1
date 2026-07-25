"use client"

/**
 * Toaster — renders the toast stack from hooks/use-toast.
 *
 * Dependency-free (no Radix toast package): a fixed-position stack fed by
 * the existing in-memory toast store. Mounted once in AppProviders, which
 * activates every `toast()` call site across the app.
 */

import { X } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto relative flex items-start gap-3 rounded-lg border p-4 pr-9 shadow-lg transition-all duration-300",
            t.open === false
              ? "translate-y-2 opacity-0"
              : "translate-y-0 opacity-100",
            t.variant === "destructive"
              ? "border-cg-error-subtle bg-cg-error-subtle text-[#7A2222] dark:border-[#7A2222]/50 dark:bg-[#7A2222] dark:text-cg-error-subtle"
              : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          )}
        >
          <div className="flex-1 space-y-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && (
              <p className="text-sm opacity-80">{t.description}</p>
            )}
            {t.action}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
            className="absolute right-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

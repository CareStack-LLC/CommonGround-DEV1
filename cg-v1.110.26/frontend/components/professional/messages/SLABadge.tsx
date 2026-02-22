"use client";

import { useMemo } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SLABadgeProps {
    lastMessageAt: string | null | undefined;
    /** SLA threshold in hours. Default: 24 */
    thresholdHours?: number;
    /** If true, only show when SLA is breached (not green). Default: false */
    onlyShowWarning?: boolean;
}

/**
 * SLABadge — shows time since last message with color-coded urgency.
 *
 * Green  = < thresholdHours (default 24h) — response within SLA
 * Yellow = 24-48h — approaching breach
 * Red    = > 48h — SLA breached
 *
 * If lastMessageAt is null/undefined, shows nothing.
 */
export function SLABadge({ lastMessageAt, thresholdHours = 24, onlyShowWarning = false }: SLABadgeProps) {
    const status = useMemo(() => {
        if (!lastMessageAt) return null;

        const elapsedMs = Date.now() - new Date(lastMessageAt).getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        let label: string;
        let variant: "green" | "yellow" | "red";

        if (elapsedHours < thresholdHours) {
            if (onlyShowWarning) return null;
            const h = Math.floor(elapsedHours);
            const m = Math.floor((elapsedHours - h) * 60);
            label = h > 0 ? `${h}h ${m}m ago` : `${m}m ago`;
            variant = "green";
        } else if (elapsedHours < thresholdHours * 2) {
            const h = Math.floor(elapsedHours);
            label = `${h}h — Needs Response`;
            variant = "yellow";
        } else {
            const days = Math.floor(elapsedHours / 24);
            const h = Math.floor(elapsedHours % 24);
            label = days > 0 ? `${days}d ${h}h — Overdue` : `${Math.floor(elapsedHours)}h — Overdue`;
            variant = "red";
        }

        return { label, variant };
    }, [lastMessageAt, thresholdHours, onlyShowWarning]);

    if (!status) return null;

    const styles = {
        green: "bg-emerald-50 text-emerald-700 border-emerald-200",
        yellow: "bg-amber-50 text-amber-700 border-amber-200",
        red: "bg-red-50 text-red-700 border-red-200",
    };

    return (
        <Badge variant="outline" className={`text-xs gap-1.5 flex-shrink-0 border ${styles[status.variant]}`}>
            {status.variant === "red" ? (
                <AlertCircle className="h-3 w-3" />
            ) : (
                <Clock className="h-3 w-3" />
            )}
            {status.label}
        </Badge>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
    getImageUrl,
    FamilyFileChild,
    custodyTimeAPI,
    CustodyTimelineResponse,
    familyFilesAPI,
    ChildCustodyStatus,
} from '@/lib/api';
import { formatInUserTimezone, isToday as isTodayTz } from '@/lib/timezone';
import { MapPin } from 'lucide-react';

// =============================================================================
// HELPERS
// =============================================================================

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function formatDays(minutes: number): string {
    const days = minutes / (60 * 24);
    const rounded = Math.round(days * 10) / 10;
    return rounded.toString();
}

// =============================================================================
// CHECK-IN BUTTON (compact pill)
// =============================================================================

function CheckInPill({
    onClick,
    label,
    disabled = false,
    pulse = false,
}: {
    onClick: () => void | Promise<void>;
    label: string;
    disabled?: boolean;
    pulse?: boolean;
}) {
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (loading || disabled) return;
        try {
            setLoading(true);
            await onClick();
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading || disabled}
            className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all duration-200 flex-shrink-0 ${
                disabled
                    ? 'bg-[var(--portal-primary)] opacity-40 cursor-not-allowed'
                    : pulse
                        ? 'bg-gradient-to-r from-cg-amber to-orange-500 animate-pulse hover:shadow-md'
                        : 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] hover:shadow-md hover:scale-105'
            } ${loading ? 'opacity-80 cursor-wait' : ''}`}
        >
            {loading ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : label}
        </button>
    );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DashboardCustodyCard({
    childId,
    familyFileId,
    childData,
    onWithMe,
    refreshTrigger = 0,
}: {
    childId: string;
    familyFileId: string;
    childData?: FamilyFileChild;
    onWithMe?: (childId: string) => void | Promise<void>;
    refreshTrigger?: number;
}) {
    const { user, timezone } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timelineData, setTimelineData] = useState<CustodyTimelineResponse | null>(null);
    const [childStatus, setChildStatus] = useState<ChildCustodyStatus | null>(null);

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                if (!timelineData) setLoading(true);

                const [timeline, custodyStatus] = await Promise.allSettled([
                    custodyTimeAPI.getTimeline(childId, 30),
                    familyFilesAPI.getCustodyStatus(familyFileId),
                ]);

                if (timeline.status === 'fulfilled') setTimelineData(timeline.value);
                if (custodyStatus.status === 'fulfilled') {
                    const match = custodyStatus.value.children.find(c => c.child_id === childId);
                    setChildStatus(match || null);
                }
            } catch (err) {
                console.error('Failed to load custody data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [childId, familyFileId, refreshTrigger]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`custody-updates-${childId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'custody_day_records',
                    filter: `child_id=eq.${childId}`,
                },
                () => {
                    custodyTimeAPI.getTimeline(childId, 30).then(setTimelineData);
                    familyFilesAPI.getCustodyStatus(familyFileId).then(status => {
                        const match = status.children.find(c => c.child_id === childId);
                        setChildStatus(match || null);
                    }).catch(() => {});
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [childId, familyFileId]);

    // Loading skeleton
    if (loading || !timelineData) {
        return (
            <div className="bg-card rounded-2xl border-2 border-border p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-muted w-2/3 rounded mb-3" />
                <div className="h-2 bg-muted rounded-full mb-6 mt-8" />
                <div className="h-4 bg-muted w-1/2 rounded" />
            </div>
        );
    }

    // Derive state
    const currentSession = timelineData.sessions.find(s => s.is_current);
    const hasCurrentSession = !!currentSession;
    const isWithYou = currentSession ? currentSession.parent_id === user?.id : false;

    const isParentA = timelineData.stats.parent_a.user_id === user?.id;
    const myStats = isParentA ? timelineData.stats.parent_a : timelineData.stats.parent_b;

    // Status
    let statusColor = 'bg-cg-slate';
    let statusText = 'Unknown';

    if (hasCurrentSession) {
        if (isWithYou) {
            statusColor = 'bg-[var(--portal-primary)]';
            statusText = 'With You';
        } else {
            statusColor = 'bg-cg-slate';
            statusText = 'With Co-parent';
        }
    } else {
        statusColor = 'bg-cg-amber';
        statusText = 'Pending Check-in';
    }

    // Current streak
    const currentStreakDays = (() => {
        if (!currentSession) return 0;
        const start = new Date(currentSession.start_time);
        const diffMs = Math.abs(new Date().getTime() - start.getTime());
        return Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
    })();

    // Next exchange — use real data from custody status API
    const nextExchangeTime = childStatus?.next_exchange_time;
    const nextExchangeLocation = childStatus?.next_exchange_location;
    const nextAction = childStatus?.next_action; // 'pickup' | 'dropoff'
    const hasNextExchange = !!nextExchangeTime && new Date(nextExchangeTime).getFullYear() < 3000;

    const formatNextExchange = (time: string) => {
        const isToday = isTodayTz(time, timezone);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 86400000).toISOString();
        const isTomorrow = formatInUserTimezone(time, timezone, 'yyyy-MM-dd') ===
            formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');

        const timeStr = formatInUserTimezone(time, timezone, 'h:mm a');
        const dayStr = formatInUserTimezone(time, timezone, 'EEEE');

        if (isToday) return `Today ${timeStr}`;
        if (isTomorrow) return `Tomorrow ${timeStr}`;
        return `${dayStr} ${timeStr}`;
    };

    // Progress: (now - session_start) / (next_exchange - session_start)
    const progress = (() => {
        if (!currentSession || !nextExchangeTime) return 0;
        const start = new Date(currentSession.start_time).getTime();
        const end = new Date(nextExchangeTime).getTime();
        const now = new Date().getTime();
        if (end <= start) return 0;
        return clamp(((now - start) / (end - start)) * 100, 0, 100);
    })();

    // Photo
    const photoUrl = childData?.photo_url ? getImageUrl(childData.photo_url) : null;
    const childName = childData?.first_name || '?';

    return (
        <div className={`bg-card rounded-2xl border-2 ${!hasCurrentSession ? 'border-cg-amber/50' : 'border-border'} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}>
            {/* Accent bar */}
            <div className={`h-1.5 ${statusColor}`} />

            <div className="px-4 pt-3 pb-4">
                {/* Top row: next exchange + With Me button */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                        {hasCurrentSession && hasNextExchange ? (
                            <>
                                <p className="text-sm text-foreground">
                                    <span className="text-[var(--portal-primary)] font-semibold">
                                        Next {nextAction || 'exchange'}:
                                    </span>{' '}
                                    <span className="font-medium">{formatNextExchange(nextExchangeTime!)}</span>
                                </p>
                                {nextExchangeLocation && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        {nextExchangeLocation}
                                    </p>
                                )}
                            </>
                        ) : hasCurrentSession ? (
                            <p className="text-sm text-muted-foreground italic">No exchanges scheduled</p>
                        ) : (
                            <p className="text-sm text-cg-amber font-medium">Waiting for check-in</p>
                        )}
                    </div>

                    {onWithMe && (
                        <CheckInPill
                            onClick={isWithYou ? () => {} : () => onWithMe(childId)}
                            label={isWithYou ? 'With Me' : (!hasCurrentSession ? 'Check In' : 'With Me')}
                            disabled={isWithYou}
                            pulse={!hasCurrentSession}
                        />
                    )}
                </div>

                {/* Progress bar with child photo riding it */}
                <div className="relative mt-6 mb-5">
                    {/* Track */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                isWithYou
                                    ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F]'
                                    : hasCurrentSession
                                        ? 'bg-cg-slate/60'
                                        : 'bg-cg-amber/40'
                            }`}
                            style={{ width: `${hasCurrentSession ? Math.max(progress, 3) : 0}%` }}
                        />
                    </div>

                    {/* Child avatar riding the bar */}
                    <div
                        className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center transition-all duration-700"
                        style={{ left: `${clamp(hasCurrentSession ? progress : 5, 8, 92)}%` }}
                    >
                        <div className="w-8 h-8 rounded-full ring-2 ring-card shadow-md overflow-hidden bg-muted flex items-center justify-center">
                            {photoUrl && !imageError ? (
                                <img
                                    src={photoUrl}
                                    alt={childName}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <span className="text-xs font-bold text-[var(--portal-primary)]">
                                    {childName.charAt(0)}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-foreground mt-0.5 whitespace-nowrap">
                            {childName}
                        </span>
                    </div>
                </div>

                {/* Status + streak below bar */}
                <p className="text-xs text-center text-muted-foreground mb-3">
                    <span className={isWithYou ? 'text-[var(--portal-primary)] font-semibold' : hasCurrentSession ? 'text-cg-slate font-medium' : 'text-cg-amber font-medium'}>
                        {statusText}
                    </span>
                    {hasCurrentSession && currentStreakDays > 0 && (
                        <span className="text-foreground font-medium"> · {currentStreakDays} Days</span>
                    )}
                </p>

                {/* Total days - your time only */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Your total time</span>
                    <span className="text-lg font-bold text-[var(--portal-primary)]">
                        {formatDays(myStats.minutes)} <span className="text-xs font-medium text-muted-foreground">Days</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
    getImageUrl,
    FamilyFileChild,
    custodyTimeAPI,
    CustodyTimelineResponse
} from '@/lib/api';
import { formatInUserTimezone, isToday as isTodayTz } from '@/lib/timezone';
import { Users } from 'lucide-react';

// Format hours remaining into a human-readable string
function formatHoursRemaining(hours: number | undefined): string {
    if (!hours) return 'Unknown';
    if (hours < 1) {
        return `${Math.round(hours * 60)} minutes`;
    }
    if (hours < 24) {
        return `${Math.round(hours)} hours`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) {
        return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${days} day${days > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
}

export function DashboardCustodyCard({
    childId,
    childData,
    onWithMe,
}: {
    childId: string;
    childData?: FamilyFileChild;
    onWithMe?: (childId: string) => void;
}) {
    const { user, timezone } = useAuth();
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timelineData, setTimelineData] = useState<CustodyTimelineResponse | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await custodyTimeAPI.getTimeline(childId, 30);
                setTimelineData(data);
            } catch (err) {
                console.error('Failed to load custody timeline:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [childId]);

    if (loading || !timelineData) {
        return (
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm animate-pulse h-48">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 w-1/3 rounded" />
                        <div className="h-3 bg-slate-200 w-1/2 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    // Derive status from timeline data
    const currentSession = timelineData.sessions.find(s => s.is_current);
    const hasCurrentSession = !!currentSession;

    // Default to user if no session (fallback) or check session parent_id
    // If no current session, we don't know who it's with (Status: Unknown/Pending)
    const isWithYou = currentSession ? currentSession.parent_id === user?.id : false;

    // Calculate stats from real-time stats
    // We need to know which parent object corresponds to the current user
    const isParentA = timelineData.stats.parent_a.user_id === user?.id;
    const myStats = isParentA ? timelineData.stats.parent_a : timelineData.stats.parent_b;
    const theirStats = isParentA ? timelineData.stats.parent_b : timelineData.stats.parent_a;

    // Names
    const coparentName = isParentA ? 'Co-parent' : 'Co-parent';

    // Status Colors & Text
    let statusColor = 'bg-cg-slate';
    let statusTextColor = 'text-cg-slate';
    let statusText = 'Unknown Status';

    if (hasCurrentSession) {
        if (isWithYou) {
            statusColor = 'bg-[var(--portal-primary)]';
            statusTextColor = 'text-[var(--portal-primary)]';
            statusText = 'With You';
        } else {
            statusColor = 'bg-cg-slate';
            statusTextColor = 'text-cg-slate';
            statusText = `With ${coparentName}`;
        }
    } else {
        // Needs Check-in State
        statusColor = 'bg-cg-amber'; // Amber to signal attention
        statusTextColor = 'text-cg-amber';
        statusText = 'Pending Check-in';
    }

    // We need "days with current parent" - this is effectively the current session duration roughly
    // The user screenshot showed "Day 5". 
    // We can calculate this from `currentSession.start_time`.
    // Calculate streak in DAYS (1 decimal)
    const getCurrentStreakDays = () => {
        if (!currentSession) return 0;
        const start = new Date(currentSession.start_time);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return Math.round(diffDays * 10) / 10; // 1 decimal place
    };
    const currentStreakDays = getCurrentStreakDays();

    // Next exchange logic
    // The timeline endpoint returns sessions. The *next* session after current tells us when exchange happens.
    // Or we find the current session and look at its `end_time`.
    const nextExchangeTime = currentSession?.end_time;
    const hasNextExchange = !!nextExchangeTime && new Date(nextExchangeTime).getFullYear() < 3000; // Check for realistic date

    // Format next exchange time (timezone-aware)
    const formatNextExchange = () => {
        if (!nextExchangeTime) return null;
        const exchangeTime = nextExchangeTime;
        const isToday = isTodayTz(exchangeTime, timezone);

        // Check if tomorrow
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 86400000).toISOString();
        const isTomorrow = formatInUserTimezone(exchangeTime, timezone, 'yyyy-MM-dd') ===
            formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');

        const timeStr = formatInUserTimezone(exchangeTime, timezone, 'h:mm a');
        const dayStr = formatInUserTimezone(exchangeTime, timezone, 'EEEE');

        if (isToday) return `Today ${timeStr}`;
        if (isTomorrow) return `Tomorrow ${timeStr}`;
        return `${dayStr} ${timeStr}`;
    };

    const nextExchangeStr = formatNextExchange();

    // Calculate percentage for progress bar? 
    // The original component had `progress_percentage`. 
    // We can calculate it: (now - start) / (end - start) * 100
    const getProgress = () => {
        if (!currentSession || !nextExchangeTime) return 0;
        const start = new Date(currentSession.start_time).getTime();
        const end = new Date(nextExchangeTime).getTime();
        const now = new Date().getTime();
        const total = end - start;
        const elapsed = now - start;
        return Math.min(100, Math.max(0, (elapsed / total) * 100));
    };
    const progress = getProgress();

    // Helper to format days (always show 1 decimal if not whole, or just whole number)
    const formatDays = (minutes: number) => {
        const days = minutes / (60 * 24);
        return (Math.round(days * 10) / 10).toString();
    };


    return (
        <div className={`bg-white rounded-2xl border-2 ${!hasCurrentSession ? 'border-cg-amber/50' : 'border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden mb-4`}>
            {/* Top accent bar */}
            <div className={`h-2 ${statusColor}`} />

            <div className="p-5">
                {/* Child header with "With Me" button */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-md">
                        {childData?.photo_url && !imageError ? (
                            <img
                                src={getImageUrl(childData.photo_url) || ''}
                                alt={childData.first_name}
                                className="w-full h-full object-cover"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <span className="text-base font-bold text-[var(--portal-primary)]">
                                {childData?.first_name?.charAt(0) || '?'}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                            {childData?.first_name}
                        </p>
                        <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${statusTextColor}`}>
                                {statusText}
                            </p>
                            {/* Show days with current parent - ONLY if session active */}
                            {hasCurrentSession && currentStreakDays > 0 && (
                                <span className="text-sm font-semibold text-cg-amber">
                                    • {currentStreakDays} Days
                                </span>
                            )}
                        </div>
                    </div>

                    {/* With Me Button - Manual Override / Check-in */}
                    {onWithMe && !isWithYou && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onWithMe(childId);
                            }}
                            className={`px-4 py-2 text-xs font-bold text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex-shrink-0 ${!hasCurrentSession ? 'bg-gradient-to-r from-cg-amber to-orange-500 animate-pulse' : 'bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644]'}`}
                        >
                            {!hasCurrentSession ? 'Check In / Claim' : 'With Me'}
                        </button>
                    )}
                    {isWithYou && (
                        <div className="px-4 py-2 text-xs font-bold bg-[#1f4644] text-white rounded-xl flex-shrink-0 shadow-sm">
                            With Me
                        </div>
                    )}
                </div>

                {/* Next exchange info */}
                {hasCurrentSession && hasNextExchange ? (
                    <div className="mb-3">
                        <p className="text-sm text-foreground">
                            <span className="text-blue-600 font-medium">Next exchange:</span>{' '}
                            <span className="font-medium">{nextExchangeStr}</span>
                        </p>
                    </div>
                ) : hasCurrentSession ? (
                    <p className="text-sm text-muted-foreground mb-3 italic">
                        No exchanges scheduled
                    </p>
                ) : (
                    <p className="text-sm text-cg-amber mb-3 font-medium">
                        Waiting for parent check-in to start tracking.
                    </p>
                )}

                {/* Progress Bar - only show if exchange scheduled */}
                {hasCurrentSession && hasNextExchange && (
                    <div className="relative mb-2">
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isWithYou ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#1e4442]' : 'bg-cg-slate/60'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Cumulative custody totals */}
                <div className="mt-4 pt-4 border-t-2 border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--portal-primary)] shadow-sm" />
                            <span className="text-sm text-slate-700 font-semibold">
                                Your total days
                            </span>
                        </div>
                        <span className="text-2xl font-bold text-[var(--portal-primary)]">
                            {formatDays(myStats.minutes)} <span className="text-xs font-medium text-slate-400">Days</span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm" />
                            <span className="text-sm text-slate-500 font-medium">
                                {coparentName}&apos;s total
                            </span>
                        </div>
                        <span className="text-xl font-semibold text-slate-500">
                            {formatDays(theirStats.minutes)} <span className="text-xs font-medium text-slate-400">Days</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, XCircle, Loader2, QrCode, Navigation, Users, Package, ArrowDown, ArrowUp } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';
import {
    scheduleAPI,
    familyFilesAPI,
    EventV2,
    FamilyFileChild,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';

interface EventSilentHandoffCheckInProps {
    event: EventV2;
    onCheckInComplete?: () => void;
    onClose: () => void;
}

export default function EventSilentHandoffCheckIn({
    event,
    onCheckInComplete,
    onClose,
}: EventSilentHandoffCheckInProps) {
    const { user } = useAuth();
    const { position, error: geoError, isLoading: geoLoading, getCurrentPosition, isSupported } = useGeolocation();
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [checkInError, setCheckInError] = useState<string | null>(null);
    const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);
    const [notes, setNotes] = useState('');
    const [children, setChildren] = useState<FamilyFileChild[]>([]);

    // Calculate window status client-side
    const [windowStatus, setWindowStatus] = useState<{
        is_within_window: boolean;
        minutes_until_window: number;
        minutes_remaining: number;
        is_before_window: boolean;
    } | null>(null);

    // Determine user role (custodial vs non-custodial)
    // custodial_parent_id is set on the event
    const isCustodial = user?.id === event.custodial_parent_id;
    // For standard events, we assume:
    // - Custodial parent is "dropping off" (if it's an exchange) or just "host"
    // - Non-custodial is "picking up" or "guest"
    // But for simple check-in, we just need to send a role.
    // The backend `create_check_in` expects `parent_role`.
    // Let's infer it or just use a generic one if not strictly an exchange.
    // However, `ScheduleService` doesn't strictly validate role against specific transition logic for generic events.
    const parentRole = isCustodial ? 'dropping_off' : 'picking_up';

    useEffect(() => {
        calculateWindowStatus();
        loadChildren();

        // Update window status every minute
        const interval = setInterval(calculateWindowStatus, 60000);
        return () => clearInterval(interval);
    }, [event.id]);

    const calculateWindowStatus = () => {
        if (!event.start_time) return;

        const now = new Date();
        const scheduledTime = new Date(event.start_time);
        const beforeMinutes = event.check_in_window_before_minutes || 30;
        const afterMinutes = event.check_in_window_after_minutes || 30;

        const windowStart = new Date(scheduledTime.getTime() - beforeMinutes * 60000);
        const windowEnd = new Date(scheduledTime.getTime() + afterMinutes * 60000);

        const isWithinWindow = now >= windowStart && now <= windowEnd;
        const isBeforeWindow = now < windowStart;

        // Calculate minutes
        const diffMs = windowStart.getTime() - now.getTime();
        const minutesUntil = Math.max(0, Math.ceil(diffMs / 60000));

        const remainingMs = windowEnd.getTime() - now.getTime();
        const minutesRemaining = Math.max(0, Math.ceil(remainingMs / 60000));

        setWindowStatus({
            is_within_window: isWithinWindow,
            minutes_until_window: minutesUntil,
            minutes_remaining: minutesRemaining,
            is_before_window: isBeforeWindow
        });
    };

    const loadChildren = async () => {
        if (!event.family_file_id && !event.case_id) return;

        // Logic to fetch children - relies on family file ID (preferred) or case ID
        // We'll reuse logic from original component but adapt for event props
        const fileId = event.family_file_id || event.case_id; // Fallback
        if (!fileId) return;

        try {
            // We'll try fetching from family file API first if we have an ID that looks like it
            // Note: The API call might depend on what ID we actually have.
            // For now, assuming familyFilesAPI.getChildren works if passed a valid container ID
            // If not, we might need casesAPI. 
            // Let's assume family_file_id is present if this is a modern event.
            if (event.family_file_id) {
                const result = await familyFilesAPI.getChildren(event.family_file_id);
                setChildren(result.items || []);
            }
        } catch (err) {
            console.log('Could not load children:', err);
        }
    };

    const handleCheckIn = async () => {
        setIsCheckingIn(true);
        setCheckInError(null);

        try {
            // Get fresh GPS position
            const pos = await getCurrentPosition();

            // Call Check-in endpoint
            await scheduleAPI.checkIn({
                event_id: event.id,
                parent_role: parentRole,
                check_in_method: 'gps',
                location_lat: pos.latitude,
                location_lng: pos.longitude,
                notes: notes || undefined,
                children_present: event.child_ids || [], // Assume all children linked to event are present for now
            });

            setCheckInSuccess(true);
            onCheckInComplete?.();
        } catch (err: any) {
            if (err.message) {
                setCheckInError(err.message);
            } else {
                setCheckInError('Failed to check in. Please try again.');
            }
        } finally {
            setIsCheckingIn(false);
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const formatMinutesHumanReadable = (totalMinutes: number) => {
        const mins = Math.round(totalMinutes);
        if (mins < 60) {
            return `${mins} minute${mins !== 1 ? 's' : ''}`;
        }
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        const hourStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
        if (remainingMins === 0) {
            return hourStr;
        }
        return `${hourStr} ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
    };

    // Success state
    if (checkInSuccess) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md max-h-[90vh] bg-background flex flex-col">
                    <CardContent className="p-6 overflow-y-auto">
                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>

                            <h2 className="text-xl font-bold text-foreground mb-2">Check-in Successful</h2>

                            <p className="text-muted-foreground mb-4">
                                You have successfully checked in for this event.
                                {event.qr_confirmation_required && " QR Confirmation logic is not fully active for standard events yet."}
                            </p>

                            <Button onClick={onClose} variant="outline" className="w-full">
                                Close
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] bg-background flex flex-col">
                <CardContent className="p-6 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-6 w-6 text-blue-600" />
                            <h2 className="text-xl font-bold text-foreground">Silent Handoff Check-in</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <XCircle className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Event Info */}
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3 border border-slate-200 shadow-sm">
                        <p className="font-semibold text-foreground text-lg">{event.title}</p>
                        {event.location && (
                            <p className="text-sm text-foreground flex items-center gap-2">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                {event.location}
                            </p>
                        )}
                        <p className="text-sm text-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0 text-blue-500" />
                            {formatTime(event.start_time)}
                        </p>
                    </div>

                    {/* Window Status */}
                    {windowStatus && (
                        <div className="mb-6">
                            {windowStatus.is_within_window ? (
                                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
                                    <p className="text-green-800 dark:text-green-300 font-medium">
                                        Check-in window is open
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        {formatMinutesHumanReadable(windowStatus.minutes_remaining)} remaining
                                    </p>
                                </div>
                            ) : windowStatus.is_before_window ? (
                                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
                                    <p className="text-amber-800 dark:text-amber-300 font-medium">
                                        Check-in window opens soon
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        In {formatMinutesHumanReadable(windowStatus.minutes_until_window)}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
                                    <p className="text-red-800 dark:text-red-300 font-medium">
                                        Check-in window has closed
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Geolocation Support */}
                    {!isSupported && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-6">
                            <p className="text-red-800 dark:text-red-300">
                                GPS location is not supported in your browser.
                            </p>
                        </div>
                    )}

                    {/* GPS Error */}
                    {geoError && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-6">
                            <p className="text-red-800 dark:text-red-300">{geoError.message}</p>
                        </div>
                    )}

                    {/* Check-in Error */}
                    {checkInError && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-6">
                            <p className="text-red-800 dark:text-red-300">{checkInError}</p>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any notes about this check-in..."
                            rows={2}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
                        <p className="text-sm text-slate-600">
                            <strong>Privacy:</strong> Your GPS location is captured only at this moment for verification.
                            No continuous tracking or location history is recorded.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCheckIn}
                                disabled={!isSupported || isCheckingIn || geoLoading || (windowStatus !== null && !windowStatus.is_within_window)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                                {isCheckingIn || geoLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Getting Location...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="h-4 w-4 mr-2" />
                                        Check In with GPS
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Dev/Test Mode: Use event location for testing */}
                        {process.env.NODE_ENV === 'development' && event.location_lat && event.location_lng && (
                            <Button
                                onClick={async () => {
                                    setIsCheckingIn(true);
                                    setCheckInError(null);
                                    try {
                                        await scheduleAPI.checkIn({
                                            event_id: event.id,
                                            parent_role: parentRole,
                                            check_in_method: 'gps',
                                            location_lat: event.location_lat! + (Math.random() * 0.0001 - 0.00005),
                                            location_lng: event.location_lng! + (Math.random() * 0.0001 - 0.00005),
                                            children_present: [],
                                            notes: notes ? `[TEST] ${notes}` : '[TEST] Simulated event check-in',
                                        });
                                        setCheckInSuccess(true);
                                        onCheckInComplete?.();
                                    } catch (err: any) {
                                        setCheckInError(err.message || 'Failed to check in');
                                    } finally {
                                        setIsCheckingIn(false);
                                    }
                                }}
                                disabled={isCheckingIn || (windowStatus !== null && !windowStatus.is_within_window)}
                                variant="outline"
                                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                                🧪 Test: Check In at Event Location
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

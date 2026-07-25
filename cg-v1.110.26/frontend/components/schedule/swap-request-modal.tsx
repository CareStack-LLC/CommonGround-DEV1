'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeftRight, MapPin, Clock, Navigation, Loader2 } from 'lucide-react';
import {
    exchangesAPI,
    casesAPI,
    familyFilesAPI,
    CreateCustodyExchangeRequest,
    ExchangeType,
    Child,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface SwapRequestModalProps {
    caseId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SwapRequestModal({
    caseId,
    onClose,
    onSuccess,
}: SwapRequestModalProps) {
    const [children, setChildren] = useState<Child[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingChildren, setIsLoadingChildren] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        scheduled_time: '',
        location: '',
        location_notes: '',
        location_lat: null as number | null,
        location_lng: null as number | null,
        child_directions: {} as Record<string, 'pickup' | 'dropoff' | 'none'>,
        reason: '',
        // Grace period for check-in (minutes before flagged as late)
        grace_period_minutes: 15,
    });

    const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);

    useEffect(() => {
        loadChildren();
    }, [caseId]);

    const loadChildren = async () => {
        setIsLoadingChildren(true);
        try {
            // Try family file API first, then fall back to case
            let loadedChildren: Child[] = [];
            try {
                const familyFileChildren = await familyFilesAPI.getChildren(caseId);
                loadedChildren = (familyFileChildren.items || []).map(fc => ({
                    id: fc.id,
                    first_name: fc.first_name,
                    last_name: fc.last_name,
                    date_of_birth: fc.date_of_birth,
                    gender: fc.gender || '',
                }));
            } catch {
                try {
                    const caseData = await casesAPI.get(caseId);
                    loadedChildren = caseData.children || [];
                } catch {
                    console.log('Could not load children');
                }
            }
            setChildren(loadedChildren);
        } catch (err: any) {
            console.error('Error loading children:', err);
        } finally {
            setIsLoadingChildren(false);
        }
    };

    const handleGeocodeAddress = async () => {
        if (!formData.location.trim()) {
            setGeocodeError('Please enter an address first');
            return;
        }

        setIsGeocodingAddress(true);
        setGeocodeError(null);

        try {
            const result = await exchangesAPI.geocodeAddress(formData.location);
            setFormData(prev => ({
                ...prev,
                location: result.formatted_address,
                location_lat: result.latitude,
                location_lng: result.longitude,
            }));
        } catch (err: any) {
            setGeocodeError(err.message || 'Failed to verify address');
        } finally {
            setIsGeocodingAddress(false);
        }
    };

    const setChildDirection = (childId: string, direction: 'pickup' | 'dropoff' | 'none') => {
        setFormData(prev => ({
            ...prev,
            child_directions: {
                ...prev.child_directions,
                [childId]: direction,
            },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Validate location
            if (!formData.location.trim()) {
                throw new Error('Location is required for swap requests');
            }

            // Validate reason
            if (!formData.reason.trim()) {
                throw new Error('Please provide a reason for the swap');
            }

            // Build pickup/dropoff child lists from child_directions
            const pickupChildIds: string[] = [];
            const dropoffChildIds: string[] = [];

            for (const [childId, direction] of Object.entries(formData.child_directions)) {
                if (direction === 'pickup') {
                    pickupChildIds.push(childId);
                } else if (direction === 'dropoff') {
                    dropoffChildIds.push(childId);
                }
            }

            // Validate at least one child is selected
            if (pickupChildIds.length === 0 && dropoffChildIds.length === 0) {
                throw new Error('Please select at least one child for pickup or dropoff');
            }

            // Derive exchange_type from selections
            let exchangeType: ExchangeType;
            if (pickupChildIds.length > 0 && dropoffChildIds.length > 0) {
                exchangeType = 'both';
            } else if (pickupChildIds.length > 0) {
                exchangeType = 'pickup';
            } else {
                exchangeType = 'dropoff';
            }

            const allChildIds = [...new Set([...pickupChildIds, ...dropoffChildIds])];

            const exchangeData: CreateCustodyExchangeRequest = {
                case_id: caseId,
                exchange_type: exchangeType,
                is_swap: true,
                swap_reason: formData.reason,
                title: `Swap: ${formData.reason.substring(0, 50)}`,
                child_ids: allChildIds,
                pickup_child_ids: pickupChildIds.length > 0 ? pickupChildIds : undefined,
                dropoff_child_ids: dropoffChildIds.length > 0 ? dropoffChildIds : undefined,
                location: formData.location,
                location_notes: formData.location_notes || undefined,
                scheduled_time: new Date(formData.scheduled_time).toISOString(),
                is_recurring: false, // Swaps are always one-time
                // Silent Handoff — always enabled for swaps
                silent_handoff_enabled: true,
                location_lat: formData.location_lat || undefined,
                location_lng: formData.location_lng || undefined,
                geofence_radius_meters: 100,
                check_in_window_before_minutes: formData.grace_period_minutes,
                check_in_window_after_minutes: formData.grace_period_minutes + 10,
                qr_confirmation_required: false,
            };

            await exchangesAPI.create(exchangeData);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to submit swap request');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border shadow-xl rounded-2xl">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-[var(--portal-primary)]" />
                            Request Schedule Swap
                        </h2>
                        <button aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Children Selection with Direction */}
                        {isLoadingChildren ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading children...</span>
                            </div>
                        ) : children.length > 0 ? (
                            <div className="p-4 bg-cg-amber-subtle rounded-xl border border-cg-amber/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-cg-amber/20 flex items-center justify-center">
                                        <ArrowLeftRight className="h-4 w-4 text-cg-amber" />
                                    </div>
                                    <div>
                                        <Label className="text-foreground font-semibold">Children Involved *</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Select Drop Off or Pick Up for each child
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {children.map((child) => (
                                        <div key={child.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-cg-sage/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-bold text-cg-sage">
                                                    {child.first_name.charAt(0)}
                                                </span>
                                            </div>
                                            <span className="font-medium text-foreground min-w-[60px] truncate">
                                                {child.first_name}
                                            </span>
                                            <div className="flex gap-2 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setChildDirection(child.id, formData.child_directions[child.id] === 'dropoff' ? 'none' : 'dropoff')}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${formData.child_directions[child.id] === 'dropoff'
                                                        ? 'bg-cg-slate text-white shadow-md'
                                                        : 'bg-cg-slate-subtle text-cg-slate hover:bg-cg-slate/20 border border-cg-slate/30'
                                                    }`}
                                                >
                                                    Drop Off
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setChildDirection(child.id, formData.child_directions[child.id] === 'pickup' ? 'none' : 'pickup')}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 ${formData.child_directions[child.id] === 'pickup'
                                                        ? 'bg-cg-sage text-white shadow-md'
                                                        : 'bg-cg-sage-subtle text-cg-sage hover:bg-cg-sage/20 border border-cg-sage/30'
                                                    }`}
                                                >
                                                    Pick Up
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-cg-amber-subtle border border-cg-amber/30 rounded-lg">
                                <p className="text-sm text-[#E09520] dark:text-cg-amber">
                                    No children found. Please add children to your family file first.
                                </p>
                            </div>
                        )}

                        {/* Date & Time */}
                        <div>
                            <Label htmlFor="scheduled_time" className="text-foreground">
                                <Clock className="inline h-4 w-4 mr-1" />
                                Date & Time *
                            </Label>
                            <Input
                                id="scheduled_time"
                                type="datetime-local"
                                value={formData.scheduled_time}
                                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                required
                                className="mt-1"
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                When you want the swap to happen
                            </p>
                        </div>

                        {/* Location */}
                        <div>
                            <Label htmlFor="location" className="text-foreground">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Location *
                            </Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value, location_lat: null, location_lng: null })}
                                    placeholder="e.g., School parking lot, 123 Main St"
                                    className="flex-1"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGeocodeAddress}
                                    disabled={isGeocodingAddress || !formData.location.trim()}
                                    className="flex-shrink-0"
                                >
                                    {isGeocodingAddress ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Navigation className="h-4 w-4" />
                                    )}
                                    <span className="ml-1 hidden sm:inline">Verify</span>
                                </Button>
                            </div>
                            {formData.location_lat && formData.location_lng && (
                                <p className="text-xs text-cg-sage-dark mt-1">
                                    ✓ Address verified — GPS: {formData.location_lat.toFixed(4)}, {formData.location_lng.toFixed(4)}
                                </p>
                            )}
                            {geocodeError && (
                                <p className="text-xs text-destructive mt-1">{geocodeError}</p>
                            )}
                            <Input
                                id="location_notes"
                                value={formData.location_notes}
                                onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
                                placeholder="Additional location notes (optional)"
                                className="mt-2"
                            />
                        </div>

                        {/* Grace Period */}
                        <div>
                            <Label htmlFor="grace_period" className="text-foreground">
                                <Clock className="inline h-4 w-4 mr-1" />
                                Grace Period (minutes)
                            </Label>
                            <Input
                                id="grace_period"
                                type="number"
                                min={5}
                                max={120}
                                value={formData.grace_period_minutes}
                                onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 15 })}
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Time to wait before flagging as late. After grace period + 10 min, parent is flagged as no-show.
                            </p>
                        </div>

                        {/* GPS Check-in Info */}
                        <div className="p-4 bg-cg-sage/10 rounded-lg border border-cg-sage/20">
                            <div className="flex items-start gap-2.5">
                                <Navigation className="h-4 w-4 text-cg-sage mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">GPS Check-in Enabled</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Both parents are verified via GPS when they arrive at the swap location within a 100m radius.
                                        The check-in window uses the grace period above. If a parent doesn&apos;t arrive in time they&apos;re flagged as late, then as a no-show after an additional 10 minutes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <Label htmlFor="reason" className="text-foreground">Reason for Swap *</Label>
                            <Input
                                id="reason"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                                placeholder="e.g., Work conflict, Special event, Doctor appointment"
                                className="mt-1"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                            <Button type="button" onClick={onClose} variant="outline" className="sm:flex-shrink-0">
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-[var(--portal-primary)] hover:bg-cg-slate"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Swap Request'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}

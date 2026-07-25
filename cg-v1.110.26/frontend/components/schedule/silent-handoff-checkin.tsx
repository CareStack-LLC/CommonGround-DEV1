'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, XCircle, Loader2, Navigation, Users, Package, ArrowDown, ArrowUp, Hand, AlertTriangle } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';
import {
  exchangesAPI,
  familyFilesAPI,
  CustodyExchangeInstance,
  WindowStatusResponse,
  FamilyFileChild,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

// Dynamically import GeofenceMap to avoid SSR issues with Mapbox
const GeofenceMap = dynamic(() => import('./geofence-map'), { ssr: false });

interface SilentHandoffCheckInProps {
  instance: CustodyExchangeInstance;
  familyFileId?: string;
  onCheckInComplete?: (instance: CustodyExchangeInstance) => void;
  onClose: () => void;
}

export default function SilentHandoffCheckIn({
  instance,
  familyFileId,
  onCheckInComplete,
  onClose,
}: SilentHandoffCheckInProps) {
  const { position, error: geoError, isLoading: geoLoading, getCurrentPosition, isSupported } = useGeolocation();
  const [windowStatus, setWindowStatus] = useState<WindowStatusResponse | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<CustodyExchangeInstance | null>(null);
  const [notes, setNotes] = useState('');
  const [children, setChildren] = useState<FamilyFileChild[]>([]);
  const [isWithMe, setIsWithMe] = useState(false);
  const [withMeSuccess, setWithMeSuccess] = useState(false);

  const exchange = instance.exchange;
  const hasSilentHandoff = exchange?.silent_handoff_enabled;
  const hasGeofence = exchange?.location_lat != null && exchange?.location_lng != null;

  // Get the viewer's role in this exchange (pickup or dropoff from their perspective)
  const viewerRole = exchange?.viewer_role;

  // Get children involved in this exchange - use viewer-perspective IDs
  // These are adjusted based on who is viewing, so the current user's actions are shown correctly
  const pickupChildren = children.filter(c => exchange?.viewer_pickup_child_ids?.includes(c.id));
  const dropoffChildren = children.filter(c => exchange?.viewer_dropoff_child_ids?.includes(c.id));
  const hasChildren = pickupChildren.length > 0 || dropoffChildren.length > 0;

  // Get display title based on viewer's role
  const getExchangeTitle = () => {
    if (viewerRole === 'pickup') return 'Pickup';
    if (viewerRole === 'dropoff') return 'Dropoff';
    if (viewerRole === 'both') return 'Exchange';
    return exchange?.title || 'Exchange';
  };

  useEffect(() => {
    loadWindowStatus();
    loadChildren();
  }, [instance.id]);

  const loadWindowStatus = async () => {
    try {
      const status = await exchangesAPI.getWindowStatus(instance.id);
      setWindowStatus(status);
    } catch (err: any) {
      console.error('Failed to load window status:', err);
    }
  };

  const loadChildren = async () => {
    // Try to load children from family file
    const fileId = familyFileId || exchange?.case_id;
    if (!fileId) return;

    try {
      const result = await familyFilesAPI.getChildren(fileId);
      setChildren(result.items || []);
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

      // Call GPS check-in endpoint
      const result = await exchangesAPI.checkInWithGPS(instance.id, {
        latitude: pos.latitude,
        longitude: pos.longitude,
        device_accuracy_meters: pos.accuracy,
        notes: notes || undefined,
      });

      setCheckInSuccess(result);
      onCheckInComplete?.(result);
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

  const handleWithMe = async () => {
    if (!familyFileId) {
      setCheckInError('Family file not found. Cannot record override.');
      return;
    }

    setIsWithMe(true);
    setCheckInError(null);

    try {
      // Get all children IDs from this exchange
      const allChildIds = [
        ...(exchange?.viewer_pickup_child_ids || []),
        ...(exchange?.viewer_dropoff_child_ids || []),
      ];

      if (allChildIds.length === 0) {
        setCheckInError('No children found for this exchange.');
        setIsWithMe(false);
        return;
      }

      await familyFilesAPI.overrideCustody(familyFileId, allChildIds, notes || 'Manual check-in via Silent Handoff');
      setWithMeSuccess(true);
    } catch (err: any) {
      setCheckInError(err.message || 'Failed to record custody override.');
    } finally {
      setIsWithMe(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDistance = (meters?: number) => {
    if (meters == null) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatMinutesHumanReadable = (totalMinutes: number) => {
    const mins = Math.round(totalMinutes);
    if (mins < 1) return 'less than a minute';

    const months = Math.floor(mins / (30 * 24 * 60));
    const weeks = Math.floor((mins % (30 * 24 * 60)) / (7 * 24 * 60));
    const days = Math.floor((mins % (7 * 24 * 60)) / (24 * 60));
    const hours = Math.floor((mins % (24 * 60)) / 60);
    const remainingMins = mins % 60;

    const parts: string[] = [];
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (weeks > 0) parts.push(`${weeks} week${weeks !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (remainingMins > 0) parts.push(`${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`);

    return parts.join(', ');
  };

  // Success state
  if (checkInSuccess) {
    const isInGeofence = checkInSuccess.from_parent_in_geofence || checkInSuccess.to_parent_in_geofence;
    const distance = checkInSuccess.from_parent_distance_meters ?? checkInSuccess.to_parent_distance_meters;
    const bothCheckedIn = checkInSuccess.from_parent_checked_in && checkInSuccess.to_parent_checked_in;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md max-h-[90vh] bg-background flex flex-col">
          <CardContent className="p-6 overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-cg-sage-subtle dark:bg-foreground/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-cg-sage-dark" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">Check-in Successful</h2>

              {hasGeofence && (
                <div className="mb-4 space-y-3">
                  {isInGeofence ? (
                    <Badge variant="default" className="bg-cg-sage-dark">
                      Within geofence ({formatDistance(distance)})
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-cg-amber-subtle text-[#E09520] dark:bg-foreground/30 dark:text-cg-amber">
                      Outside geofence ({formatDistance(distance)})
                    </Badge>
                  )}

                  {/* Map showing check-in position */}
                  {exchange?.location_lat && exchange?.location_lng && (
                    <GeofenceMap
                      center={{ lat: exchange.location_lat, lng: exchange.location_lng }}
                      radiusMeters={exchange.geofence_radius_meters || 100}
                      parentPositions={[
                        ...(checkInSuccess.from_parent_check_in_lat && checkInSuccess.from_parent_check_in_lng ? [{
                          lat: checkInSuccess.from_parent_check_in_lat,
                          lng: checkInSuccess.from_parent_check_in_lng,
                          name: exchange.other_parent_name || 'Parent A',
                          inGeofence: checkInSuccess.from_parent_in_geofence || false,
                        }] : []),
                        ...(checkInSuccess.to_parent_check_in_lat && checkInSuccess.to_parent_check_in_lng ? [{
                          lat: checkInSuccess.to_parent_check_in_lat,
                          lng: checkInSuccess.to_parent_check_in_lng,
                          name: 'You',
                          inGeofence: checkInSuccess.to_parent_in_geofence || false,
                        }] : []),
                      ]}
                      height="180px"
                      interactive
                    />
                  )}
                </div>
              )}

              <p className="text-muted-foreground mb-4">
                {bothCheckedIn
                  ? 'Both parents have checked in. Exchange complete!'
                  : 'Waiting for other parent to check in.'}
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
              <Navigation className="h-6 w-6 text-cg-sage" />
              <h2 className="text-xl font-bold text-foreground">Silent Handoff Check-in</h2>
            </div>
            <button aria-label="Close"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Exchange Info */}
          <div className="bg-cg-cream rounded-xl p-4 mb-6 space-y-3 border border-cg-sand-dark shadow-sm">
            <p className="font-semibold text-foreground text-lg">{getExchangeTitle()}</p>
            {exchange?.other_parent_name && (
              <p className="text-sm text-muted-foreground">
                with {exchange.other_parent_name}
              </p>
            )}
            {exchange?.location && (
              <p className="text-sm text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-cg-sage" />
                {exchange.location}
              </p>
            )}
            <p className="text-sm text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0 text-cg-sage" />
              {formatTime(instance.scheduled_time)}
            </p>

            {/* Children involved */}
            {hasChildren && (
              <div className="pt-3 border-t border-cg-sand-dark">
                <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 flex-shrink-0 text-cg-amber" />
                  Children
                </p>
                <div className="space-y-2">
                  {dropoffChildren.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dropoffChildren.map(child => (
                        <Badge key={child.id} className="bg-cg-slate text-white px-3 py-1">
                          <ArrowUp className="h-3 w-3 mr-1.5" />
                          {child.first_name}
                          <span className="ml-1.5 opacity-80 text-xs">drop off</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {pickupChildren.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pickupChildren.map(child => (
                        <Badge key={child.id} className="bg-cg-sage text-white px-3 py-1">
                          <ArrowDown className="h-3 w-3 mr-1.5" />
                          {child.first_name}
                          <span className="ml-1.5 opacity-80 text-xs">pick up</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items to bring (Cubbie items) */}
            {exchange?.items_to_bring && (
              <div className="pt-3 border-t border-cg-sand-dark">
                <p className="text-sm font-medium text-foreground flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 flex-shrink-0 text-cg-amber" />
                  Items
                </p>
                <p className="text-sm text-foreground pl-6">
                  {exchange.items_to_bring}
                </p>
              </div>
            )}
          </div>

          {/* Geofence Map */}
          {hasGeofence && exchange?.location_lat && exchange?.location_lng && (
            <div className="mb-6">
              <GeofenceMap
                center={{ lat: exchange.location_lat, lng: exchange.location_lng }}
                radiusMeters={exchange.geofence_radius_meters || 100}
                height="180px"
                interactive
              />
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                Geofence radius: {exchange.geofence_radius_meters || 100}m
              </p>
            </div>
          )}

          {/* Window Status */}
          {windowStatus && (
            <div className="mb-6 space-y-3">
              {windowStatus.is_within_window ? (
                <div className="bg-cg-sage-subtle dark:bg-foreground/30 border border-cg-sage-light dark:border-cg-sage-dark rounded-lg p-3">
                  <p className="text-foreground dark:text-cg-sage-light font-medium">
                    Check-in window is open
                  </p>
                  <p className="text-sm text-cg-sage-dark dark:text-cg-sage-light">
                    {formatMinutesHumanReadable(windowStatus.minutes_remaining)} remaining
                  </p>
                  <p className="text-xs text-cg-sage-dark/80 dark:text-cg-sage-light/80 mt-1">
                    You can check in now to confirm your arrival at the exchange location.
                  </p>
                </div>
              ) : windowStatus.is_before_window ? (
                <div className="bg-cg-amber-subtle dark:bg-foreground/30 border border-cg-amber dark:border-[#E09520] rounded-lg p-3">
                  <p className="text-[#E09520] dark:text-cg-amber font-medium">
                    Check-in window opens in {formatMinutesHumanReadable(windowStatus.minutes_until_window)}
                  </p>
                  <p className="text-xs text-[#E09520]/80 dark:text-cg-amber/80 mt-1">
                    The check-in window is a set time frame around your scheduled exchange when GPS check-in becomes available. You&apos;ll be able to confirm your arrival once the window opens.
                  </p>
                </div>
              ) : (
                <div className="bg-cg-error-subtle dark:bg-[#7A2222]/30 border border-[#FCA5A5] dark:border-[#9B2C2C] rounded-lg p-3">
                  <p className="text-[#9B2C2C] dark:text-[#FCA5A5] font-medium">
                    Check-in window has closed
                  </p>
                  <p className="text-xs text-[#9B2C2C]/80 dark:text-[#E06B6B]/80 mt-1">
                    The GPS check-in window has passed. You can still record this exchange using the &quot;Child is With Me&quot; button below.
                  </p>
                  {familyFileId && !withMeSuccess && (
                    <Button
                      onClick={handleWithMe}
                      disabled={isWithMe}
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full border-[#FCA5A5] text-[#9B2C2C] hover:bg-cg-error-subtle dark:border-[#9B2C2C] dark:text-[#E06B6B] dark:hover:bg-[#7A2222]/20"
                    >
                      {isWithMe ? (
                        <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Recording...</>
                      ) : (
                        <><Hand className="h-3 w-3 mr-1" /> Child is With Me</>
                      )}
                    </Button>
                  )}
                  {withMeSuccess && (
                    <div className="mt-2 flex items-center gap-1.5 text-cg-sage-dark dark:text-cg-sage-light">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Recorded! The other parent has been notified.</span>
                    </div>
                  )}
                </div>
              )}

              {/* What is the check-in window? - only show within 12 hours */}
              {windowStatus.minutes_until_window != null && windowStatus.minutes_until_window <= 720 && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-medium text-foreground mb-1">What is the check-in window?</p>
                  <p className="text-xs text-muted-foreground">
                    The check-in window is a scheduled time period before and after your custody exchange when you can use GPS to verify your arrival at the designated meeting point. Both parents check in to confirm the handoff happened on time and at the right place — creating a reliable record for everyone&apos;s peace of mind.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Geolocation Support */}
          {!isSupported && (
            <div className="bg-cg-error-subtle dark:bg-[#7A2222]/30 border border-[#FCA5A5] dark:border-[#9B2C2C] rounded-lg p-3 mb-6">
              <p className="text-[#9B2C2C] dark:text-[#FCA5A5]">
                GPS location is not supported in your browser.
              </p>
            </div>
          )}

          {/* GPS Error */}
          {geoError && (
            <div className="bg-cg-error-subtle dark:bg-[#7A2222]/30 border border-[#FCA5A5] dark:border-[#9B2C2C] rounded-lg p-3 mb-6">
              <p className="text-[#9B2C2C] dark:text-[#FCA5A5]">{geoError.message}</p>
            </div>
          )}

          {/* Check-in Error */}
          {checkInError && (
            <div className="bg-cg-error-subtle dark:bg-[#7A2222]/30 border border-[#FCA5A5] dark:border-[#9B2C2C] rounded-lg p-3 mb-6">
              <p className="text-[#9B2C2C] dark:text-[#FCA5A5]">{checkInError}</p>
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
          <div className="bg-cg-sage-subtle border border-cg-sage/30 rounded-lg p-3 mb-6">
            <p className="text-sm text-cg-sage-dark dark:text-cg-sage-light">
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
                className="flex-1 bg-cg-sage hover:bg-cg-sage-dark"
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

            {/* "With Me" secondary action — always available as fallback */}
            {familyFileId && !withMeSuccess && (
              <Button
                onClick={handleWithMe}
                disabled={isWithMe}
                variant="outline"
                className="w-full border-cg-amber/50 text-cg-amber-dark hover:bg-cg-amber/10"
              >
                {isWithMe ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Recording...</>
                ) : (
                  <><Hand className="h-4 w-4 mr-2" /> Child is With Me (Manual Override)</>
                )}
              </Button>
            )}
            {withMeSuccess && (
              <div className="flex items-center justify-center gap-2 p-2 bg-cg-sage-subtle dark:bg-foreground/20 rounded-lg border border-cg-sage-subtle dark:border-foreground">
                <CheckCircle className="h-4 w-4 text-cg-sage-dark" />
                <span className="text-sm font-medium text-cg-sage-dark dark:text-cg-sage-light">Custody override recorded. Other parent notified.</span>
              </div>
            )}

            {/* Dev/Test Mode: Use exchange location for testing */}
            {process.env.NODE_ENV === 'development' && hasGeofence && (
              <Button
                onClick={async () => {
                  setIsCheckingIn(true);
                  setCheckInError(null);
                  try {
                    // Use exchange location coordinates for testing
                    const result = await exchangesAPI.checkInWithGPS(instance.id, {
                      latitude: exchange!.location_lat! + (Math.random() * 0.0001 - 0.00005), // Small random offset
                      longitude: exchange!.location_lng! + (Math.random() * 0.0001 - 0.00005),
                      device_accuracy_meters: 10,
                      notes: notes ? `[TEST] ${notes}` : '[TEST] Simulated location check-in',
                    });
                    setCheckInSuccess(result);
                    onCheckInComplete?.(result);
                  } catch (err: any) {
                    setCheckInError(err.message || 'Failed to check in');
                  } finally {
                    setIsCheckingIn(false);
                  }
                }}
                disabled={isCheckingIn || (windowStatus !== null && !windowStatus.is_within_window)}
                variant="outline"
                className="w-full border-cg-amber text-[#E09520] hover:bg-cg-amber-subtle dark:border-[#E09520] dark:text-cg-amber dark:hover:bg-foreground/20"
              >
                🧪 Test: Check In at Exchange Location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

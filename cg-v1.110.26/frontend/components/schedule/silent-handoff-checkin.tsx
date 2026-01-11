'use client';

import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle, XCircle, Loader2, QrCode, Navigation, Users, Package, ArrowDown, ArrowUp } from 'lucide-react';
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

  // Success state
  if (checkInSuccess) {
    const isInGeofence = checkInSuccess.from_parent_in_geofence || checkInSuccess.to_parent_in_geofence;
    const distance = checkInSuccess.from_parent_distance_meters ?? checkInSuccess.to_parent_distance_meters;
    const bothCheckedIn = checkInSuccess.from_parent_checked_in && checkInSuccess.to_parent_checked_in;
    const needsQR = exchange?.qr_confirmation_required && bothCheckedIn && !checkInSuccess.qr_confirmed_at;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md max-h-[90vh] bg-background flex flex-col">
          <CardContent className="p-6 overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">Check-in Successful</h2>

              {hasGeofence && (
                <div className="mb-4">
                  {isInGeofence ? (
                    <Badge variant="default" className="bg-green-600">
                      Within geofence ({formatDistance(distance)})
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Outside geofence ({formatDistance(distance)})
                    </Badge>
                  )}
                </div>
              )}

              <p className="text-muted-foreground mb-4">
                {bothCheckedIn
                  ? needsQR
                    ? 'Both parents checked in. Scan QR code to complete.'
                    : 'Both parents have checked in. Exchange complete!'
                  : 'Waiting for other parent to check in.'}
              </p>

              {needsQR && (
                <Button onClick={() => window.location.reload()} className="mb-4">
                  <QrCode className="h-4 w-4 mr-2" />
                  View QR Code
                </Button>
              )}

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
            <button
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

          {/* Window Status */}
          {windowStatus && (
            <div className="mb-6">
              {windowStatus.is_within_window ? (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
                  <p className="text-green-800 dark:text-green-300 font-medium">
                    Check-in window is open
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {Math.round(windowStatus.minutes_remaining)} minutes remaining
                  </p>
                </div>
              ) : windowStatus.is_before_window ? (
                <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
                  <p className="text-amber-800 dark:text-amber-300 font-medium">
                    Check-in window opens soon
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    In {Math.round(windowStatus.minutes_until_window)} minutes
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
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
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

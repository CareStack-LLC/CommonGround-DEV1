'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Users, Calendar, Check, X as XIcon, HelpCircle, Stethoscope, GraduationCap, Trophy, RefreshCw, Smartphone, Gavel } from 'lucide-react';
import { eventsAPI, scheduleAPI, EventV2, EventAttendance, UpdateRSVPRequest, MedicalCategoryData, SchoolCategoryData, SportsCategoryData, ExchangeCategoryData, SwapResponseAction, ExchangeCheckIn } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import EventSilentHandoffCheckIn from './event-silent-handoff-checkin';

interface EventDetailsProps {
  event: EventV2;
  onClose: () => void;
  onRsvpUpdate?: () => void;
}

export default function EventDetails({
  event,
  onClose,
  onRsvpUpdate,
}: EventDetailsProps) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [currentRsvpStatus, setCurrentRsvpStatus] = useState<string>(
    event.my_attendance?.rsvp_status || 'no_response'
  );
  const [checkIns, setCheckIns] = useState<ExchangeCheckIn[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvpNote, setRsvpNote] = useState('');

  // Determine if user has already checked in
  const myCheckIn = checkIns.find(ci => ci.user_id === user?.id);

  useEffect(() => {
    loadAttendance();
    if (event.silent_handoff_enabled) {
      loadCheckIns();
    }
  }, [event.id, event.silent_handoff_enabled]);

  const loadCheckIns = async () => {
    try {
      const data = await scheduleAPI.getCheckIns(event.id);
      setCheckIns(data);
    } catch (err) {
      console.error('Error loading check-ins:', err);
    }
  };

  const loadAttendance = async () => {
    try {
      setIsLoading(true);
      const data = await eventsAPI.getAttendance(event.id);
      setAttendance(data);
    } catch (err: any) {
      console.error('Error loading attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRsvp = async (status: 'going' | 'not_going' | 'maybe') => {
    try {
      setIsUpdating(true);
      setError(null);

      const data: UpdateRSVPRequest = {
        rsvp_status: status,
        rsvp_note: rsvpNote || undefined,
      };

      await eventsAPI.updateRSVP(event.id, data);
      setCurrentRsvpStatus(status); // Update local state immediately
      await loadAttendance();
      onRsvpUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update RSVP');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSwapResponse = async (approved: boolean) => {
    try {
      setIsUpdating(true);
      setError(null);

      const action: SwapResponseAction = {
        approved,
        response_note: rsvpNote || undefined,
      };

      await eventsAPI.respondToSwap(event.id, action);
      onRsvpUpdate?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to respond to swap request');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Use local state for current RSVP (updated after API call)
  const currentRsvp = currentRsvpStatus;

  const getRsvpBadgeColor = (status: string) => {
    switch (status) {
      case 'going':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'not_going':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRsvpLabel = (status: string) => {
    switch (status) {
      case 'going':
        return 'Accepted';
      case 'not_going':
        return 'Rejected';
      case 'maybe':
        return 'Maybe';
      default:
        return 'No Response';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{event.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {event.is_owner && (
                  <span className="text-xs bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] px-2 py-0.5 rounded-full font-medium">
                    Your Event
                  </span>
                )}
                {(event.is_professional_event || event.professional_id) && (
                  <span className="text-xs bg-[var(--portal-secondary)]/10 text-[var(--portal-secondary)] px-2 py-0.5 rounded-full font-medium">
                    Professional Event
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Professional Event Info */}
          {(event.is_professional_event || event.professional_id) && (
            <div className="mb-4 p-3 bg-[var(--portal-secondary)]/5 border border-[var(--portal-secondary)]/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Gavel className="h-4 w-4 text-[var(--portal-secondary)]" />
                <span className="text-sm font-semibold text-foreground">
                  {event.professional_event_type
                    ? event.professional_event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : 'Professional Event'}
                </span>
              </div>
              {event.professional_name && (
                <p className="text-xs text-muted-foreground ml-6">
                  Added by: {event.professional_name}
                  {event.professional_role && ` (${event.professional_role})`}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Event Details */}
          <div className="space-y-4 mb-6">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium text-foreground">{formatDateTime(event.start_time)}</div>
                <div className="text-sm text-muted-foreground">
                  to {formatTime(event.end_time)}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-foreground">{event.location}</div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-foreground">{event.description}</p>
              </div>
            )}

            {/* Children */}
            {event.child_ids && event.child_ids.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  {event.child_ids.length} child{event.child_ids.length !== 1 ? 'ren' : ''} involved
                </div>
              </div>
            )}

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${event.visibility === 'private'
                ? 'bg-muted text-muted-foreground'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                {event.visibility === 'private' ? 'Private' : 'Shared with Co-parent'}
              </span>
            </div>

            {/* Category-specific details */}
            {event.event_category && event.event_category !== 'general' && event.category_data && (
              <div className={`p-3 rounded-lg border ${event.event_category === 'medical' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40' :
                event.event_category === 'school' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/40' :
                  event.event_category === 'sports' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/40' :
                    'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900/40'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  {event.event_category === 'medical' && <Stethoscope className="h-4 w-4" />}
                  {event.event_category === 'school' && <GraduationCap className="h-4 w-4" />}
                  {event.event_category === 'sports' && <Trophy className="h-4 w-4" />}
                  {event.event_category === 'exchange' && <RefreshCw className="h-4 w-4" />}
                  <span className="font-medium text-sm capitalize">
                    {event.event_category === 'medical' ? 'Medical Appointment' :
                      event.event_category === 'school' ? 'School Activity' :
                        event.event_category === 'sports' ? 'Sports/Recreation' :
                          'Custody Exchange'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  {event.event_category === 'medical' && (() => {
                    const data = event.category_data as MedicalCategoryData;
                    return (
                      <>
                        {data.provider_name && <p><span className="text-muted-foreground">Provider:</span> {data.provider_name}</p>}
                        {data.provider_specialty && <p><span className="text-muted-foreground">Specialty:</span> {data.provider_specialty}</p>}
                        {data.appointment_reason && <p><span className="text-muted-foreground">Reason:</span> {data.appointment_reason}</p>}
                        {data.address && <p><span className="text-muted-foreground">Address:</span> {data.address}</p>}
                        {data.phone && <p><span className="text-muted-foreground">Phone:</span> {data.phone}</p>}
                        {data.follow_up_needed && <p className="text-blue-700 dark:text-blue-400">Follow-up needed</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'school' && (() => {
                    const data = event.category_data as SchoolCategoryData;
                    return (
                      <>
                        {data.school_name && <p><span className="text-muted-foreground">School:</span> {data.school_name}</p>}
                        {data.activity_type && <p><span className="text-muted-foreground">Activity:</span> {data.activity_type}</p>}
                        {data.teacher_name && <p><span className="text-muted-foreground">Teacher:</span> {data.teacher_name}</p>}
                        {data.teacher_contact && <p><span className="text-muted-foreground">Contact:</span> {data.teacher_contact}</p>}
                        {data.is_required && <p className="text-green-700 dark:text-green-400">Required attendance</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'sports' && (() => {
                    const data = event.category_data as SportsCategoryData;
                    return (
                      <>
                        {data.activity_name && <p><span className="text-muted-foreground">Activity:</span> {data.activity_name}</p>}
                        {data.organization && <p><span className="text-muted-foreground">Organization:</span> {data.organization}</p>}
                        {data.coach_name && <p><span className="text-muted-foreground">Coach:</span> {data.coach_name}</p>}
                        {data.venue && <p><span className="text-muted-foreground">Venue:</span> {data.venue}</p>}
                        {data.equipment_needed && <p><span className="text-muted-foreground">Equipment:</span> {data.equipment_needed}</p>}
                        {data.cost && <p><span className="text-muted-foreground">Cost:</span> ${data.cost}</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'exchange' && (() => {
                    const data = event.category_data as ExchangeCategoryData;
                    return (
                      <>
                        {data.exchange_type && <p><span className="text-muted-foreground">Type:</span> {data.exchange_type}</p>}
                        {data.exchange_location && <p><span className="text-muted-foreground">Location:</span> {data.exchange_location}</p>}
                        {data.transition_from && <p><span className="text-muted-foreground">From:</span> {data.transition_from}</p>}
                        {data.transition_to && <p><span className="text-muted-foreground">To:</span> {data.transition_to}</p>}
                        {data.items_to_bring && <p><span className="text-muted-foreground">Items:</span> {data.items_to_bring}</p>}
                        {data.special_instructions && <p><span className="text-muted-foreground">Instructions:</span> {data.special_instructions}</p>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Silent Handoff Check-In */}
            {event.silent_handoff_enabled && (
              <div className="mt-4 p-3 bg-muted border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-sm text-foreground">Check-in Required</h3>
                  </div>
                  {myCheckIn && (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Checked In
                    </span>
                  )}
                </div>

                {myCheckIn ? (
                  <div className="text-sm text-muted-foreground">
                    <p>Checked in at {new Date(myCheckIn.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    {myCheckIn.location_lat && <p className="text-xs text-muted-foreground mt-1">Location verified via GPS</p>}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Please check in when you arrive at the location.
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => setShowCheckInModal(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Check In Now
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border pt-6">
            {/* Current RSVP Status */}
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-2">Your Response</h3>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${getRsvpBadgeColor(currentRsvp)}`}>
                {currentRsvp === 'going' && <Check className="h-4 w-4 mr-1" />}
                {currentRsvp === 'not_going' && <XIcon className="h-4 w-4 mr-1" />}
                {currentRsvp === 'maybe' && <HelpCircle className="h-4 w-4 mr-1" />}
                {getRsvpLabel(currentRsvp)}
              </div>
            </div>

            {/* RSVP Buttons / Swap Actions */}
            {!event.is_owner && (
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">
                  {event.event_type === 'swap_request' ? 'Respond to Request' : 'Update Your Response'}
                </h3>

                {/* Response Note */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={rsvpNote}
                    onChange={(e) => setRsvpNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {event.event_type === 'swap_request' ? (
                  /* Swap Actions */
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleSwapResponse(true)}
                      disabled={isUpdating || event.status !== 'pending'}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve Swap
                    </Button>
                    <Button
                      onClick={() => handleSwapResponse(false)}
                      disabled={isUpdating || event.status !== 'pending'}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      Deny Request
                    </Button>
                  </div>
                ) : (
                  /* RSVP Buttons */
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleRsvp('going')}
                      disabled={isUpdating}
                      className={`flex-1 ${currentRsvp === 'going'
                        ? 'bg-green-600 hover:bg-green-700'
                        : ''
                        }`}
                      variant={currentRsvp === 'going' ? 'default' : 'outline'}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleRsvp('maybe')}
                      disabled={isUpdating}
                      className={`flex-1 ${currentRsvp === 'maybe'
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : ''
                        }`}
                      variant={currentRsvp === 'maybe' ? 'default' : 'outline'}
                    >
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Maybe
                    </Button>
                    <Button
                      onClick={() => handleRsvp('not_going')}
                      disabled={isUpdating}
                      className={`flex-1 ${currentRsvp === 'not_going'
                        ? 'bg-red-600 hover:bg-red-700'
                        : ''
                        }`}
                      variant={currentRsvp === 'not_going' ? 'default' : 'outline'}
                    >
                      <XIcon className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Attendance List (for event owner) */}
            {event.is_owner && attendance.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-foreground mb-2">Responses</h3>
                <div className="space-y-2">
                  {attendance.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm text-foreground">Co-parent</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getRsvpBadgeColor(att.rsvp_status)}`}>
                        {getRsvpLabel(att.rsvp_status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="mt-6">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </Card>


      {/* Check-in Modal */}
      {
        showCheckInModal && (
          <EventSilentHandoffCheckIn
            event={event}
            onClose={() => setShowCheckInModal(false)}
            onCheckInComplete={() => {
              loadCheckIns();
              // Optional: close modal automatically or let user close it
            }}
          />
        )
      }
    </div >
  );
}

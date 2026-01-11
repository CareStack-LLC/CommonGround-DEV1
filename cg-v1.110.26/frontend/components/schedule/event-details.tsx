'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Users, Calendar, Check, X as XIcon, HelpCircle, Stethoscope, GraduationCap, Trophy, RefreshCw } from 'lucide-react';
import { eventsAPI, EventV2, EventAttendance, UpdateRSVPRequest, MedicalCategoryData, SchoolCategoryData, SportsCategoryData, ExchangeCategoryData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [currentRsvpStatus, setCurrentRsvpStatus] = useState<string>(
    event.my_attendance?.rsvp_status || 'no_response'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rsvpNote, setRsvpNote] = useState('');

  useEffect(() => {
    loadAttendance();
  }, [event.id]);

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
        return 'bg-green-100 text-green-800';
      case 'not_going':
        return 'bg-red-100 text-red-800';
      case 'maybe':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRsvpLabel = (status: string) => {
    switch (status) {
      case 'going':
        return 'Going';
      case 'not_going':
        return 'Not Going';
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
              <h2 className="text-xl font-bold">{event.title}</h2>
              {event.is_owner && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Your Event
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Event Details */}
          <div className="space-y-4 mb-6">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium">{formatDateTime(event.start_time)}</div>
                <div className="text-sm text-gray-600">
                  to {formatTime(event.end_time)}
                </div>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="text-gray-700">{event.location}</div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-700">{event.description}</p>
              </div>
            )}

            {/* Children */}
            {event.child_ids && event.child_ids.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="text-sm text-gray-600">
                  {event.child_ids.length} child{event.child_ids.length !== 1 ? 'ren' : ''} involved
                </div>
              </div>
            )}

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                event.visibility === 'private'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-green-100 text-green-700'
              }`}>
                {event.visibility === 'private' ? 'Private' : 'Shared with Co-parent'}
              </span>
            </div>

            {/* Category-specific details */}
            {event.event_category && event.event_category !== 'general' && event.category_data && (
              <div className={`p-3 rounded-lg border ${
                event.event_category === 'medical' ? 'bg-blue-50 border-blue-200' :
                event.event_category === 'school' ? 'bg-green-50 border-green-200' :
                event.event_category === 'sports' ? 'bg-orange-50 border-orange-200' :
                'bg-purple-50 border-purple-200'
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
                        {data.provider_name && <p><span className="text-gray-500">Provider:</span> {data.provider_name}</p>}
                        {data.provider_specialty && <p><span className="text-gray-500">Specialty:</span> {data.provider_specialty}</p>}
                        {data.appointment_reason && <p><span className="text-gray-500">Reason:</span> {data.appointment_reason}</p>}
                        {data.address && <p><span className="text-gray-500">Address:</span> {data.address}</p>}
                        {data.phone && <p><span className="text-gray-500">Phone:</span> {data.phone}</p>}
                        {data.follow_up_needed && <p className="text-blue-700">Follow-up needed</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'school' && (() => {
                    const data = event.category_data as SchoolCategoryData;
                    return (
                      <>
                        {data.school_name && <p><span className="text-gray-500">School:</span> {data.school_name}</p>}
                        {data.activity_type && <p><span className="text-gray-500">Activity:</span> {data.activity_type}</p>}
                        {data.teacher_name && <p><span className="text-gray-500">Teacher:</span> {data.teacher_name}</p>}
                        {data.teacher_contact && <p><span className="text-gray-500">Contact:</span> {data.teacher_contact}</p>}
                        {data.is_required && <p className="text-green-700">Required attendance</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'sports' && (() => {
                    const data = event.category_data as SportsCategoryData;
                    return (
                      <>
                        {data.activity_name && <p><span className="text-gray-500">Activity:</span> {data.activity_name}</p>}
                        {data.organization && <p><span className="text-gray-500">Organization:</span> {data.organization}</p>}
                        {data.coach_name && <p><span className="text-gray-500">Coach:</span> {data.coach_name}</p>}
                        {data.venue && <p><span className="text-gray-500">Venue:</span> {data.venue}</p>}
                        {data.equipment_needed && <p><span className="text-gray-500">Equipment:</span> {data.equipment_needed}</p>}
                        {data.cost && <p><span className="text-gray-500">Cost:</span> ${data.cost}</p>}
                      </>
                    );
                  })()}
                  {event.event_category === 'exchange' && (() => {
                    const data = event.category_data as ExchangeCategoryData;
                    return (
                      <>
                        {data.exchange_type && <p><span className="text-gray-500">Type:</span> {data.exchange_type}</p>}
                        {data.exchange_location && <p><span className="text-gray-500">Location:</span> {data.exchange_location}</p>}
                        {data.transition_from && <p><span className="text-gray-500">From:</span> {data.transition_from}</p>}
                        {data.transition_to && <p><span className="text-gray-500">To:</span> {data.transition_to}</p>}
                        {data.items_to_bring && <p><span className="text-gray-500">Items:</span> {data.items_to_bring}</p>}
                        {data.special_instructions && <p><span className="text-gray-500">Instructions:</span> {data.special_instructions}</p>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t pt-6">
            {/* Current RSVP Status */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Your Response</h3>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${getRsvpBadgeColor(currentRsvp)}`}>
                {currentRsvp === 'going' && <Check className="h-4 w-4 mr-1" />}
                {currentRsvp === 'not_going' && <XIcon className="h-4 w-4 mr-1" />}
                {currentRsvp === 'maybe' && <HelpCircle className="h-4 w-4 mr-1" />}
                {getRsvpLabel(currentRsvp)}
              </div>
            </div>

            {/* RSVP Buttons */}
            {!event.is_owner && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Update Your Response</h3>

                {/* RSVP Note */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={rsvpNote}
                    onChange={(e) => setRsvpNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                {/* RSVP Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleRsvp('going')}
                    disabled={isUpdating}
                    className={`flex-1 ${
                      currentRsvp === 'going'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                    }`}
                    variant={currentRsvp === 'going' ? 'default' : 'outline'}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Going
                  </Button>
                  <Button
                    onClick={() => handleRsvp('maybe')}
                    disabled={isUpdating}
                    className={`flex-1 ${
                      currentRsvp === 'maybe'
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
                    className={`flex-1 ${
                      currentRsvp === 'not_going'
                        ? 'bg-red-600 hover:bg-red-700'
                        : ''
                    }`}
                    variant={currentRsvp === 'not_going' ? 'default' : 'outline'}
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Can't Go
                  </Button>
                </div>
              </div>
            )}

            {/* Attendance List (for event owner) */}
            {event.is_owner && attendance.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Responses</h3>
                <div className="space-y-2">
                  {attendance.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm text-gray-700">Co-parent</span>
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
    </div>
  );
}

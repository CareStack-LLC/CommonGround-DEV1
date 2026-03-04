'use client';

import { useState } from 'react';
import { X, Gavel, MapPin, Video, Calendar, Clock, AlertTriangle, Check, XCircle, HelpCircle, User } from 'lucide-react';
import { CourtEventForCalendar, CourtEventWithRSVP, courtEventsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CourtEventDetailsProps {
  event: CourtEventForCalendar | CourtEventWithRSVP;
  onClose: () => void;
  onRsvpUpdate?: () => void;
}

export default function CourtEventDetails({
  event,
  onClose,
  onRsvpUpdate,
}: CourtEventDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'attending' | 'not_attending' | 'maybe' | null>(null);

  const handleRsvp = async (status: 'attending' | 'not_attending' | 'maybe') => {
    // If declining a mandatory event, require notes
    if (event.is_mandatory && status === 'not_attending' && !notes) {
      setSelectedStatus(status);
      setShowNotesInput(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await courtEventsAPI.rsvp(event.id, {
        status,
        notes: notes || undefined,
      });

      onRsvpUpdate?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNotesAndRsvp = async () => {
    if (selectedStatus) {
      await handleRsvp(selectedStatus);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEventTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      hearing: 'Court Hearing',
      mediation: 'Mediation Session',
      deadline: 'Deadline',
      review: 'Case Review',
      conference: 'Conference',
      other: 'Court Event',
    };
    return types[type] || type;
  };

  const getRsvpStatusDisplay = (status?: string) => {
    switch (status) {
      case 'attending':
        return { label: 'Attending', color: 'bg-green-100 text-green-800', icon: Check };
      case 'not_attending':
        return { label: 'Not Attending', color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'maybe':
        return { label: 'Maybe', color: 'bg-yellow-100 text-yellow-800', icon: HelpCircle };
      default:
        return { label: 'No Response', color: 'bg-gray-100 text-gray-600', icon: User };
    }
  };

  const currentRsvp = getRsvpStatusDisplay(event.my_rsvp_status);
  const otherParentRsvp = getRsvpStatusDisplay(event.other_parent_rsvp_status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Gavel className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getEventTypeLabel(event.event_type)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mandatory Badge */}
          {event.is_mandatory && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                This is a mandatory court event. Your attendance is required.
              </AlertDescription>
            </Alert>
          )}

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            {event.start_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          {(event.location || event.virtual_link) && (
            <div className="space-y-2">
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.virtual_link && (
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-gray-400" />
                  <a
                    href={event.virtual_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Join Virtual Meeting
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="font-medium mb-2">Details</h4>
              <p className="text-gray-600">{event.description}</p>
            </div>
          )}

          {/* Shared Notes from Court */}
          {event.shared_notes && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Notes from Court</h4>
              <p className="text-blue-800 text-sm">{event.shared_notes}</p>
            </div>
          )}

          {/* RSVP Status */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Response Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Your Response</p>
                <Badge className={currentRsvp.color}>
                  <currentRsvp.icon className="h-3 w-3 mr-1" />
                  {currentRsvp.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Other Parent</p>
                <Badge className={otherParentRsvp.color}>
                  <otherParentRsvp.icon className="h-3 w-3 mr-1" />
                  {otherParentRsvp.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Notes Input for declining mandatory events */}
          {showNotesInput && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Please provide a reason for not attending (required for mandatory events)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter your reason..."
                />
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={submitNotesAndRsvp}
                  disabled={!notes || isSubmitting}
                  variant="destructive"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Response'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotesInput(false);
                    setSelectedStatus(null);
                    setNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* RSVP Buttons */}
          {!showNotesInput && (
            <div className="space-y-3">
              <h4 className="font-medium">Update Your Response</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleRsvp('attending')}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 ${
                    event.my_rsvp_status === 'attending'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                  }`}
                  variant={event.my_rsvp_status === 'attending' ? 'default' : 'outline'}
                >
                  <Check className="h-4 w-4" />
                  I'll Attend
                </Button>
                <Button
                  onClick={() => handleRsvp('maybe')}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 ${
                    event.my_rsvp_status === 'maybe'
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                  variant={event.my_rsvp_status === 'maybe' ? 'default' : 'outline'}
                >
                  <HelpCircle className="h-4 w-4" />
                  Maybe
                </Button>
                <Button
                  onClick={() => handleRsvp('not_attending')}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 ${
                    event.my_rsvp_status === 'not_attending'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  variant={event.my_rsvp_status === 'not_attending' ? 'default' : 'outline'}
                >
                  <XCircle className="h-4 w-4" />
                  Can't Attend
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Navigation, QrCode, Loader2 } from 'lucide-react';
import {
  eventsAPI,
  exchangesAPI,
  casesAPI,
  CreateEventRequest,
  ConflictWarning,
  Child,
  EventCategory,
  CategoryData,
  MedicalCategoryData,
  SchoolCategoryData,
  SportsCategoryData,
  ExchangeCategoryData,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MedicalFields, SchoolFields, SportsFields, ExchangeFields } from './categories';

interface EventFormProps {
  caseId: string;
  agreementId?: string;  // Link event to specific SharedCare Agreement
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

export default function EventForm({
  caseId,
  agreementId,
  onClose,
  onSuccess,
  initialDate,
}: EventFormProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    start_time: initialDate ? formatDateTime(initialDate) : '',
    end_time: '',
    all_day: false,
    child_ids: [] as string[],
    description: '',
    location: '',
    location_shared: false,
    visibility: 'co_parent' as 'private' | 'co_parent',
    event_category: 'general' as EventCategory,
    category_data: {} as CategoryData,
    // Silent Handoff
    silent_handoff_enabled: false,
    location_lat: undefined as number | undefined,
    location_lng: undefined as number | undefined,
    geofence_radius_meters: 100,
    check_in_window_before_minutes: 30,
    check_in_window_after_minutes: 30,
    qr_confirmation_required: false,
    sync_to_kidspace: false,
  });

  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [caseId]);

  // Check for conflicts when times change
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      checkConflicts();
    }
  }, [formData.start_time, formData.end_time]);

  const loadInitialData = async () => {
    try {
      // Load children
      const caseData = await casesAPI.get(caseId);
      setChildren(caseData.children || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    }
  };

  const checkConflicts = async () => {
    if (!formData.start_time || !formData.end_time) return;

    try {
      setIsChecking(true);
      const result = await eventsAPI.checkConflicts(
        caseId,
        new Date(formData.start_time).toISOString(),
        new Date(formData.end_time).toISOString()
      );

      setConflicts(result.conflicts);
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.location) return;

    try {
      setIsGeocoding(true);
      const result = await exchangesAPI.geocodeAddress(formData.location);
      if (result && result.latitude && result.longitude) {
        setFormData(prev => ({
          ...prev,
          location_lat: result.latitude,
          location_lng: result.longitude
        }));
      }
    } catch (err) {
      console.error('Failed to geocode address:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const eventData: CreateEventRequest = {
        title: formData.title,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        child_ids: formData.child_ids,
        description: formData.description || undefined,
        location: formData.location || undefined,
        location_shared: formData.location_shared,
        visibility: formData.visibility,
        all_day: formData.all_day,
        event_category: formData.event_category,
        category_data: Object.keys(formData.category_data).length > 0 ? formData.category_data : undefined,
        // Silent Handoff
        silent_handoff_enabled: formData.silent_handoff_enabled,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        geofence_radius_meters: formData.geofence_radius_meters,
        check_in_window_before_minutes: formData.check_in_window_before_minutes,
        check_in_window_after_minutes: formData.check_in_window_after_minutes,
        qr_confirmation_required: formData.qr_confirmation_required,
        sync_to_kidspace: formData.sync_to_kidspace || undefined,
      };

      await eventsAPI.create(eventData);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
      console.error('Error creating event:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChild = (childId: string) => {
    setFormData(prev => ({
      ...prev,
      child_ids: prev.child_ids.includes(childId)
        ? prev.child_ids.filter(id => id !== childId)
        : [...prev.child_ids, childId],
    }));
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Create Event</DialogTitle>
        </DialogHeader>

        <div className="py-2">

          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* ARIA Conflict Warnings */}
          {conflicts.length > 0 && (
            <div className="mb-4 bg-[var(--cg-warning-subtle)] border border-[var(--cg-warning)]/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-[var(--cg-warning)] mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-2">Scheduling Conflict</p>
                  {conflicts.map((conflict, i) => (
                    <div key={i} className="text-sm text-muted-foreground mb-2">
                      <p>{conflict.message}</p>
                      <p className="text-xs mt-1">{conflict.suggestion}</p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">
                    You can still create this event, but consider choosing a different time.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Category */}
            <div>
              <Label htmlFor="event_category">Event Type</Label>
              <select
                id="event_category"
                value={formData.event_category}
                onChange={(e) => setFormData({
                  ...formData,
                  event_category: e.target.value as EventCategory,
                  category_data: {} // Reset category data when type changes
                })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-card text-foreground"
              >
                <option value="general">General Event</option>
                <option value="medical">Medical/Doctor Appointment</option>
                <option value="school">School Activity</option>
                <option value="sports">Sports/Recreation</option>
                <option value="exchange">Custody Exchange</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., School Play, Doctor Appointment"
                required
                className="mt-1"
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* All Day */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="all_day" className="cursor-pointer">
                All-day event
              </Label>
            </div>

            {/* Children */}
            {children.length > 0 && (
              <div>
                <Label>Children Involved</Label>
                <div className="mt-2 space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`child_${child.id}`}
                        checked={formData.child_ids.includes(child.id)}
                        onChange={() => toggleChild(child.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`child_${child.id}`} className="cursor-pointer">
                        {child.first_name} {child.last_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category-specific fields */}
            {formData.event_category === 'medical' && (
              <MedicalFields
                data={formData.category_data as MedicalCategoryData}
                onChange={(data) => setFormData({ ...formData, category_data: data })}
              />
            )}
            {formData.event_category === 'school' && (
              <SchoolFields
                data={formData.category_data as SchoolCategoryData}
                onChange={(data) => setFormData({ ...formData, category_data: data })}
              />
            )}
            {formData.event_category === 'sports' && (
              <SportsFields
                data={formData.category_data as SportsCategoryData}
                onChange={(data) => setFormData({ ...formData, category_data: data })}
              />
            )}
            {formData.event_category === 'exchange' && (
              <ExchangeFields
                data={formData.category_data as ExchangeCategoryData}
                onChange={(data) => setFormData({ ...formData, category_data: data })}
              />
            )}

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details about this event..."
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-card text-foreground"
              />
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                onChange={(e) => setFormData({
                  ...formData,
                  location: e.target.value,
                  // Reset geocoding if location changes
                  location_lat: undefined,
                  location_lng: undefined
                })}
                placeholder="e.g., School Auditorium"
                className="mt-1"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="location_shared"
                  checked={formData.location_shared}
                  onChange={(e) => setFormData({ ...formData, location_shared: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="location_shared" className="cursor-pointer text-sm">
                  Share location with co-parent
                </Label>
              </div>
            </div>

            {/* Silent Handoff Section */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    id="silent_handoff"
                    checked={formData.silent_handoff_enabled}
                    onChange={(e) => setFormData({ ...formData, silent_handoff_enabled: e.target.checked })}
                    className="rounded border-border text-[var(--portal-primary)] focus:ring-[var(--portal-primary)] h-5 w-5"
                  />
                </div>
                <div>
                  <Label htmlFor="silent_handoff" className="font-semibold text-foreground">Enable Silent Handoff</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    GPS-verified check-ins for custody exchanges. Location is captured only at check-in moment.
                  </p>
                </div>
              </div>

              {formData.silent_handoff_enabled && (
                <div className="mt-4 pl-8 space-y-4">
                  {/* Geolocation Status */}
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-foreground">Event Location GPS</Label>
                      {formData.location_lat && formData.location_lng ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium border border-green-200">
                          <Navigation className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Required
                        </span>
                      )}
                    </div>

                    {formData.location_lat && formData.location_lng && (
                      <div className="text-xs text-muted-foreground mb-3 font-mono bg-card p-2 rounded border border-border">
                        {formData.location_lat.toFixed(6)}, {formData.location_lng.toFixed(6)}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding || !formData.location}
                      className="w-full text-xs bg-card hover:bg-muted border-border text-foreground"
                    >
                      {isGeocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Navigation className="w-3.5 h-3.5 mr-2" />}
                      {formData.location_lat ? 'Update GPS Coordinates' : 'Verify Address for GPS'}
                    </Button>
                    {!formData.location && (
                      <p className="text-xs text-[var(--cg-warning)] mt-2">
                        Please enter a location address above first.
                      </p>
                    )}
                  </div>

                  {/* Geofence Radius */}
                  <div>
                    <Label htmlFor="geofence_radius" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Geofence Radius</Label>
                    <select
                      id="geofence_radius"
                      value={formData.geofence_radius_meters}
                      onChange={(e) => setFormData({ ...formData, geofence_radius_meters: parseInt(e.target.value) })}
                      className="w-full mt-1.5 text-sm border-border rounded-md shadow-sm bg-card text-foreground focus:border-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                    >
                      <option value="50">50m (Strict - Good for buildings)</option>
                      <option value="100">100m (Standard - Recommended)</option>
                      <option value="200">200m (Relaxed - Parks/Large venues)</option>
                      <option value="500">500m (Wide Area)</option>
                    </select>
                  </div>

                  {/* QR Code Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        id="qr_required"
                        checked={formData.qr_confirmation_required}
                        onChange={(e) => setFormData({ ...formData, qr_confirmation_required: e.target.checked })}
                        className="rounded border-border text-[var(--portal-primary)] focus:ring-[var(--portal-primary)] h-4 w-4"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="qr_required" className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer">
                        <QrCode className="w-4 h-4 text-muted-foreground" />
                        Require QR Code Check-in
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Co-parent must scan a code on your device to confirm transfer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visibility */}
            <div>
              <Label>Visibility</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="visibility_coparent"
                    name="visibility"
                    value="co_parent"
                    checked={formData.visibility === 'co_parent'}
                    onChange={(e) => setFormData({ ...formData, visibility: 'co_parent' })}
                    className="rounded-full"
                  />
                  <Label htmlFor="visibility_coparent" className="cursor-pointer">
                    <div className="font-medium">Shared with co-parent</div>
                    <div className="text-xs text-muted-foreground">Both parents can see this event</div>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="visibility_private"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={(e) => setFormData({ ...formData, visibility: 'private' })}
                    className="rounded-full"
                  />
                  <Label htmlFor="visibility_private" className="cursor-pointer">
                    <div className="font-medium">Private</div>
                    <div className="text-xs text-muted-foreground">Only you can see this event</div>
                  </Label>
                </div>
              </div>
            </div>

            {/* KidSpace Calendar Sync */}
            {formData.visibility === 'co_parent' && formData.child_ids.length > 0 && (
              <div className="p-4 bg-muted rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Sync to KidSpace Calendar</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      This event will appear on the selected children&apos;s KidSpace calendars
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.sync_to_kidspace}
                    onClick={() => setFormData({ ...formData, sync_to_kidspace: !formData.sync_to_kidspace })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.sync_to_kidspace ? 'bg-[var(--portal-primary)]' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.sync_to_kidspace ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="sm:flex-shrink-0"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

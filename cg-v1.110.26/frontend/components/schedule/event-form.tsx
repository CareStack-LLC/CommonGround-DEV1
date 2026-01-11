'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import {
  eventsAPI,
  collectionsAPI,
  casesAPI,
  MyTimeCollection,
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
import { Card } from '@/components/ui/card';
import { MedicalFields, SchoolFields, SportsFields, ExchangeFields } from './categories';

interface EventFormProps {
  caseId: string;
  agreementId?: string;  // Link event to specific SharedCare Agreement
  onClose: () => void;
  onSuccess?: () => void;
  initialDate?: Date;
  initialCollection?: MyTimeCollection;
}

export default function EventForm({
  caseId,
  agreementId,
  onClose,
  onSuccess,
  initialDate,
  initialCollection,
}: EventFormProps) {
  const [collections, setCollections] = useState<MyTimeCollection[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    collection_id: initialCollection?.id || '',
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
  });

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
      // Load user's collections
      const collectionsData = await collectionsAPI.listForCase(caseId, false);
      setCollections(collectionsData);

      // Set default collection if none selected
      if (!formData.collection_id && collectionsData.length > 0) {
        const defaultCollection = collectionsData.find(c => c.is_default) || collectionsData[0];
        setFormData(prev => ({ ...prev, collection_id: defaultCollection.id }));
      }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const eventData: CreateEventRequest = {
        collection_id: formData.collection_id,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Create Event</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* ARIA Conflict Warnings */}
          {conflicts.length > 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800 mb-2">Scheduling Conflict</p>
                  {conflicts.map((conflict, i) => (
                    <div key={i} className="text-sm text-yellow-700 mb-2">
                      <p>{conflict.message}</p>
                      <p className="text-xs mt-1">{conflict.suggestion}</p>
                    </div>
                  ))}
                  <p className="text-xs text-yellow-600 mt-2">
                    You can still create this event, but consider choosing a different time.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Collection */}
            <div>
              <Label htmlFor="collection">Collection</Label>
              <select
                id="collection"
                value={formData.collection_id}
                onChange={(e) => setFormData({ ...formData, collection_id: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} {collection.is_default && '(Default)'}
                  </option>
                ))}
              </select>
            </div>

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
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                    <div className="text-xs text-gray-500">Both parents can see this event</div>
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
                    <div className="text-xs text-gray-500">Only you can see this event</div>
                  </Label>
                </div>
              </div>
            </div>

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
      </Card>
    </div>
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

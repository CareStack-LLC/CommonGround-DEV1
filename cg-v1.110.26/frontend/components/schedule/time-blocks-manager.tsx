'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Lock, Repeat } from 'lucide-react';
import {
  timeBlocksAPI,
  collectionsAPI,
  TimeBlock,
  MyTimeCollection,
  CreateTimeBlockRequest,
  UpdateTimeBlockRequest,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface TimeBlocksManagerProps {
  caseId: string;
  selectedCollection?: MyTimeCollection;
}

const WEEKDAYS = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

export default function TimeBlocksManager({
  caseId,
  selectedCollection,
}: TimeBlocksManagerProps) {
  const [collections, setCollections] = useState<MyTimeCollection[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    collection_id: selectedCollection?.id || '',
    title: '',
    start_time: '',
    end_time: '',
    all_day: false,
    is_recurring: false,
    recurrence_pattern: 'weekly' as 'daily' | 'weekly',
    recurrence_days: [] as number[],
    recurrence_end_date: '',
    notes: '',
  });

  useEffect(() => {
    loadCollections();
  }, [caseId]);

  useEffect(() => {
    if (formData.collection_id) {
      loadTimeBlocks();
    }
  }, [formData.collection_id]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const data = await collectionsAPI.listForCase(caseId, false);
      setCollections(data);

      // Set default collection if none selected
      if (!formData.collection_id && data.length > 0) {
        const defaultCollection = data.find(c => c.is_default) || data[0];
        setFormData(prev => ({ ...prev, collection_id: defaultCollection.id }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load collections');
      console.error('Error loading collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeBlocks = async () => {
    if (!formData.collection_id) return;

    try {
      const data = await timeBlocksAPI.listForCollection(formData.collection_id);
      setTimeBlocks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load time blocks');
      console.error('Error loading time blocks:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const blockData: any = {
        collection_id: formData.collection_id,
        title: formData.title,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        all_day: formData.all_day,
        is_recurring: formData.is_recurring,
        notes: formData.notes || undefined,
      };

      if (formData.is_recurring) {
        blockData.recurrence_pattern = formData.recurrence_pattern;
        if (formData.recurrence_pattern === 'weekly') {
          blockData.recurrence_days = formData.recurrence_days;
        }
        if (formData.recurrence_end_date) {
          blockData.recurrence_end_date = formData.recurrence_end_date;
        }
      }

      if (editingId) {
        // Update existing
        await timeBlocksAPI.update(editingId, {
          title: formData.title,
          start_time: blockData.start_time,
          end_time: blockData.end_time,
          notes: formData.notes || undefined,
        } as UpdateTimeBlockRequest);
      } else {
        // Create new
        await timeBlocksAPI.create(blockData as CreateTimeBlockRequest);
      }

      // Reload blocks
      await loadTimeBlocks();

      // Reset form
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save time block');
      console.error('Error saving time block:', err);
    }
  };

  const handleEdit = (block: TimeBlock) => {
    setFormData({
      collection_id: block.collection_id,
      title: block.title,
      start_time: formatDateTime(new Date(block.start_time)),
      end_time: formatDateTime(new Date(block.end_time)),
      all_day: block.all_day,
      is_recurring: block.is_recurring,
      recurrence_pattern: (block.recurrence_pattern || 'weekly') as 'daily' | 'weekly',
      recurrence_days: block.recurrence_days || [],
      recurrence_end_date: block.recurrence_end_date || '',
      notes: block.notes || '',
    });
    setEditingId(block.id);
    setShowForm(true);
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm('Delete this time block?')) return;

    try {
      await timeBlocksAPI.delete(blockId);
      await loadTimeBlocks();
    } catch (err: any) {
      setError(err.message || 'Failed to delete time block');
      console.error('Error deleting time block:', err);
    }
  };

  const toggleWeekday = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }));
  };

  const resetForm = () => {
    setFormData({
      collection_id: formData.collection_id, // Keep selected collection
      title: '',
      start_time: '',
      end_time: '',
      all_day: false,
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_days: [],
      recurrence_end_date: '',
      notes: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Private Availability Blocks</p>
            <p className="text-sm text-blue-700 mt-1">
              Time blocks are completely private. The co-parent will never see these details.
              They're only used by ARIA to warn about potential scheduling conflicts.
            </p>
          </div>
        </div>
      </div>

      {/* Collection Selector */}
      <div>
        <Label htmlFor="collection_select">Collection</Label>
        <select
          id="collection_select"
          value={formData.collection_id}
          onChange={(e) => setFormData({ ...formData, collection_id: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name} {collection.is_default && '(Default)'}
            </option>
          ))}
        </select>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Time Blocks</h3>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title (Private) *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Work Hours, Gym Time"
                required
                className="mt-1"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
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
                All-day block
              </Label>
            </div>

            {/* Recurring */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_recurring" className="cursor-pointer flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring block
                </Label>
              </div>

              {formData.is_recurring && (
                <>
                  {/* Recurrence Pattern */}
                  <div>
                    <Label>Pattern</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="recurrence_pattern"
                          value="daily"
                          checked={formData.recurrence_pattern === 'daily'}
                          onChange={(e) => setFormData({ ...formData, recurrence_pattern: 'daily' })}
                          className="rounded-full"
                        />
                        <span>Daily</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="recurrence_pattern"
                          value="weekly"
                          checked={formData.recurrence_pattern === 'weekly'}
                          onChange={(e) => setFormData({ ...formData, recurrence_pattern: 'weekly' })}
                          className="rounded-full"
                        />
                        <span>Weekly</span>
                      </label>
                    </div>
                  </div>

                  {/* Weekday Selection (for weekly) */}
                  {formData.recurrence_pattern === 'weekly' && (
                    <div>
                      <Label>Repeat on</Label>
                      <div className="flex gap-2 mt-2">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              formData.recurrence_days.includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End Date */}
                  <div>
                    <Label htmlFor="recurrence_end_date">End Recurrence (Optional)</Label>
                    <Input
                      id="recurrence_end_date"
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Private)</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Private notes about this time block..."
                rows={2}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? 'Update' : 'Create'} Block
              </Button>
              <Button type="button" onClick={resetForm} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Time Blocks List */}
      {timeBlocks.length === 0 ? (
        <Card className="p-8 text-center">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No time blocks yet</p>
          <p className="text-sm text-gray-400">
            Add blocks to mark when you're unavailable (e.g., work hours, appointments)
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {timeBlocks.map((block) => (
            <Card key={block.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{block.title}</h4>
                    {block.is_recurring && (
                      <Repeat className="h-4 w-4 text-blue-600" />
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      {block.all_day && ' (All day)'}
                    </p>

                    {block.is_recurring && (
                      <p className="text-blue-600">
                        Repeats {block.recurrence_pattern}
                        {block.recurrence_pattern === 'weekly' && block.recurrence_days && (
                          <span> on {formatWeekdays(block.recurrence_days)}</span>
                        )}
                        {block.recurrence_end_date && (
                          <span> until {new Date(block.recurrence_end_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    )}

                    {block.notes && (
                      <p className="text-gray-500 italic">{block.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(block)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(block.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
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

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatWeekdays(days: number[]): string {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(d => dayNames[d]).join(', ');
}

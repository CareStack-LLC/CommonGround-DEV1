'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SchoolCategoryData } from '@/lib/api';

interface SchoolFieldsProps {
  data: SchoolCategoryData;
  onChange: (data: SchoolCategoryData) => void;
}

export default function SchoolFields({ data, onChange }: SchoolFieldsProps) {
  const updateField = (field: keyof SchoolCategoryData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <h4 className="font-medium text-green-900">School Activity Details</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="school_name">School Name</Label>
          <Input
            id="school_name"
            value={data.school_name || ''}
            onChange={(e) => updateField('school_name', e.target.value)}
            placeholder="e.g., Lincoln Elementary"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="activity_type">Activity Type</Label>
          <select
            id="activity_type"
            value={data.activity_type || ''}
            onChange={(e) => updateField('activity_type', e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select type...</option>
            <option value="parent_conference">Parent-Teacher Conference</option>
            <option value="performance">Performance/Concert</option>
            <option value="sports_game">Sports Game</option>
            <option value="field_trip">Field Trip</option>
            <option value="open_house">Open House</option>
            <option value="graduation">Graduation/Ceremony</option>
            <option value="awards">Awards Ceremony</option>
            <option value="meeting">School Meeting</option>
            <option value="other">Other Event</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="teacher_name">Teacher/Contact Name</Label>
          <Input
            id="teacher_name"
            value={data.teacher_name || ''}
            onChange={(e) => updateField('teacher_name', e.target.value)}
            placeholder="e.g., Mrs. Johnson"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="teacher_contact">Contact Email/Phone</Label>
          <Input
            id="teacher_contact"
            value={data.teacher_contact || ''}
            onChange={(e) => updateField('teacher_contact', e.target.value)}
            placeholder="e.g., teacher@school.edu"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_required"
          checked={data.is_required || false}
          onChange={(e) => updateField('is_required', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="is_required" className="cursor-pointer">
          Required attendance (parent/guardian must attend)
        </Label>
      </div>

      <div>
        <Label htmlFor="school_notes">Additional Notes</Label>
        <textarea
          id="school_notes"
          value={data.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Room number, what to bring, parking info..."
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}

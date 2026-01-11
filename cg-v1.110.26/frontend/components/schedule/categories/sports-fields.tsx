'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SportsCategoryData } from '@/lib/api';

interface SportsFieldsProps {
  data: SportsCategoryData;
  onChange: (data: SportsCategoryData) => void;
}

export default function SportsFields({ data, onChange }: SportsFieldsProps) {
  const updateField = (field: keyof SportsCategoryData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <h4 className="font-medium text-orange-900">Sports/Recreation Details</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="activity_name">Activity</Label>
          <select
            id="activity_name"
            value={data.activity_name || ''}
            onChange={(e) => updateField('activity_name', e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select activity...</option>
            <option value="soccer">Soccer</option>
            <option value="basketball">Basketball</option>
            <option value="baseball">Baseball/Softball</option>
            <option value="football">Football</option>
            <option value="swimming">Swimming</option>
            <option value="gymnastics">Gymnastics</option>
            <option value="dance">Dance</option>
            <option value="martial_arts">Martial Arts</option>
            <option value="tennis">Tennis</option>
            <option value="music">Music Lesson</option>
            <option value="art">Art Class</option>
            <option value="scouts">Scouts</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label htmlFor="organization">League/Organization</Label>
          <Input
            id="organization"
            value={data.organization || ''}
            onChange={(e) => updateField('organization', e.target.value)}
            placeholder="e.g., AYSO, Little League"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="coach_name">Coach/Instructor</Label>
          <Input
            id="coach_name"
            value={data.coach_name || ''}
            onChange={(e) => updateField('coach_name', e.target.value)}
            placeholder="e.g., Coach Smith"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="coach_contact">Coach Contact</Label>
          <Input
            id="coach_contact"
            value={data.coach_contact || ''}
            onChange={(e) => updateField('coach_contact', e.target.value)}
            placeholder="Phone or email"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="venue">Venue/Location</Label>
          <Input
            id="venue"
            value={data.venue || ''}
            onChange={(e) => updateField('venue', e.target.value)}
            placeholder="e.g., Central Park Field 3"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            min="0"
            step="0.01"
            value={data.cost || ''}
            onChange={(e) => updateField('cost', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="equipment_needed">Equipment Needed</Label>
        <Input
          id="equipment_needed"
          value={data.equipment_needed || ''}
          onChange={(e) => updateField('equipment_needed', e.target.value)}
          placeholder="e.g., Cleats, shin guards, water bottle"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="sports_notes">Additional Notes</Label>
        <textarea
          id="sports_notes"
          value={data.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Uniform requirements, arrival time, snack duty..."
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}

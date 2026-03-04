'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExchangeCategoryData } from '@/lib/api';

interface ExchangeFieldsProps {
  data: ExchangeCategoryData;
  onChange: (data: ExchangeCategoryData) => void;
}

export default function ExchangeFields({ data, onChange }: ExchangeFieldsProps) {
  const updateField = (field: keyof ExchangeCategoryData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <h4 className="font-medium text-purple-900">Custody Exchange Details</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exchange_type">Exchange Type</Label>
          <select
            id="exchange_type"
            value={data.exchange_type || ''}
            onChange={(e) => updateField('exchange_type', e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select type...</option>
            <option value="pickup">Pickup (receiving child)</option>
            <option value="dropoff">Dropoff (transferring child)</option>
            <option value="both">Both (pickup & dropoff)</option>
          </select>
        </div>
        <div>
          <Label htmlFor="exchange_location">Exchange Location</Label>
          <Input
            id="exchange_location"
            value={data.exchange_location || ''}
            onChange={(e) => updateField('exchange_location', e.target.value)}
            placeholder="e.g., School parking lot, Police station"
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transition_from">Transitioning From</Label>
          <Input
            id="transition_from"
            value={data.transition_from || ''}
            onChange={(e) => updateField('transition_from', e.target.value)}
            placeholder="Parent's name"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="transition_to">Transitioning To</Label>
          <Input
            id="transition_to"
            value={data.transition_to || ''}
            onChange={(e) => updateField('transition_to', e.target.value)}
            placeholder="Parent's name"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="items_to_bring">Items to Bring/Transfer</Label>
        <Input
          id="items_to_bring"
          value={data.items_to_bring || ''}
          onChange={(e) => updateField('items_to_bring', e.target.value)}
          placeholder="e.g., School backpack, medications, favorite toy"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="special_instructions">Special Instructions</Label>
        <textarea
          id="special_instructions"
          value={data.special_instructions || ''}
          onChange={(e) => updateField('special_instructions', e.target.value)}
          placeholder="Any specific instructions for this exchange..."
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}

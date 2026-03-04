'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ParentInfoSectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ParentInfoSection({ data, onSave, onNext, onPrevious }: ParentInfoSectionProps) {
  const [formData, setFormData] = useState({
    full_name: data.full_name || '',
    role: data.role || '',
    address: data.address || '',
    city: data.city || '',
    state: data.state || '',
    zip: data.zip || '',
    phone: data.phone || '',
    email: data.email || '',
    employer: data.employer || '',
    work_hours: data.work_hours || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    console.log(`🎯 ParentInfo handleChange called:`, { field, value });
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      console.log(`📊 ParentInfo new state:`, updated);
      return updated;
    });
  };

  const handleSaveAndNext = async () => {
    try {
      setIsSaving(true);
      await onSave(formData);
      onNext();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
            1
          </span>
          Your Information
        </CardTitle>
        <CardDescription>
          Let's start with your basic information. This helps identify you in the agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="full_name">Full Legal Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => {
                console.log(`⚡ Input onChange event:`, e.target.value);
                handleChange('full_name', e.target.value);
              }}
              onInput={(e) => console.log(`⌨️ Input onInput event:`, (e.target as HTMLInputElement).value)}
              placeholder="John Michael Smith"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Your Role *</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select role</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="john.smith@example.com"
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street, Apt 4B"
              required
            />
          </div>

          <div>
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Los Angeles"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="CA"
                maxLength={2}
                required
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => handleChange('zip', e.target.value)}
                placeholder="90210"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <div>
            <Label htmlFor="employer">Employer (Optional)</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => handleChange('employer', e.target.value)}
              placeholder="ABC Company"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="work_hours">Typical Work Hours (Optional)</Label>
            <Input
              id="work_hours"
              value={formData.work_hours}
              onChange={(e) => handleChange('work_hours', e.target.value)}
              placeholder="Monday-Friday, 9am-5pm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Helps determine availability for parenting time
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Privacy Note</h4>
          <p className="text-sm text-blue-800">
            This information will be included in your custody agreement and may be shared with the court if needed. All information is stored securely and only accessible to you and the other parent.
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>
          <Button
            onClick={handleSaveAndNext}
            disabled={!formData.full_name || !formData.role || !formData.email || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

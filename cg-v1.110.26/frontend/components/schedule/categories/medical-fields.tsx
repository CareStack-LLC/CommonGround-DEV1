'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MedicalCategoryData } from '@/lib/api';

interface MedicalFieldsProps {
  data: MedicalCategoryData;
  onChange: (data: MedicalCategoryData) => void;
}

export default function MedicalFields({ data, onChange }: MedicalFieldsProps) {
  const updateField = (field: keyof MedicalCategoryData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h4 className="font-medium text-blue-900">Medical Appointment Details</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="provider_name">Provider/Clinic Name</Label>
          <Input
            id="provider_name"
            value={data.provider_name || ''}
            onChange={(e) => updateField('provider_name', e.target.value)}
            placeholder="e.g., Dr. Smith, ABC Pediatrics"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="provider_specialty">Specialty</Label>
          <select
            id="provider_specialty"
            value={data.provider_specialty || ''}
            onChange={(e) => updateField('provider_specialty', e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select specialty...</option>
            <option value="pediatrician">Pediatrician</option>
            <option value="dentist">Dentist</option>
            <option value="orthodontist">Orthodontist</option>
            <option value="ophthalmologist">Eye Doctor</option>
            <option value="therapist">Therapist/Counselor</option>
            <option value="specialist">Specialist</option>
            <option value="urgent_care">Urgent Care</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="appointment_reason">Reason for Visit</Label>
        <select
          id="appointment_reason"
          value={data.appointment_reason || ''}
          onChange={(e) => updateField('appointment_reason', e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select reason...</option>
          <option value="checkup">Regular Check-up</option>
          <option value="vaccination">Vaccination</option>
          <option value="illness">Illness/Sick Visit</option>
          <option value="follow_up">Follow-up Visit</option>
          <option value="dental_cleaning">Dental Cleaning</option>
          <option value="eye_exam">Eye Exam</option>
          <option value="therapy">Therapy Session</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="address">Clinic Address</Label>
          <Input
            id="address"
            value={data.address || ''}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Medical Center Dr"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="follow_up_needed"
          checked={data.follow_up_needed || false}
          onChange={(e) => updateField('follow_up_needed', e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="follow_up_needed" className="cursor-pointer">
          Follow-up appointment needed
        </Label>
      </div>

      <div>
        <Label htmlFor="medical_notes">Additional Notes</Label>
        <textarea
          id="medical_notes"
          value={data.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Any special instructions, medications, or information..."
          rows={2}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Child {
  full_name: string;
  nickname: string;
  date_of_birth: string;
  school: string;
  grade: string;
  special_needs: string;
  allergies: string;
  medications: string;
}

interface ChildrenInfoSectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ChildrenInfoSection({ data, onSave, onNext, onPrevious }: ChildrenInfoSectionProps) {
  const [children, setChildren] = useState<Child[]>(
    data.children && data.children.length > 0
      ? data.children
      : [{
          full_name: '',
          nickname: '',
          date_of_birth: '',
          school: '',
          grade: '',
          special_needs: '',
          allergies: '',
          medications: '',
        }]
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleChildChange = (index: number, field: keyof Child, value: string) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

  const addChild = () => {
    setChildren([
      ...children,
      {
        full_name: '',
        nickname: '',
        date_of_birth: '',
        school: '',
        grade: '',
        special_needs: '',
        allergies: '',
        medications: '',
      },
    ]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const handleSaveAndNext = async () => {
    try {
      setIsSaving(true);
      await onSave({ children });
      onNext();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = children.every((child) => child.full_name && child.date_of_birth);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
            3
          </span>
          Children Information
        </CardTitle>
        <CardDescription>
          Tell us about each child covered by this agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children.map((child, index) => (
          <div key={index} className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Child {index + 1}
              </h3>
              {children.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeChild(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor={`child_${index}_name`}>Full Legal Name *</Label>
                <Input
                  id={`child_${index}_name`}
                  value={child.full_name}
                  onChange={(e) => handleChildChange(index, 'full_name', e.target.value)}
                  placeholder="Emily Rose Smith"
                  required
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_nickname`}>Nickname (Optional)</Label>
                <Input
                  id={`child_${index}_nickname`}
                  value={child.nickname}
                  onChange={(e) => handleChildChange(index, 'nickname', e.target.value)}
                  placeholder="Emmy"
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_dob`}>Date of Birth *</Label>
                <Input
                  id={`child_${index}_dob`}
                  type="date"
                  value={child.date_of_birth}
                  onChange={(e) => handleChildChange(index, 'date_of_birth', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_school`}>School (Optional)</Label>
                <Input
                  id={`child_${index}_school`}
                  value={child.school}
                  onChange={(e) => handleChildChange(index, 'school', e.target.value)}
                  placeholder="Lincoln Elementary"
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_grade`}>Grade (Optional)</Label>
                <Input
                  id={`child_${index}_grade`}
                  value={child.grade}
                  onChange={(e) => handleChildChange(index, 'grade', e.target.value)}
                  placeholder="3rd Grade"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor={`child_${index}_special_needs`}>
                  Special Needs or Considerations (Optional)
                </Label>
                <Input
                  id={`child_${index}_special_needs`}
                  value={child.special_needs}
                  onChange={(e) => handleChildChange(index, 'special_needs', e.target.value)}
                  placeholder="IEP for reading, sensory sensitivities"
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_allergies`}>Allergies (Optional)</Label>
                <Input
                  id={`child_${index}_allergies`}
                  value={child.allergies}
                  onChange={(e) => handleChildChange(index, 'allergies', e.target.value)}
                  placeholder="Peanuts, dairy"
                />
              </div>

              <div>
                <Label htmlFor={`child_${index}_medications`}>
                  Current Medications (Optional)
                </Label>
                <Input
                  id={`child_${index}_medications`}
                  value={child.medications}
                  onChange={(e) => handleChildChange(index, 'medications', e.target.value)}
                  placeholder="Albuterol inhaler as needed"
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addChild}
          className="w-full border-dashed"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Child
        </Button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Why We Need This</h4>
          <p className="text-sm text-blue-800">
            Child information helps ensure the agreement is specific and clear. Medical and educational details are especially important for emergencies and decision-making.
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
            disabled={!isValid || isSaving}
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

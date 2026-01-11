'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface SectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function createSection(
  number: number,
  title: string,
  description: string,
  prompt: string,
  fields: Array<{ name: string; label: string; type?: string; placeholder?: string; required?: boolean }>
) {
  return function Section({ data, onSave, onNext, onPrevious }: SectionProps) {
    const initialData: Record<string, string> = {};
    fields.forEach((field) => {
      initialData[field.name] = data[field.name] || '';
    });

    const [formData, setFormData] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (field: string, value: string) => {
      console.log(`📝 Field "${field}" changed to:`, value);
      setFormData((prev) => {
        const updated = { ...prev, [field]: value };
        console.log('📊 Updated formData:', updated);
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

    const isValid = fields
      .filter((f) => f.required)
      .every((f) => {
        const value = formData[f.name];
        const trimmed = value?.trim();
        const isFieldValid = Boolean(trimmed);

        // Debug logging - only log invalid fields
        if (!isFieldValid) {
          console.log(`❌ Field "${f.name}" is invalid:`, {
            value,
            trimmed,
            hasValue: Boolean(value),
            afterTrim: Boolean(trimmed)
          });
        }

        return isFieldValid;
      });

    // Monitor formData and validation changes
    useEffect(() => {
      console.log('🔄 Form state updated:', {
        formData,
        isValid,
        requiredFields: fields.filter(f => f.required).map(f => f.name),
        filledFields: Object.entries(formData)
          .filter(([_, value]) => value?.trim())
          .map(([key]) => key)
      });
    }, [formData, isValid]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
              {number}
            </span>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 whitespace-pre-line">{prompt}</p>
          </div>

          <div className="space-y-4">
            {fields.map((field) => {
              const fieldValue = formData[field.name];
              const isFieldFilled = fieldValue?.trim();

              return (
              <div key={field.name}>
                <Label htmlFor={field.name} className="flex items-center gap-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                  {field.required && isFieldFilled && (
                    <span className="text-green-600 text-xs">✓</span>
                  )}
                  {field.required && !isFieldFilled && (
                    <span className="text-gray-400 text-xs">(required)</span>
                  )}
                </Label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      console.log(`🎯 Textarea onChange fired for "${field.name}"`, e.target.value);
                      handleChange(field.name, e.target.value);
                    }}
                    placeholder={field.placeholder}
                    rows={4}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      console.log(`🎯 Select onChange fired for "${field.name}"`, e.target.value);
                      handleChange(field.name, e.target.value);
                    }}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {field.placeholder?.split('|').map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    type={field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={(e) => {
                      console.log(`🎯 Input onChange fired for "${field.name}"`, e.target.value);
                      handleChange(field.name, e.target.value);
                    }}
                    onInput={(e) => console.log(`⌨️ Input onInput fired for "${field.name}"`, (e.target as HTMLInputElement).value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              );
            })}
          </div>

          {/* Debug validation status */}
          {!isValid && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm font-medium text-yellow-900">Required fields not completed:</p>
              <ul className="text-xs text-yellow-800 mt-2 list-disc list-inside">
                {fields
                  .filter((f) => f.required)
                  .filter((f) => !formData[f.name]?.trim())
                  .map((f) => (
                    <li key={f.name}>{f.label}</li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onPrevious}>
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
  };
}

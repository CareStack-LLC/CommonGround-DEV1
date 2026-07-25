'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
      setFormData((prev) => ({ ...prev, [field]: value }));
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
        return Boolean(value?.trim());
      });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
              {number}
            </span>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{prompt}</p>
          </div>

          <div className="space-y-4">
            {fields.map((field) => {
              const fieldValue = formData[field.name];
              const isFieldFilled = fieldValue?.trim();

              return (
              <div key={field.name}>
                <Label htmlFor={field.name} className="flex items-center gap-2">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                  {field.required && isFieldFilled && (
                    <span className="text-cg-sage-dark text-xs">✓</span>
                  )}
                  {field.required && !isFieldFilled && (
                    <span className="text-muted-foreground text-xs">(required)</span>
                  )}
                </Label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                    required={field.required}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
              );
            })}
          </div>

          {!isValid && (
            <div className="mt-4 p-3 bg-cg-amber/10 border border-cg-amber/20 rounded-md">
              <p className="text-sm font-medium text-foreground">Required fields not completed:</p>
              <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside">
                {fields
                  .filter((f) => f.required)
                  .filter((f) => !formData[f.name]?.trim())
                  .map((f) => (
                    <li key={f.name}>{f.label}</li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button variant="outline" onClick={onPrevious}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={handleSaveAndNext}
              disabled={!isValid || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Continue'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cubbieAPI, childrenAPI, ChildProfile, ItemCategory, ItemLocation } from '@/lib/api';
import { ChevronLeft, Camera, Loader2, X } from 'lucide-react';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics (gaming devices, tablets, phones)' },
  { value: 'school', label: 'School (laptops, supplies, uniforms)' },
  { value: 'sports', label: 'Sports (equipment, gear)' },
  { value: 'medical', label: 'Medical (glasses, hearing aids, devices)' },
  { value: 'musical', label: 'Musical (instruments)' },
  { value: 'other', label: 'Other' },
];

const LOCATIONS: { value: ItemLocation; label: string }[] = [
  { value: 'parent_a', label: "At Parent A's Home" },
  { value: 'parent_b', label: "At Parent B's Home" },
  { value: 'child_traveling', label: 'Traveling with Child' },
];

function NewCubbieItemPageContent() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;
  const childId = params.childId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'electronics' as ItemCategory,
    estimated_value: '',
    purchase_date: '',
    serial_number: '',
    notes: '',
    current_location: 'parent_a' as ItemLocation,
  });

  useEffect(() => {
    loadChild();
  }, [childId]);

  const handleAuthError = (err: any) => {
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const loadChild = async () => {
    try {
      setLoading(true);
      const childData = await childrenAPI.get(childId);
      setChild(childData);
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to load child');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Create the item first
      const newItem = await cubbieAPI.createItem({
        child_id: childId,
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
        purchase_date: formData.purchase_date || undefined,
        serial_number: formData.serial_number || undefined,
        notes: formData.notes || undefined,
        current_location: formData.current_location,
      });

      // If there's a photo, upload it
      if (photoFile && newItem.id) {
        try {
          await cubbieAPI.uploadItemPhoto(newItem.id, photoFile);
        } catch (photoErr) {
          console.error('Failed to upload photo:', photoErr);
          // Continue anyway - item was created
        }
      }

      router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`);
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to create item');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <PageContainer className="pb-32 max-w-2xl">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--portal-primary)] transition-colors font-medium mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {child?.first_name}'s Cubbie
        </button>

        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
          <div className="px-6 py-6 border-b border-slate-100 bg-muted/30">
            <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Add Item to {child?.first_name}'s Cubbie</h1>
            <p className="text-muted-foreground">
              Register a high-value item that travels with {child?.first_name}
            </p>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground uppercase tracking-wide">Item Photo</Label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-32 h-32 bg-muted/30 rounded-xl flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-slate-300 hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary)]/5 transition-all duration-200 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <Camera className="h-8 w-8 text-muted-foreground group-hover:text-[var(--portal-primary)] transition-colors mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground group-hover:text-[var(--portal-primary)] transition-colors">Click to add</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  {photoPreview && (
                    <Button type="button" variant="outline" size="sm" onClick={removePhoto} className="border-slate-200 text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/5">
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground uppercase tracking-wide">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Nintendo Switch, School Laptop"
                  className="bg-white border-slate-200 text-foreground rounded-xl focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground uppercase tracking-wide">Category *</Label>
                <div className="relative">
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ItemCategory })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-foreground appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground uppercase tracking-wide">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Red/Blue Joy-Cons, Mario carrying case"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-foreground min-h-[80px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Estimated Value */}
                <div className="space-y-2">
                  <Label htmlFor="estimated_value" className="text-sm font-medium text-foreground uppercase tracking-wide">Estimated Value ($)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    placeholder="299.99"
                    className="bg-white border-slate-200 text-foreground rounded-xl focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-2">
                  <Label htmlFor="serial_number" className="text-sm font-medium text-foreground uppercase tracking-wide">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Optional"
                    className="bg-white border-slate-200 text-foreground rounded-xl focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                  />
                </div>
              </div>

              {/* Current Location */}
              <div className="space-y-2">
                <Label htmlFor="current_location" className="text-sm font-medium text-foreground uppercase tracking-wide">Current Location *</Label>
                <div className="relative">
                  <select
                    id="current_location"
                    value={formData.current_location}
                    onChange={(e) =>
                      setFormData({ ...formData, current_location: e.target.value as ItemLocation })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-foreground appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                    required
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date" className="text-sm font-medium text-foreground uppercase tracking-wide">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="bg-white border-slate-200 text-foreground rounded-xl focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-foreground uppercase tracking-wide">Special Care Instructions</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special care or handling instructions"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-foreground min-h-[80px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)]"
                />
              </div>

              {error && (
                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`)}
                  disabled={submitting}
                  className="flex-1 rounded-xl hover:bg-slate-100 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-200 rounded-xl font-bold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Item'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default function NewCubbieItemPage() {
  return (
    <ProtectedRoute>
      <NewCubbieItemPageContent />
    </ProtectedRoute>
  );
}

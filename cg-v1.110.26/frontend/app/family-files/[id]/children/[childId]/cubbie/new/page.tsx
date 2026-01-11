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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <PageContainer className="pb-32 max-w-2xl">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {child?.first_name}'s Cubbie
        </button>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Add Item to {child?.first_name}'s Cubbie</CardTitle>
            <CardDescription>
              Register a high-value item that travels with {child?.first_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="text-foreground">Item Photo</Label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-cg-sage/50 transition-colors"
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
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Click to add photo</p>
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
                    <Button type="button" variant="outline" size="sm" onClick={removePhoto}>
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Add a photo for documentation purposes
                </p>
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Nintendo Switch, School Laptop"
                  className="bg-background border-border text-foreground"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ItemCategory })
                  }
                  className="w-full p-2 bg-background border border-border rounded-md text-foreground"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Red/Blue Joy-Cons, Mario carrying case"
                  className="w-full p-2 bg-background border border-border rounded-md text-foreground min-h-[80px]"
                />
              </div>

              {/* Estimated Value */}
              <div className="space-y-2">
                <Label htmlFor="estimated_value" className="text-foreground">Estimated Value ($)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  placeholder="299.99"
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Important for documentation if item is lost or damaged
                </p>
              </div>

              {/* Current Location */}
              <div className="space-y-2">
                <Label htmlFor="current_location" className="text-foreground">Current Location *</Label>
                <select
                  id="current_location"
                  value={formData.current_location}
                  onChange={(e) =>
                    setFormData({ ...formData, current_location: e.target.value as ItemLocation })
                  }
                  className="w-full p-2 bg-background border border-border rounded-md text-foreground"
                  required
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serial_number" className="text-foreground">Serial Number (optional)</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="For electronics"
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date" className="text-foreground">Purchase Date (optional)</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">Special Care Instructions</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special care or handling instructions"
                  className="w-full p-2 bg-background border border-border rounded-md text-foreground min-h-[80px]"
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-cg-sage hover:bg-cg-sage/90 text-white"
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
          </CardContent>
        </Card>
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

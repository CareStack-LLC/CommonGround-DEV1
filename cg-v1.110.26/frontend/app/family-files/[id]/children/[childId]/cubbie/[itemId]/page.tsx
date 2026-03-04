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
import { cubbieAPI, CubbieItem, ItemCategory, ItemLocation, childrenAPI, ChildProfile } from '@/lib/api';
import { ChevronLeft, Camera, Loader2, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'school', label: 'School' },
  { value: 'sports', label: 'Sports' },
  { value: 'medical', label: 'Medical' },
  { value: 'musical', label: 'Musical' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  school: 'School',
  sports: 'Sports',
  medical: 'Medical',
  musical: 'Musical',
  other: 'Other',
};

const LOCATION_LABELS: Record<string, string> = {
  parent_a: "Parent A's Home",
  parent_b: "Parent B's Home",
  child_traveling: 'Traveling with Child',
};

const LOCATIONS: { value: ItemLocation; label: string }[] = [
  { value: 'parent_a', label: "At Parent A's Home" },
  { value: 'parent_b', label: "At Parent B's Home" },
  { value: 'child_traveling', label: 'Traveling with Child' },
];

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '🎮',
  school: '📚',
  sports: '⚽',
  medical: '💊',
  musical: '🎸',
  other: '📦',
};

function CubbieItemDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;
  const childId = params.childId as string;
  const itemId = params.itemId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [item, setItem] = useState<CubbieItem | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    loadData();
  }, [itemId, childId]);

  const handleAuthError = (err: any) => {
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [itemData, childData] = await Promise.all([
        cubbieAPI.getItem(itemId),
        childrenAPI.get(childId),
      ]);

      setItem(itemData);
      setChild(childData);
      setFormData({
        name: itemData.name || '',
        description: itemData.description || '',
        category: itemData.category as ItemCategory,
        estimated_value: itemData.estimated_value || '',
        purchase_date: itemData.purchase_date || '',
        serial_number: itemData.serial_number || '',
        notes: itemData.notes || '',
        current_location: itemData.current_location as ItemLocation,
      });
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await cubbieAPI.updateItem(item.id, {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
        purchase_date: formData.purchase_date || undefined,
        serial_number: formData.serial_number || undefined,
        notes: formData.notes || undefined,
        current_location: formData.current_location,
      });
      setItem(updated);
      setEditMode(false);
      setSuccess('Item updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      await cubbieAPI.uploadItemPhoto(item.id, file);
      setSuccess('Photo uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
      loadData(); // Reload to get new photo URL
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    try {
      setDeleting(true);
      await cubbieAPI.deleteItem(item.id);
      router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`);
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to remove item');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleQuickLocationUpdate = async (location: ItemLocation) => {
    if (!item || item.current_location === location) return;

    try {
      setSaving(true);
      setError(null);
      const updated = await cubbieAPI.updateItem(item.id, {
        current_location: location,
      });
      setItem(updated);
      setSuccess('Location updated!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to update location');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return '-';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32 max-w-2xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32 max-w-2xl">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>{error || 'Item not found'}</p>
                <Button
                  onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie`)}
                  className="mt-4 bg-cg-sage hover:bg-cg-sage/90 text-white"
                >
                  Back to Cubbie
                </Button>
              </div>
            </CardContent>
          </Card>
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

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Main Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-foreground">{item.name}</CardTitle>
                <CardDescription>{CATEGORY_LABELS[item.category]}</CardDescription>
              </div>
              <div className="flex gap-2">
                {!editMode && (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {editMode ? (
              /* Edit Mode */
              <div className="space-y-4">
                {/* Photo */}
                <div className="space-y-2">
                  <Label className="text-foreground">Photo</Label>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-cg-sage/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Click to add</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {uploadingPhoto && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    )}
                  </div>
                </div>

                {/* Item Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                    className="w-full p-2 bg-background border border-border rounded-md text-foreground"
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
                    className="bg-background border-border text-foreground"
                  />
                </div>

                {/* Current Location */}
                <div className="space-y-2">
                  <Label htmlFor="current_location" className="text-foreground">Current Location *</Label>
                  <select
                    id="current_location"
                    value={formData.current_location}
                    onChange={(e) => setFormData({ ...formData, current_location: e.target.value as ItemLocation })}
                    className="w-full p-2 bg-background border border-border rounded-md text-foreground"
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
                  <Label htmlFor="serial_number" className="text-foreground">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                {/* Purchase Date */}
                <div className="space-y-2">
                  <Label htmlFor="purchase_date" className="text-foreground">Purchase Date</Label>
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
                    className="w-full p-2 bg-background border border-border rounded-md text-foreground min-h-[80px]"
                  />
                </div>

                {/* Edit Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      // Reset form data
                      setFormData({
                        name: item.name || '',
                        description: item.description || '',
                        category: item.category as ItemCategory,
                        estimated_value: item.estimated_value || '',
                        purchase_date: item.purchase_date || '',
                        serial_number: item.serial_number || '',
                        notes: item.notes || '',
                        current_location: item.current_location as ItemLocation,
                      });
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-cg-sage hover:bg-cg-sage/90 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                {/* Photo */}
                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p className="text-6xl mb-2">{CATEGORY_ICONS[item.category] || '📦'}</p>
                      <p className="text-sm">No photo</p>
                    </div>
                  )}
                </div>

                {/* Current Location Badge */}
                <div className="flex justify-center">
                  <span
                    className={`text-sm px-4 py-2 rounded-full ${
                      item.current_location === 'child_traveling'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {LOCATION_LABELS[item.current_location]}
                  </span>
                </div>

                {/* Description */}
                {item.description && (
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Description</h3>
                    <p className="text-foreground">{item.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Estimated Value</h3>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(item.estimated_value)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Purchase Date</h3>
                    <p className="text-foreground">{formatDate(item.purchase_date)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Serial Number</h3>
                    <p className="text-foreground">{item.serial_number || '-'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Added</h3>
                    <p className="text-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-1">Special Care Instructions</h3>
                    <p className="text-foreground bg-secondary p-3 rounded-md">{item.notes}</p>
                  </div>
                )}

                {/* Quick Location Update */}
                <div className="border-t border-border pt-6">
                  <h3 className="font-medium text-muted-foreground mb-3">Quick Location Update</h3>
                  <div className="flex gap-2 flex-wrap">
                    {LOCATIONS.map((loc) => (
                      <Button
                        key={loc.value}
                        variant={item.current_location === loc.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleQuickLocationUpdate(loc.value)}
                        disabled={saving}
                        className={item.current_location === loc.value ? 'bg-cg-sage hover:bg-cg-sage/90 text-white' : ''}
                      >
                        {loc.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Last Location Update */}
                {item.last_location_update && (
                  <p className="text-xs text-muted-foreground">
                    Last location update: {formatDate(item.last_location_update)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Remove Item?</CardTitle>
                <CardDescription>
                  Are you sure you want to remove "{item.name}" from the cubbie?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This will deactivate the item. It can be restored later if needed.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      'Remove Item'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default function CubbieItemDetailPage() {
  return (
    <ProtectedRoute>
      <CubbieItemDetailPageContent />
    </ProtectedRoute>
  );
}

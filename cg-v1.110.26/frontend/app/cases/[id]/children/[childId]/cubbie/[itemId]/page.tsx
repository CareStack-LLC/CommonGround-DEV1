'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cubbieAPI, CubbieItem, ItemCategory, ItemLocation, childrenAPI, ChildProfile } from '@/lib/api';

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

export default function CubbieItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
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
      router.push(`/cases/${caseId}/children/${childId}/cubbie`);
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
      setDeleting(false);
      setShowDeleteConfirm(false);
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
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>{error || 'Item not found'}</p>
              <Button
                onClick={() => router.push(`/cases/${caseId}/children/${childId}/cubbie`)}
                className="mt-4"
              >
                Back to Cubbie
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/cases/${caseId}/children/${childId}/cubbie`)}
        >
          ← Back to {child?.first_name}'s Cubbie
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{item.name}</CardTitle>
              <CardDescription>{CATEGORY_LABELS[item.category]}</CardDescription>
            </div>
            <div className="flex gap-2">
              {!editMode && (
                <>
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700"
                  >
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
                <Label>Photo</Label>
                <div className="flex items-start gap-4">
                  <div
                    className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400"
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
                        <p className="text-2xl">📷</p>
                        <p className="text-xs text-gray-500">Click to add</p>
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
                  {uploadingPhoto && <span className="text-sm text-gray-500">Uploading...</span>}
                </div>
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                  className="w-full p-2 border rounded-md"
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
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-md min-h-[80px]"
                />
              </div>

              {/* Estimated Value */}
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value ($)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                />
              </div>

              {/* Current Location */}
              <div className="space-y-2">
                <Label htmlFor="current_location">Current Location *</Label>
                <select
                  id="current_location"
                  value={formData.current_location}
                  onChange={(e) => setFormData({ ...formData, current_location: e.target.value as ItemLocation })}
                  className="w-full p-2 border rounded-md"
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
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Special Care Instructions</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-md min-h-[80px]"
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
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Photo */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-400">
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
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {LOCATION_LABELS[item.current_location]}
                </span>
              </div>

              {/* Description */}
              {item.description && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Estimated Value</h3>
                  <p className="text-lg font-semibold">{formatCurrency(item.estimated_value)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Purchase Date</h3>
                  <p>{formatDate(item.purchase_date)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Serial Number</h3>
                  <p>{item.serial_number || '-'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Added</h3>
                  <p>{formatDate(item.created_at)}</p>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Special Care Instructions</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{item.notes}</p>
                </div>
              )}

              {/* Quick Location Update */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-700 mb-3">Quick Location Update</h3>
                <div className="flex gap-2 flex-wrap">
                  {LOCATIONS.map((loc) => (
                    <Button
                      key={loc.value}
                      variant={item.current_location === loc.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={async () => {
                        if (item.current_location !== loc.value) {
                          try {
                            setSaving(true);
                            const updated = await cubbieAPI.updateItem(item.id, {
                              current_location: loc.value,
                            });
                            setItem(updated);
                            setSuccess('Location updated!');
                            setTimeout(() => setSuccess(null), 2000);
                          } catch (err: any) {
                            setError(err.message || 'Failed to update location');
                          } finally {
                            setSaving(false);
                          }
                        }
                      }}
                      disabled={saving}
                    >
                      {loc.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Last Location Update */}
              {item.last_location_update && (
                <p className="text-xs text-gray-400">
                  Last location update: {formatDate(item.last_location_update)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>Remove Item?</CardTitle>
              <CardDescription>
                Are you sure you want to remove "{item.name}" from the cubbie?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
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
                  {deleting ? 'Removing...' : 'Remove Item'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

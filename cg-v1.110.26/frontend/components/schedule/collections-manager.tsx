'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import {
  collectionsAPI,
  MyTimeCollection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface CollectionsManagerProps {
  caseId: string;
  onCollectionSelect?: (collection: MyTimeCollection) => void;
}

export default function CollectionsManager({
  caseId,
  onCollectionSelect,
}: CollectionsManagerProps) {
  const [collections, setCollections] = useState<MyTimeCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    is_default: false,
  });

  // Preset colors for quick selection
  const presetColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ];

  useEffect(() => {
    loadCollections();
  }, [caseId]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Only load user's own collections
      const data = await collectionsAPI.listForCase(caseId, false);
      setCollections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load collections');
      console.error('Error loading collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Update existing
        const updated = await collectionsAPI.update(editingId, formData as UpdateCollectionRequest);
        setCollections(collections.map(c => c.id === editingId ? updated : c));
      } else {
        // Create new
        const newCollection = await collectionsAPI.create({
          case_id: caseId,
          ...formData,
        } as CreateCollectionRequest);
        setCollections([...collections, newCollection]);
      }

      // Reset form
      setFormData({ name: '', color: '#3B82F6', is_default: false });
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save collection');
      console.error('Error saving collection:', err);
    }
  };

  const handleEdit = (collection: MyTimeCollection) => {
    setFormData({
      name: collection.name,
      color: collection.color,
      is_default: collection.is_default,
    });
    setEditingId(collection.id);
    setShowForm(true);
  };

  const handleDelete = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await collectionsAPI.delete(collectionId);
      setCollections(collections.filter(c => c.id !== collectionId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete collection');
      console.error('Error deleting collection:', err);
    }
  };

  const cancelForm = () => {
    setFormData({ name: '', color: '#3B82F6', is_default: false });
    setShowForm(false);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Time Collections</h2>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Collection Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Work Hours, Family Time"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is private - only you can see this name
              </p>
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mt-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-8 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Set as default collection
              </Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? 'Update' : 'Create'} Collection
              </Button>
              <Button type="button" onClick={cancelForm} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Collections List */}
      {collections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No collections yet</p>
          <p className="text-sm text-gray-400">
            Create a collection to organize your schedule
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                collection.is_default ? 'border-2 border-blue-500' : ''
              }`}
              onClick={() => onCollectionSelect?.(collection)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {/* Color indicator */}
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: collection.color }}
                  />

                  {/* Collection name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{collection.name}</span>
                      {collection.is_default && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(collection);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!collection.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(collection.id);
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 text-center">
        Collections help you organize your schedule. The co-parent will see these as generic labels like "Your Time".
      </p>
    </div>
  );
}

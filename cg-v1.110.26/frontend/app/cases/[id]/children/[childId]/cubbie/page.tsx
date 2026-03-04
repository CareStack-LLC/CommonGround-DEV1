'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cubbieAPI, CubbieItem, childrenAPI, ChildProfile } from '@/lib/api';

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

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '🎮',
  school: '📚',
  sports: '⚽',
  medical: '💊',
  musical: '🎸',
  other: '📦',
};

export default function ChildCubbiePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [items, setItems] = useState<CubbieItem[]>([]);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const childData = await childrenAPI.get(childId);
      setChild(childData);

      const cubbieResponse = await cubbieAPI.listForChild(childId);
      setItems(cubbieResponse.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load cubbie items');
    } finally {
      setLoading(false);
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

  const totalValue = items.reduce((sum, item) => {
    return sum + (item.estimated_value ? parseFloat(item.estimated_value) : 0);
  }, 0);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button onClick={loadData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/cases/${caseId}/children/${childId}`)}
        >
          ← Back to {child?.first_name}'s Profile
        </Button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{child?.first_name}'s Cubbie</h1>
          <p className="text-gray-500">
            Track high-value items that travel with {child?.first_name}
          </p>
        </div>
        <Button onClick={() => router.push(`/cases/${caseId}/children/${childId}/cubbie/new`)}>
          + Add Item
        </Button>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-gray-500 text-sm">Total Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalValue.toString())}
                </p>
                <p className="text-gray-500 text-sm">Total Value</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {items.filter((i) => i.current_location === 'child_traveling').length}
                </p>
                <p className="text-gray-500 text-sm">Currently Traveling</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/cases/${caseId}/children/${childId}/cubbie/${item.id}`)}
            >
              <CardContent className="pt-6">
                {/* Item Photo */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-4xl">
                      {CATEGORY_ICONS[item.category] || '📦'}
                    </span>
                  )}
                </div>

                {/* Item Details */}
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-gray-500 text-sm mb-2">
                  {CATEGORY_LABELS[item.category]}
                </p>

                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {formatCurrency(item.estimated_value)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      item.current_location === 'child_traveling'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {LOCATION_LABELS[item.current_location]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-4xl mb-4">📦</p>
              <p className="text-gray-500 mb-4">
                No items registered for {child?.first_name} yet.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Add high-value items like electronics, school laptops, tablets, or sports equipment.
              </p>
              <Button onClick={() => router.push(`/cases/${caseId}/children/${childId}/cubbie/new`)}>
                Add First Item
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cubbieAPI, CubbieItem, childrenAPI, ChildProfile } from '@/lib/api';
import { ChevronLeft, Plus, Package, MapPin, DollarSign, Loader2 } from 'lucide-react';

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

function ChildCubbiePageContent() {
  const params = useParams();
  const router = useRouter();
  const familyFileId = params.id as string;
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [items, setItems] = useState<CubbieItem[]>([]);

  useEffect(() => {
    loadData();
  }, [childId]);

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

      const childData = await childrenAPI.get(childId);
      setChild(childData);

      const cubbieResponse = await cubbieAPI.listForChild(childId);
      setItems(cubbieResponse.items);
    } catch (err: any) {
      if (handleAuthError(err)) return;
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center text-destructive">
                <p>{error}</p>
                <Button onClick={loadData} className="mt-4 bg-cg-sage hover:bg-cg-sage/90">
                  Try Again
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
      <PageContainer className="pb-32">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {child?.first_name}'s Profile
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {child?.first_name}'s Cubbie
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track high-value items that travel with {child?.first_name}
            </p>
          </div>
          <Button
            onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/new`)}
            className="bg-cg-sage hover:bg-cg-sage/90 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Package className="h-5 w-5 text-cg-sage" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{items.length}</p>
                  <p className="text-muted-foreground text-sm">Total Items</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <DollarSign className="h-5 w-5 text-cg-sage" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalValue.toString())}
                  </p>
                  <p className="text-muted-foreground text-sm">Total Value</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MapPin className="h-5 w-5 text-cg-sage" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {items.filter((i) => i.current_location === 'child_traveling').length}
                  </p>
                  <p className="text-muted-foreground text-sm">Currently Traveling</p>
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
                className="bg-card border-border cursor-pointer hover:shadow-lg hover:border-cg-sage/50 transition-all duration-200"
                onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/${item.id}`)}
              >
                <CardContent className="pt-6">
                  {/* Item Photo */}
                  <div className="aspect-square bg-secondary rounded-lg mb-4 flex items-center justify-center overflow-hidden">
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
                  <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    {CATEGORY_LABELS[item.category]}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">
                      {formatCurrency(item.estimated_value)}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.current_location === 'child_traveling'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-secondary text-muted-foreground'
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
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  No items registered for {child?.first_name} yet.
                </p>
                <p className="text-muted-foreground/70 text-sm mb-6">
                  Add high-value items like electronics, school laptops, tablets, or sports equipment.
                </p>
                <Button
                  onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/new`)}
                  className="bg-cg-sage hover:bg-cg-sage/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </div>
  );
}

export default function ChildCubbiePage() {
  return (
    <ProtectedRoute>
      <ChildCubbiePageContent />
    </ProtectedRoute>
  );
}

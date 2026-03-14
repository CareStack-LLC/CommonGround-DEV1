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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <PageContainer className="pb-32">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--portal-primary)] transition-colors font-medium mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {child?.first_name}'s Profile
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              {child?.first_name}'s Cubbie
            </h1>
            <p className="mt-1 text-muted-foreground font-medium">
              Track high-value items that travel with {child?.first_name}
            </p>
          </div>
          <Button
            onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/new`)}
            className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white hover:shadow-lg hover:scale-105 transition-all duration-200 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg mb-8 p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cg-sage/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-cg-sage" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{items.length}</p>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Total Items</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cg-sage/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-cg-sage" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalValue.toString())}
                </p>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Total Value</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cg-sage/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-cg-sage" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {items.filter((i) => i.current_location === 'child_traveling').length}
                </p>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Traveling</p>
              </div>
            </div>
          </div>
        )}

        {/* Items Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-xl hover:border-[var(--portal-primary)]/30 transition-all duration-300 cursor-pointer overflow-hidden group"
                onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/${item.id}`)}
              >
                <div className="p-5">
                  {/* Item Photo */}
                  <div className="aspect-square bg-slate-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:scale-[1.02] transition-transform duration-300">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl filter drop-shadow-sm">
                        {CATEGORY_ICONS[item.category] || '📦'}
                      </span>
                    )}
                  </div>

                  {/* Item Details */}
                  <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-[var(--portal-primary)] transition-colors" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-3 font-medium">
                    {CATEGORY_LABELS[item.category]}
                  </p>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="font-bold text-foreground">
                      {formatCurrency(item.estimated_value)}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${item.current_location === 'child_traveling'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {item.current_location === 'child_traveling' ? 'Traveling' : 'Home'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-10 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Package className="h-10 w-10 text-[var(--portal-primary)]" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              No items registered for {child?.first_name} yet
            </h3>
            <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
              Add high-value items like electronics, school laptops, tablets, or sports equipment to keep track of them.
            </p>
            <Button
              onClick={() => router.push(`/family-files/${familyFileId}/children/${childId}/cubbie/new`)}
              className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-8 py-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add First Item
            </Button>
          </div>
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

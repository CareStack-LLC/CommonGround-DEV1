'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { walletAPI, ChildWallet } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { ContributeModal } from '@/components/wallet';
import {
  PiggyBank,
  Gift,
  ArrowLeft,
  TrendingUp,
  Users,
  Calendar,
  Heart,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface Contribution {
  id: string;
  amount: string;
  contributor_name: string;
  purpose: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function ChildWalletContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const childId = params.id as string;

  const [childWallet, setChildWallet] = useState<ChildWallet | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);

  useEffect(() => {
    if (user && childId) {
      loadChildWallet();
    }
  }, [user, childId]);

  const loadChildWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const walletData = await walletAPI.getChildWallet(childId);
      setChildWallet(walletData);

      const contributionsData = await walletAPI.getChildContributions(childId, { page_size: 50 });
      setContributions(contributionsData.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load child wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContributeSuccess = () => {
    setShowContributeModal(false);
    loadChildWallet();
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !childWallet) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-cg-error-subtle flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-cg-error" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Unable to Load Wallet
            </h2>
            <p className="text-muted-foreground mb-6">
              {error || 'Child wallet not found'}
            </p>
            <button
              onClick={() => router.back()}
              className="cg-btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const balance = parseFloat(childWallet.balance.available);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Header */}
      <header className="border-b border-border bg-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Wallet
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                <PiggyBank className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {childWallet.child_name}'s Savings
                </h1>
                <p className="text-muted-foreground">Child Wallet</p>
              </div>
            </div>
            <button
              onClick={() => setShowContributeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              <Gift className="h-4 w-4" />
              Send Money
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Balance Card */}
        <div className="cg-card-elevated p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <p className="text-sm text-purple-600 mb-2">Current Balance</p>
          <p className="text-4xl font-bold text-purple-700 font-mono tabular-nums">
            {formatCurrency(balance)}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Received</span>
              </div>
              <p className="font-mono text-lg font-medium text-foreground">
                {formatCurrency(childWallet.total_contributions)}
              </p>
            </div>
            <div className="p-4 bg-white/60 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Contributors</span>
              </div>
              <p className="font-mono text-lg font-medium text-foreground">
                {childWallet.contribution_count}
              </p>
            </div>
          </div>
        </div>

        {/* Contributions List */}
        <div className="cg-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Contributions
          </h2>

          {contributions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Contributions Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                Be the first to contribute to {childWallet.child_name}'s savings!
              </p>
              <button
                onClick={() => setShowContributeModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                <Gift className="h-4 w-4" />
                Send Money
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <Heart className="h-5 w-5 text-pink-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {contribution.contributor_name}
                        </p>
                        {contribution.purpose && (
                          <p className="text-sm text-muted-foreground">
                            {contribution.purpose === 'birthday' ? 'Birthday Gift' :
                             contribution.purpose === 'holiday' ? 'Holiday Gift' :
                             contribution.purpose === 'savings' ? 'Savings' :
                             contribution.purpose === 'education' ? 'Education' :
                             contribution.purpose}
                          </p>
                        )}
                        {contribution.message && (
                          <p className="text-sm text-muted-foreground mt-1 italic">
                            "{contribution.message}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(contribution.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-lg font-medium text-purple-600">
                      +{formatCurrency(contribution.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Contribute Modal */}
      {showContributeModal && childWallet && (
        <ContributeModal
          childWallet={childWallet}
          isGuest={false}
          onSuccess={handleContributeSuccess}
          onClose={() => setShowContributeModal(false)}
        />
      )}
    </div>
  );
}

export default function ChildWalletPage() {
  return (
    <ProtectedRoute>
      <ChildWalletContent />
    </ProtectedRoute>
  );
}

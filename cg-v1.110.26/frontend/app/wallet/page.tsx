'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  walletAPI,
  WalletWithBalance,
  WalletTransaction,
  Payout,
  ChildWallet,
  familyFilesAPI,
  FamilyFile
} from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import {
  WalletBalanceCard,
  TransactionList,
  DepositForm,
  ChildWalletCard,
  ContributeModal
} from '@/components/wallet';
import {
  Wallet,
  Plus,
  History,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  ExternalLink,
  AlertCircle,
  X,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

type TabType = 'overview' | 'transactions' | 'children' | 'payouts';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('familyFileId');
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletWithBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [childWallets, setChildWallets] = useState<ChildWallet[]>([]);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [selectedChildWallet, setSelectedChildWallet] = useState<ChildWallet | null>(null);

  // Check for onboarding completion
  const onboardingComplete = searchParams.get('onboarding') === 'complete';
  const walletIdFromUrl = searchParams.get('wallet_id');
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user, familyFileId]);

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (onboardingComplete && walletIdFromUrl) {
      // Sync wallet status with Stripe
      const syncWallet = async () => {
        try {
          await walletAPI.syncWallet(walletIdFromUrl);
          await loadWalletData();
          setShowOnboardingSuccess(true);
          // Clear URL params after handling
          router.replace('/wallet');
        } catch (err) {
          console.error('Failed to sync wallet:', err);
        }
      };
      syncWallet();
    }
  }, [onboardingComplete, walletIdFromUrl]);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load wallet
      try {
        const walletData = await walletAPI.getMyWallet();
        setWallet(walletData);

        // Load transactions if wallet exists
        if (walletData.id) {
          const txData = await walletAPI.getTransactions(walletData.id, { page_size: 20 });
          setTransactions(txData.items);
        }
      } catch (err: any) {
        // No wallet yet - that's ok
        if (!err.message?.includes('404')) {
          console.error('Wallet load error:', err);
        }
      }

      // Load payouts
      try {
        const payoutData = await walletAPI.getPayouts({ page_size: 10 });
        setPayouts(payoutData.items);
      } catch (err) {
        console.error('Payouts load error:', err);
      }

      // Load family files for child wallets
      try {
        const ffData = await familyFilesAPI.list();
        setFamilyFiles(ffData.items || []);

        // Load child wallets - if familyFileId provided, only load for that family
        const allChildWallets: ChildWallet[] = [];
        const filesToLoad = familyFileId
          ? (ffData.items || []).filter(ff => ff.id === familyFileId)
          : (ffData.items || []);

        for (const ff of filesToLoad) {
          try {
            const children = await walletAPI.getChildWallets(ff.id);
            allChildWallets.push(...children);
          } catch (err) {
            console.error('Child wallets load error:', err);
          }
        }
        setChildWallets(allChildWallets);
      } catch (err) {
        console.error('Family files load error:', err);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupWallet = async () => {
    try {
      setError(null);
      // Create wallet if doesn't exist
      let currentWallet = wallet;
      if (!currentWallet) {
        const createdWallet = await walletAPI.createWallet();
        // Add default balance to convert Wallet to WalletWithBalance
        currentWallet = {
          ...createdWallet,
          balance: { available: '0.00', pending: '0.00', total: '0.00', currency: 'usd' }
        };
        setWallet(currentWallet);
      }

      // Start onboarding
      const { onboarding_url } = await walletAPI.startOnboarding(currentWallet.id);
      window.location.href = onboarding_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start wallet setup');
    }
  };

  const handleDepositSuccess = (amount: number) => {
    setShowDepositModal(false);
    loadWalletData(); // Refresh data
  };

  const handleContribute = (childWallet: ChildWallet) => {
    setSelectedChildWallet(childWallet);
    setShowContributeModal(true);
  };

  const handleContributeSuccess = () => {
    setShowContributeModal(false);
    setSelectedChildWallet(null);
    loadWalletData();
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Onboarding Success Banner */}
      {showOnboardingSuccess && (
        <div className="bg-cg-success-subtle border-b border-cg-success/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-cg-success" />
                <p className="text-sm font-medium text-cg-success">
                  Wallet setup complete! You can now receive payments and manage funds.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardingSuccess(false)}
                className="text-cg-success hover:text-cg-success/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-cg-sage" />
                </div>
                My Wallet
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your ClearFund payments and child savings
              </p>
            </div>
            {wallet?.onboarding_completed && (
              <button
                onClick={() => router.push('/wallet/settings')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <p className="text-sm text-cg-error flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4 text-cg-error" />
            </button>
          </div>
        )}

        {/* Wallet Balance Card */}
        <WalletBalanceCard
          wallet={wallet}
          isLoading={isLoading}
          onSetupWallet={handleSetupWallet}
          onAddFunds={() => setShowDepositModal(true)}
          onViewTransactions={() => setActiveTab('transactions')}
        />

        {/* Tabs */}
        {wallet?.onboarding_completed && (
          <div className="flex items-center gap-2 p-1 bg-muted rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-cg-sage text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <Wallet className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-cg-sage text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <History className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('children')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'children'
                  ? 'bg-purple-600 text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <PiggyBank className="h-4 w-4" />
              Child Savings
              {childWallets.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  activeTab === 'children' ? 'bg-white/20' : 'bg-muted'
                }`}>
                  {childWallets.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'payouts'
                  ? 'bg-cg-success text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Payouts
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="cg-card p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              {wallet?.onboarding_completed && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="p-4 bg-cg-sage-subtle rounded-xl hover:bg-cg-sage/20 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cg-sage/20 flex items-center justify-center">
                        <Plus className="h-5 w-5 text-cg-sage" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Add Funds</p>
                        <p className="text-sm text-muted-foreground">Deposit money</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cg-sage transition-colors" />
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/payments')}
                    className="p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">ClearFund</p>
                        <p className="text-sm text-muted-foreground">Pay expenses</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </button>
                </div>
              )}

              {/* Recent Transactions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Recent Activity</h3>
                  {transactions.length > 0 && (
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-sm text-cg-sage hover:underline"
                    >
                      View all
                    </button>
                  )}
                </div>
                <TransactionList
                  transactions={transactions.slice(0, 5)}
                  isLoading={isLoading}
                  emptyMessage="No transactions yet. Add funds to get started."
                />
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <TransactionList
              transactions={transactions}
              isLoading={isLoading}
              emptyMessage="No transactions yet"
            />
          )}

          {activeTab === 'children' && (
            <div>
              {childWallets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <PiggyBank className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Child Savings</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Child wallets are created automatically for children in your family files.
                    Family and friends can contribute to help build their savings.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {childWallets.map((cw) => (
                    <ChildWalletCard
                      key={cw.child_id}
                      childWallet={cw}
                      onContribute={() => handleContribute(cw)}
                      onViewDetails={() => router.push(`/wallet/child/${cw.child_id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payouts' && (
            <div>
              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-cg-success-subtle flex items-center justify-center mx-auto mb-4">
                    <ArrowDownLeft className="h-8 w-8 text-cg-success" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No Payouts Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When ClearFund obligations are fully funded, payouts will automatically
                    be sent to your connected bank account.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-4 bg-card rounded-xl border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            Payout from Obligation
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payout.initiated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-medium text-cg-success">
                            +${parseFloat(payout.net_amount).toFixed(2)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            payout.status === 'completed'
                              ? 'bg-cg-success-subtle text-cg-success'
                              : payout.status === 'pending'
                              ? 'bg-cg-warning-subtle text-cg-warning'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {payout.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Deposit Modal */}
      {showDepositModal && wallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Add Funds</h2>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <DepositForm
                walletId={wallet.id}
                onSuccess={handleDepositSuccess}
                onCancel={() => setShowDepositModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && selectedChildWallet && (
        <ContributeModal
          childWallet={selectedChildWallet}
          isGuest={false}
          onSuccess={handleContributeSuccess}
          onClose={() => {
            setShowContributeModal(false);
            setSelectedChildWallet(null);
          }}
        />
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <WalletContent />
    </ProtectedRoute>
  );
}

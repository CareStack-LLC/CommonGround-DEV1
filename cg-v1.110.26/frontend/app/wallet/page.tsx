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
    if (onboardingComplete) {
      // Sync wallet status with Stripe after returning from onboarding
      const handleOnboardingComplete = async () => {
        try {
          // First try to sync using the wallet ID from URL
          if (walletIdFromUrl) {
            try {
              await walletAPI.syncWallet(walletIdFromUrl);
            } catch (err) {
              console.log('Sync with URL wallet ID failed, trying getMyWallet');
            }
          }
          // Load fresh wallet data
          await loadWalletData();
          setShowOnboardingSuccess(true);
          // Clear URL params after handling
          router.replace('/wallet');
        } catch (err) {
          console.error('Failed to complete onboarding:', err);
          // Still clear URL and try to load data
          router.replace('/wallet');
          await loadWalletData();
        }
      };
      handleOnboardingComplete();
    }
  }, [onboardingComplete]);

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
          current_balance: '0.00',
          available_balance: '0.00',
          is_ready_for_payments: false,
          is_ready_for_payouts: false,
        } as WalletWithBalance;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-24 lg:pb-8">
      <Navigation />

      {/* Onboarding Success Banner */}
      {showOnboardingSuccess && (
        <div className="bg-emerald-50 border-b-2 border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-700">
                  Wallet setup complete! You can now receive payments and manage funds.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardingSuccess(false)}
                className="text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
                  <Wallet className="h-6 w-6 text-[var(--portal-primary)]" />
                </div>
                My Wallet
              </h1>
              <p className="text-muted-foreground mt-1 font-medium">
                Manage your ClearFund payments and child savings
              </p>
            </div>
            {wallet?.onboarding_completed && (
              <button
                onClick={() => router.push('/wallet/settings')}
                className="p-3 bg-white border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg rounded-xl transition-all duration-300"
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
          <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl shadow-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="hover:bg-red-100 p-1 rounded-lg transition-colors">
              <X className="h-4 w-4 text-red-600" />
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('overview')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-muted-foreground hover:text-foreground hover:border-[var(--portal-primary)]/30 hover:shadow-lg'
              }`}
            >
              <Wallet className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'overview' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-muted-foreground hover:text-foreground hover:border-[var(--portal-primary)]/30 hover:shadow-lg'
              }`}
            >
              <History className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'transactions' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Transactions</span>
            </button>
            <button
              onClick={() => setActiveTab('children')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'children'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-muted-foreground hover:text-foreground hover:border-purple-300 hover:shadow-lg'
              }`}
            >
              <PiggyBank className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'children' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Child Savings</span>
              {childWallets.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'children' ? 'bg-white/20' : 'bg-purple-100 text-purple-600'
                }`}>
                  {childWallets.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'payouts'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md'
                  : 'bg-white border-2 border-slate-200 text-muted-foreground hover:text-foreground hover:border-emerald-300 hover:shadow-lg'
              }`}
            >
              <ArrowDownLeft className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'payouts' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Payouts</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              {wallet?.onboarding_completed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-[var(--portal-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Add Funds</p>
                        <p className="text-sm text-muted-foreground font-medium">Deposit money</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/payments')}
                    className="p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <ArrowUpRight className="h-6 w-6 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>ClearFund</p>
                        <p className="text-sm text-muted-foreground font-medium">Pay expenses</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </button>
                </div>
              )}

              {/* Recent Transactions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Recent Activity</h3>
                  {transactions.length > 0 && (
                    <button
                      onClick={() => setActiveTab('transactions')}
                      className="text-sm text-[var(--portal-primary)] hover:underline font-bold"
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
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                    <PiggyBank className="h-7 w-7 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Child Savings</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto font-medium">
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
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                    <ArrowDownLeft className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>No Payouts Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto font-medium">
                    When ClearFund obligations are fully funded, payouts will automatically
                    be sent to your connected bank account.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                            Payout from Obligation
                          </p>
                          <p className="text-sm text-muted-foreground font-medium">
                            {new Date(payout.initiated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-emerald-600">
                            +${parseFloat(payout.net_amount).toFixed(2)}
                          </p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border-2 ${
                            payout.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : payout.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200">
            <div className="p-6 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Add Funds</h2>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-300"
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

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
  CheckCircle,
  Scale
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
              // console.log('Sync with URL wallet ID failed, trying getMyWallet');
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

      // Load wallet, payouts, and family files in parallel
      const [walletResult, payoutsResult, ffResult] = await Promise.allSettled([
        walletAPI.getMyWallet(),
        walletAPI.getPayouts({ page_size: 10 }),
        familyFilesAPI.list(),
      ]);

      // Process wallet + transactions
      if (walletResult.status === 'fulfilled') {
        const walletData = walletResult.value;
        setWallet(walletData);
        if (walletData.id) {
          try {
            const txData = await walletAPI.getTransactions(walletData.id, { page_size: 20 });
            setTransactions(txData.items);
          } catch (err) {
            console.error('Transactions load error:', err);
          }
        }
      } else if (!walletResult.reason?.message?.includes('404')) {
        console.error('Wallet load error:', walletResult.reason);
      }

      // Process payouts
      if (payoutsResult.status === 'fulfilled') {
        setPayouts(payoutsResult.value.items);
      }

      // Process family files + child wallets in parallel
      if (ffResult.status === 'fulfilled') {
        const files = ffResult.value.items || [];
        setFamilyFiles(files);

        const filesToLoad = familyFileId
          ? files.filter(ff => ff.id === familyFileId)
          : files;

        // Fetch all child wallets in parallel instead of sequential loop
        const childWalletResults = await Promise.allSettled(
          filesToLoad.map(ff => walletAPI.getChildWallets(ff.id))
        );

        const allChildWallets: ChildWallet[] = [];
        for (const result of childWalletResults) {
          if (result.status === 'fulfilled') {
            allChildWallets.push(...result.value);
          }
        }
        setChildWallets(allChildWallets);
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
        try {
          const createdWallet = await walletAPI.createWallet();
          // Add default balance to convert Wallet to WalletWithBalance
          currentWallet = {
            ...createdWallet,
            current_balance: '0.00',
            available_balance: '0.00',
            is_ready_for_payments: false,
            is_ready_for_payouts: false,
          } as WalletWithBalance;
        } catch (createErr: any) {
          // Wallet may already exist (e.g. from a previous attempt) - try fetching it
          const existingWallet = await walletAPI.getMyWallet();
          if (existingWallet?.id) {
            currentWallet = existingWallet;
          } else {
            throw createErr;
          }
        }
        setWallet(currentWallet);
      }

      // Wave 4-Alt: Stripe Connect onboarding is retired. We no longer
      // redirect users off-site to complete KYC — funding is done directly
      // via Stripe Checkout when they pay an obligation. Route them back
      // to the wallet home with an info state instead of kicking off
      // onboarding that the backend will now 410.
      setError(
        'Good news — you don\u2019t need to connect a bank account anymore. CommonGround now uses virtual cards for shared expenses, so you just pay with your usual debit or credit card when it\u2019s time to fund a request.',
      );
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background pb-24 lg:pb-8">
      <Navigation />

      {/* Onboarding Success Banner */}
      {showOnboardingSuccess && (
        <div className="bg-[#E8F4F0] dark:bg-[#1E3A4A]/30 border-b-2 border-[#E8F4F0] dark:border-[#1E3A4A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#2D8A70]" />
                <p className="text-sm font-bold text-[#2D8A70]">
                  Wallet setup complete! You can now receive payments and manage funds.
                </p>
              </div>
              <button aria-label="Close"
                onClick={() => setShowOnboardingSuccess(false)}
                className="text-[#2D8A70] hover:text-[#1E3A4A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
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
                className="p-3 bg-card border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg rounded-xl transition-all duration-300"
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
          <div className="flex items-center gap-3 p-4 bg-[#FEE2E2] dark:bg-[#7A2222]/30 border-2 border-[#FEE2E2] dark:border-[#9B2C2C] rounded-2xl shadow-lg">
            <AlertCircle className="h-5 w-5 text-[#C53030] dark:text-[#E06B6B] flex-shrink-0" />
            <p className="text-sm text-[#9B2C2C] dark:text-[#FCA5A5] flex-1 font-medium">{error}</p>
            <button aria-label="Dismiss" onClick={() => setError(null)} className="hover:bg-[#FEE2E2] dark:hover:bg-[#7A2222]/30 p-1 rounded-lg transition-colors">
              <X className="h-4 w-4 text-[#C53030] dark:text-[#E06B6B]" />
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
                  ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white shadow-md'
                  : 'bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-[var(--portal-primary)]/30 hover:shadow-lg'
              }`}
            >
              <Wallet className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'overview' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white shadow-md'
                  : 'bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-[var(--portal-primary)]/30 hover:shadow-lg'
              }`}
            >
              <History className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'transactions' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Transactions</span>
            </button>
            <button
              onClick={() => setActiveTab('children')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'children'
                  ? 'bg-gradient-to-r from-[#2D6A8F] to-[#1E4E6B] text-white shadow-md'
                  : 'bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-[#4BA8C8] hover:shadow-lg'
              }`}
            >
              <PiggyBank className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'children' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Child Savings</span>
              {childWallets.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'children' ? 'bg-white/20' : 'bg-[#E0EFF8] text-[#2D6A8F]'
                }`}>
                  {childWallets.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`group flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === 'payouts'
                  ? 'bg-gradient-to-r from-[#2D8A70] to-[#2D8A70] text-white shadow-md'
                  : 'bg-card border-2 border-border text-muted-foreground hover:text-foreground hover:border-[#5BC4A0] hover:shadow-lg'
              }`}
            >
              <ArrowDownLeft className={`h-4 w-4 transition-transform duration-200 ${activeTab !== 'payouts' ? 'group-hover:scale-110' : ''}`} />
              <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Payouts</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              {wallet?.onboarding_completed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="p-5 bg-card rounded-2xl border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-6 w-6 text-[var(--portal-primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Add Funds</p>
                        <p className="text-sm text-muted-foreground font-medium">Deposit money</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/payments')}
                    className="p-5 bg-card rounded-2xl border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>ClearFund</p>
                        <p className="text-sm text-muted-foreground font-medium">Pay expenses</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </button>
                  {familyFiles.length > 0 && (
                    <button
                      onClick={() => {
                        const targetId = familyFileId || familyFiles[0]?.id;
                        if (targetId) router.push(`/family-files/${targetId}/child-support`);
                      }}
                      className="p-5 bg-gradient-to-br from-[#FEF7ED] to-card rounded-2xl border-2 border-[#FEF7ED] hover:border-[#F5A623] hover:shadow-xl transition-all duration-300 hover:scale-[1.01] text-left group relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#F5A623]/15 to-[#E09520]/10 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                          <Scale className="h-6 w-6 text-[#E09520]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground flex items-center gap-1.5" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                            Child Support
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#FEF7ED] text-[#E09520] uppercase tracking-wide">SDU</span>
                          </p>
                          <p className="text-sm text-muted-foreground font-medium">Log state disbursement payments</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#E09520] group-hover:text-[#E09520] group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Recent Transactions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Recent Activity</h3>
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
                  <div className="w-14 h-14 bg-gradient-to-br from-[#E0EFF8] to-[#E0EFF8] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                    <PiggyBank className="h-7 w-7 text-[#2D6A8F]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Child Savings</h3>
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
                  <div className="w-14 h-14 bg-gradient-to-br from-[#E8F4F0] to-[#E8F4F0] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                    <ArrowDownLeft className="h-7 w-7 text-[#2D8A70]" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>No Payouts Yet</h3>
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
                      className="p-4 bg-card rounded-xl border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                            Payout from Obligation
                          </p>
                          <p className="text-sm text-muted-foreground font-medium">
                            {new Date(payout.initiated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-[#2D8A70]">
                            +${parseFloat(payout.net_amount).toFixed(2)}
                          </p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border-2 ${
                            payout.status === 'completed'
                              ? 'bg-[#E8F4F0] text-[#2D8A70] border-[#E8F4F0]'
                              : payout.status === 'pending'
                              ? 'bg-[#FEF7ED] text-[#E09520] border-[#FEF7ED]'
                              : 'bg-muted text-muted-foreground border-border'
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
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-border">
            <div className="p-6 border-b-2 border-border bg-gradient-to-r from-muted/50 to-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Add Funds</h2>
                <button aria-label="Close"
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 hover:bg-muted rounded-xl transition-all duration-300"
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

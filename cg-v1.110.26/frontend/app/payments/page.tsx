'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, clearfundAPI, walletAPI, FamilyFile, Agreement, Obligation, BalanceSummary, ObligationMetrics, WalletWithBalance } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import ObligationCard from '@/components/clearfund/obligation-card';
import { AgreementTermsCard } from '@/components/clearfund/agreement-terms-card';
import { PayObligationModal } from '@/components/wallet';
import {
  Wallet,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronLeft,
  BarChart3,
  AlertCircle,
  CreditCard,
  ExternalLink,
  DollarSign,
} from 'lucide-react';

type TabType = 'pending' | 'active' | 'completed' | 'ledger';

interface FamilyFileWithAgreements {
  familyFile: FamilyFile;
  agreements: Agreement[];
}

/**
 * ClearFund - Transparent Co-Parenting Finances
 *
 * Design Philosophy: Clean fintech aesthetic
 * - Clear net balance visualization
 * - Monospace numbers for precision
 * - Professional, trustworthy interface
 * - Stress-free financial management
 */

// Format currency with monospace styling
function Currency({
  amount,
  size = 'default',
  positive,
}: {
  amount: number;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  positive?: boolean;
}) {
  const sizeClasses = {
    sm: 'text-sm',
    default: 'text-base',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const isPositive = positive !== undefined ? positive : amount >= 0;

  return (
    <span className={`font-mono tabular-nums font-semibold ${sizeClasses[size]} ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
      {isPositive ? '' : '-'}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// Net Balance Card with dashboard-matching design
function NetBalanceCard({
  balance,
  userId,
  isLoading,
}: {
  balance: BalanceSummary | null;
  userId: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="h-12 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Determine if user is petitioner (parent_a) or respondent (parent_b)
  const isPetitioner = balance?.petitioner_id === userId;

  // Calculate user-specific balances
  const totalOwedToUser = isPetitioner
    ? parseFloat(balance?.respondent_owes_petitioner || '0')
    : parseFloat(balance?.petitioner_owes_respondent || '0');

  const totalUserOwes = isPetitioner
    ? parseFloat(balance?.petitioner_owes_respondent || '0')
    : parseFloat(balance?.respondent_owes_petitioner || '0');

  // Net balance from user's perspective
  const netBalance = totalOwedToUser - totalUserOwes;
  const isOwed = netBalance > 0;

  // This month and overdue from backend
  const thisMonth = parseFloat(balance?.total_this_month || '0');
  const overdue = parseFloat(balance?.total_overdue || '0');

  return (
    <div className="bg-card rounded-2xl border-2 border-border shadow-lg overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F]" />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2 font-semibold">Net Balance</p>
            <div className="flex items-baseline gap-3">
              <Currency amount={Math.abs(netBalance)} size="xl" positive={isOwed} />
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                isOwed
                  ? 'bg-emerald-100 text-emerald-700'
                  : netBalance < 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {netBalance === 0 ? 'Balanced' : isOwed ? 'Owed to You' : 'You Owe'}
              </span>
            </div>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
            isOwed
              ? 'bg-gradient-to-br from-emerald-100 to-emerald-50'
              : netBalance < 0
              ? 'bg-gradient-to-br from-red-100 to-red-50'
              : 'bg-gradient-to-br from-muted to-muted/50'
          }`}>
            {isOwed ? (
              <TrendingUp className={`h-7 w-7 text-emerald-600`} />
            ) : netBalance < 0 ? (
              <TrendingDown className={`h-7 w-7 text-red-600`} />
            ) : (
              <DollarSign className={`h-7 w-7 text-muted-foreground`} />
            )}
          </div>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="border-t-2 border-border bg-muted/50 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Owed to You</p>
            <p className="font-mono text-lg text-emerald-600 tabular-nums font-bold">
              ${totalOwedToUser.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">You Owe</p>
            <p className="font-mono text-lg text-red-600 tabular-nums font-bold">
              ${totalUserOwes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">This Month</p>
            <p className="font-mono text-lg text-foreground tabular-nums font-bold">
              ${thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Overdue</p>
            <p className={`font-mono text-lg tabular-nums font-bold ${overdue > 0 ? 'text-red-600' : 'text-foreground'}`}>
              ${overdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metrics Row with dashboard-matching styling
function MetricsRow({
  metrics,
  isLoading,
}: {
  metrics: ObligationMetrics | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-2xl border-2 border-border shadow-lg p-4 animate-pulse">
            <div className="h-4 w-16 bg-muted rounded mb-2" />
            <div className="h-7 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Pending',
      value: metrics?.total_pending_funding || 0,
      icon: Clock,
      bg: 'bg-cg-amber-subtle',
      text: 'text-cg-amber',
    },
    {
      label: 'Active',
      value: metrics?.total_funded || 0,
      icon: ArrowUpRight,
      bg: 'bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
      text: 'text-[var(--portal-primary)]',
    },
    {
      label: 'Completed',
      value: metrics?.total_completed || 0,
      icon: CheckCircle,
      bg: 'bg-emerald-100',
      text: 'text-emerald-600',
    },
    {
      label: 'Overdue',
      value: metrics?.total_overdue || 0,
      icon: AlertTriangle,
      bg: 'bg-red-100',
      text: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card rounded-2xl border-2 border-border shadow-lg p-4 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-semibold">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} shadow-md`}>
              <stat.icon className={`h-5 w-5 ${stat.text}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [familyFilesWithAgreements, setFamilyFilesWithAgreements] = useState<FamilyFileWithAgreements[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFile | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [metrics, setMetrics] = useState<ObligationMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wallet state
  const [wallet, setWallet] = useState<WalletWithBalance | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);

  useEffect(() => {
    if (user) {
      loadFamilyFilesAndAgreements();
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    try {
      const walletData = await walletAPI.getMyWallet();
      setWallet(walletData);
    } catch (err) {
      // No wallet yet - that's ok
      console.log('No wallet found');
    }
  };

  useEffect(() => {
    if (selectedFamilyFile) {
      loadClearFundData();
    }
  }, [selectedFamilyFile, selectedAgreement]);

  const loadFamilyFilesAndAgreements = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const familyFilesResponse = await familyFilesAPI.list();
      const familyFiles = familyFilesResponse.items || [];

      const filesWithAgreements: FamilyFileWithAgreements[] = [];

      for (const ff of familyFiles) {
        try {
          const agreementsResponse = await agreementsAPI.listForFamilyFile(ff.id);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: agreementsResponse.items || [],
          });
        } catch (err) {
          console.error(`Failed to load agreements for family file ${ff.id}:`, err);
          filesWithAgreements.push({
            familyFile: ff,
            agreements: [],
          });
        }
      }

      setFamilyFilesWithAgreements(filesWithAgreements);

      if (filesWithAgreements.length > 0) {
        const firstWithAgreements = filesWithAgreements.find(f => f.agreements.length > 0);
        if (firstWithAgreements) {
          setSelectedFamilyFile(firstWithAgreements.familyFile);
          if (firstWithAgreements.agreements.length > 0) {
            setSelectedAgreement(firstWithAgreements.agreements[0]);
          }
        } else {
          setSelectedFamilyFile(filesWithAgreements[0].familyFile);
        }
      }
    } catch (err: any) {
      // If unauthorized, redirect to login
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load family files');
    } finally {
      setIsLoading(false);
    }
  };

  const loadClearFundData = async () => {
    if (!selectedFamilyFile) return;

    try {
      setIsLoading(true);
      setError(null);

      try {
        // Load all obligations for the family file
        const obligationsRes = await clearfundAPI.listObligations(
          selectedFamilyFile.id
        );
        setObligations(obligationsRes.items);
      } catch (err: any) {
        console.error('Failed to load obligations:', err);
        setObligations([]);
      }

      try {
        const balanceRes = await clearfundAPI.getBalance(selectedFamilyFile.id);
        setBalanceSummary(balanceRes);
      } catch (err: any) {
        console.error('Failed to load balance:', err);
        setBalanceSummary(null);
      }

      try {
        const metricsRes = await clearfundAPI.getMetrics(selectedFamilyFile.id);
        setMetrics(metricsRes);
      } catch (err: any) {
        console.error('Failed to load metrics:', err);
        setMetrics(null);
      }
    } catch (err: any) {
      console.error('ClearFund data load error:', err);
      setError(err.message || 'Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFamilyFileChange = (familyFileId: string) => {
    const item = familyFilesWithAgreements.find(f => f.familyFile.id === familyFileId);
    if (item) {
      setSelectedFamilyFile(item.familyFile);
      if (item.agreements.length > 0) {
        setSelectedAgreement(item.agreements[0]);
      } else {
        setSelectedAgreement(null);
      }
    }
  };

  const handleAgreementChange = (agreementId: string) => {
    if (!agreementId) {
      setSelectedAgreement(null);
      return;
    }
    const currentData = familyFilesWithAgreements.find(f => f.familyFile.id === selectedFamilyFile?.id);
    const agreement = currentData?.agreements.find(a => a.id === agreementId);
    if (agreement) {
      setSelectedAgreement(agreement);
    }
  };

  const getFilteredObligations = (): Obligation[] => {
    switch (activeTab) {
      case 'pending':
        return obligations.filter(o => ['open', 'partially_funded'].includes(o.status));
      case 'active':
        return obligations.filter(o => ['funded', 'pending_verification', 'verified'].includes(o.status));
      case 'completed':
        return obligations.filter(o => ['completed', 'cancelled', 'expired'].includes(o.status));
      default:
        return obligations;
    }
  };

  const handleObligationClick = (obligation: Obligation) => {
    router.push(`/payments/${obligation.id}`);
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  // Loading State
  if (isLoading && !selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-muted-foreground font-medium">Loading ClearFund...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wallet className="w-10 h-10 text-[var(--portal-primary)]" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Welcome to ClearFund
              </h2>
              <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
                Track shared expenses transparently and ensure fair splits for co-parenting costs.
              </p>
              <button
                onClick={() => router.push('/family-files')}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
              >
                <Users className="w-5 h-5" />
                Go to Family Files
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const filteredObligations = getFilteredObligations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted pb-32 lg:pb-8">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
                <Wallet className="w-6 h-6 text-[var(--portal-primary)]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  ClearFund
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-14">
              <Users className="h-4 w-4" />
              <span className="font-medium">{selectedFamilyFile.title}</span>
              {selectedAgreement && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{selectedAgreement.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Add Expense Button */}
          <button
            onClick={() => router.push('/payments/new')}
            className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Wallet Banner */}
        {!wallet?.onboarding_completed && (
          <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <CreditCard className="w-6 h-6 text-[var(--portal-primary)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  {wallet ? 'Complete Wallet Setup' : 'Set Up Payment Wallet'}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  {wallet
                    ? 'Finish connecting your bank account to send and receive ClearFund payments.'
                    : 'Connect your bank account to pay obligations and receive payouts instantly.'
                  }
                </p>
              </div>
              <button
                onClick={() => router.push('/wallet')}
                className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2 whitespace-nowrap"
              >
                <Wallet className="h-4 w-4" />
                {wallet ? 'Continue Setup' : 'Set Up Wallet'}
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wallet Quick Balance (if set up) */}
        {wallet?.onboarding_completed && (
          <div className="flex items-center justify-between p-5 bg-card rounded-2xl border-2 border-border shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center shadow-md">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-semibold">Wallet Balance</p>
                <p className="font-mono text-xl font-bold text-foreground">
                  ${parseFloat(wallet.available_balance || wallet.balance?.available || '0').toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/wallet')}
              className="text-sm text-[var(--portal-primary)] font-bold hover:underline flex items-center gap-1 transition-colors"
            >
              Manage Wallet
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Agreement Financial Terms */}
        {selectedFamilyFile && (
          <AgreementTermsCard familyFileId={selectedFamilyFile.id} />
        )}

        {/* Net Balance Card */}
        <NetBalanceCard
          balance={balanceSummary}
          userId={user?.id || ''}
          isLoading={isLoading}
        />

        {/* Metrics */}
        <MetricsRow metrics={metrics} isLoading={isLoading} />

        {/* Overdue Warning */}
        {metrics && metrics.total_overdue > 0 && (
          <div className="flex items-center gap-4 p-5 bg-card rounded-2xl border-2 border-red-200 shadow-lg">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shadow-md">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-700" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                {metrics.total_overdue} Overdue Obligation{metrics.total_overdue > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600 font-medium">
                Please address overdue items to maintain compliance.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-card rounded-2xl border-2 border-border shadow-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`
              group flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl
              transition-all duration-300 whitespace-nowrap flex-shrink-0
              ${activeTab === 'pending'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <Clock className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'pending' ? '' : 'group-hover:scale-110'}`} />
            <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Pending</span>
            {metrics && metrics.total_pending_funding > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {metrics.total_pending_funding}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`
              group flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl
              transition-all duration-300 whitespace-nowrap flex-shrink-0
              ${activeTab === 'active'
                ? 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <ArrowUpRight className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'active' ? '' : 'group-hover:scale-110'}`} />
            <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Active</span>
            {metrics && metrics.total_funded > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {metrics.total_funded}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`
              group flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl
              transition-all duration-300 whitespace-nowrap flex-shrink-0
              ${activeTab === 'completed'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <CheckCircle className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'completed' ? '' : 'group-hover:scale-110'}`} />
            <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Completed</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`
              group flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl
              transition-all duration-300 whitespace-nowrap flex-shrink-0
              ${activeTab === 'ledger'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            <BarChart3 className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'ledger' ? '' : 'group-hover:scale-110'}`} />
            <span style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Ledger</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-4 sm:p-6">
          {activeTab !== 'ledger' ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-muted-foreground font-medium">Loading obligations...</p>
                </div>
              ) : filteredObligations.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Receipt className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    No {activeTab} expenses
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 font-medium">
                    {activeTab === 'pending'
                      ? 'Create a new expense to get started.'
                      : activeTab === 'active'
                      ? 'No obligations are currently being processed.'
                      : 'No completed obligations yet.'}
                  </p>
                  {activeTab === 'pending' && (
                    <button
                      onClick={() => router.push('/payments/new')}
                      className="bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
                    >
                      <Plus className="h-5 w-5" />
                      Add Expense
                    </button>
                  )}
                </div>
              ) : (
                filteredObligations.map((obligation) => (
                  <ObligationCard
                    key={obligation.id}
                    obligation={obligation}
                    onClick={() => handleObligationClick(obligation)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="font-bold text-foreground mb-2 text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Transaction Ledger
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-medium">
                View the complete financial history for this family file.
              </p>
              <button
                onClick={() => router.push(`/payments/ledger?case_id=${selectedFamilyFile.id}`)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
              >
                <FileText className="h-5 w-5" />
                View Full Ledger
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Pay Obligation Modal */}
      {showPayModal && selectedObligation && (
        <PayObligationModal
          obligation={selectedObligation}
          wallet={wallet}
          userShare={parseFloat(
            balanceSummary?.petitioner_id === user?.id
              ? selectedObligation.petitioner_share
              : selectedObligation.respondent_share
          )}
          onSuccess={() => {
            setShowPayModal(false);
            setSelectedObligation(null);
            loadClearFundData();
            loadWallet();
          }}
          onClose={() => {
            setShowPayModal(false);
            setSelectedObligation(null);
          }}
        />
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}

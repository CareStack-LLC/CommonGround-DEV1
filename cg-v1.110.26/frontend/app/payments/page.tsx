'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, clearfundAPI, walletAPI, FamilyFile, Agreement, Obligation, BalanceSummary, ObligationMetrics, WalletWithBalance } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import ObligationCard from '@/components/clearfund/obligation-card';
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

// Net Balance Card with enhanced design
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
          <div className="h-12 w-48 bg-slate-200 rounded" />
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

  const gradientClass = isOwed
    ? 'from-emerald-500/10 to-emerald-600/5'
    : netBalance < 0
    ? 'from-red-500/10 to-red-600/5'
    : 'from-slate-100/50 to-slate-200/30';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`p-6 sm:p-8 bg-gradient-to-br ${gradientClass}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-2 font-medium">Net Balance</p>
            <div className="flex items-baseline gap-3">
              <Currency amount={Math.abs(netBalance)} size="xl" positive={isOwed} />
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                isOwed
                  ? 'bg-emerald-100 text-emerald-700'
                  : netBalance < 0
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {netBalance === 0 ? 'Balanced' : isOwed ? 'Owed to You' : 'You Owe'}
              </span>
            </div>
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${
            isOwed
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : netBalance < 0
              ? 'bg-gradient-to-br from-red-500 to-red-600'
              : 'bg-gradient-to-br from-slate-400 to-slate-500'
          }`}>
            {isOwed ? (
              <TrendingUp className="h-7 w-7 text-white" />
            ) : netBalance < 0 ? (
              <TrendingDown className="h-7 w-7 text-white" />
            ) : (
              <DollarSign className="h-7 w-7 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1.5 font-medium">Owed to You</p>
            <p className="font-mono text-lg text-emerald-600 tabular-nums font-semibold">
              ${totalOwedToUser.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5 font-medium">You Owe</p>
            <p className="font-mono text-lg text-red-600 tabular-nums font-semibold">
              ${totalUserOwes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5 font-medium">This Month</p>
            <p className="font-mono text-lg text-slate-900 tabular-nums font-semibold">
              ${thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5 font-medium">Overdue</p>
            <p className={`font-mono text-lg tabular-nums font-semibold ${overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              ${overdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metrics Row with enhanced styling
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
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-pulse">
            <div className="h-4 w-16 bg-slate-200 rounded mb-2" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
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
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Active',
      value: metrics?.total_funded || 0,
      icon: ArrowUpRight,
      gradient: 'from-[#2C5F5D] to-[#1f4644]',
      bg: 'bg-[#2C5F5D]/5',
      text: 'text-[#2C5F5D]',
    },
    {
      label: 'Completed',
      value: metrics?.total_completed || 0,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Overdue',
      value: metrics?.total_overdue || 0,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1.5 font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.bg} shadow-sm`}>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-14 h-14 border-3 border-[#2C5F5D] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-6 text-slate-600 font-medium">Loading ClearFund...</p>
            <p className="mt-2 text-sm text-slate-500">Syncing financial data</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md px-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Wallet className="h-12 w-12 text-[#2C5F5D]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Welcome to ClearFund
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Track shared expenses transparently and ensure fair splits for co-parenting costs.
            </p>
            <Link
              href="/family-files"
              className="
                inline-flex items-center gap-2 px-6 py-3
                bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white
                rounded-xl font-medium shadow-md hover:shadow-lg
                transition-all duration-200 hover:-translate-y-0.5
              "
            >
              <Users className="h-4 w-4" />
              Go to Family Files
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredObligations = getFilteredObligations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 pb-24 lg:pb-8">
      <Navigation />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] flex items-center justify-center shadow-md">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">
                  ClearFund
                </h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 ml-14">
                <Users className="h-4 w-4" />
                <span className="font-medium">{selectedFamilyFile.title}</span>
                {selectedAgreement && (
                  <>
                    <span className="text-slate-300">•</span>
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">{selectedAgreement.title}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Selectors */}
              {familyFilesWithAgreements.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedFamilyFile.id}
                    onChange={(e) => handleFamilyFileChange(e.target.value)}
                    className="
                      appearance-none bg-white border border-slate-200 rounded-xl
                      px-4 py-2.5 pr-10 text-sm font-medium text-slate-900
                      focus:outline-none focus:ring-2 focus:ring-[#2C5F5D]/20 focus:border-[#2C5F5D]
                      transition-all cursor-pointer hover:border-slate-300
                      shadow-sm
                    "
                  >
                    {familyFilesWithAgreements.map(item => (
                      <option key={item.familyFile.id} value={item.familyFile.id}>
                        {item.familyFile.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              )}

              {/* Add Expense Button */}
              <button
                onClick={() => router.push('/payments/new')}
                className="
                  group flex items-center gap-2 px-5 py-2.5
                  bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white
                  rounded-xl font-medium shadow-md hover:shadow-lg
                  transition-all duration-200 hover:-translate-y-0.5
                "
              >
                <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Wallet Banner */}
        {!wallet?.onboarding_completed && (
          <div className="bg-white rounded-2xl border border-[#2C5F5D]/20 shadow-sm p-4 sm:p-5 bg-gradient-to-r from-[#2C5F5D]/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] flex items-center justify-center flex-shrink-0 shadow-md">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">
                  {wallet ? 'Complete Wallet Setup' : 'Set Up Payment Wallet'}
                </h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  {wallet
                    ? 'Finish connecting your bank account to send and receive ClearFund payments.'
                    : 'Connect your bank account to pay obligations and receive payouts instantly.'
                  }
                </p>
              </div>
              <button
                onClick={() => router.push('/wallet')}
                className="
                  inline-flex items-center gap-2 px-5 py-2.5 whitespace-nowrap
                  bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white
                  rounded-xl font-medium shadow-md hover:shadow-lg
                  transition-all duration-200 hover:-translate-y-0.5
                "
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
          <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Wallet Balance</p>
                <p className="font-mono text-lg font-semibold text-slate-900">
                  ${parseFloat(wallet.available_balance || wallet.balance?.available || '0').toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/wallet')}
              className="text-sm text-[#2C5F5D] font-medium hover:underline flex items-center gap-1 transition-colors"
            >
              Manage Wallet
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
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
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">
                {metrics.total_overdue} Overdue Obligation{metrics.total_overdue > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600">
                Please address overdue items to maintain compliance.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`
              group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === 'pending'
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <Clock className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'pending' ? '' : 'group-hover:scale-110'}`} />
            <span>Pending</span>
            {metrics && metrics.total_pending_funding > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {metrics.total_pending_funding}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`
              group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === 'active'
                ? 'bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <ArrowUpRight className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'active' ? '' : 'group-hover:scale-110'}`} />
            <span>Active</span>
            {metrics && metrics.total_funded > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {metrics.total_funded}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`
              group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === 'completed'
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <CheckCircle className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'completed' ? '' : 'group-hover:scale-110'}`} />
            <span>Completed</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`
              group flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl
              transition-all duration-200 whitespace-nowrap flex-shrink-0
              ${activeTab === 'ledger'
                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }
            `}
          >
            <BarChart3 className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'ledger' ? '' : 'group-hover:scale-110'}`} />
            <span>Ledger</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          {activeTab !== 'ledger' ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-3 border-[#2C5F5D] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-slate-600 font-medium">Loading obligations...</p>
                </div>
              ) : filteredObligations.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 text-lg">
                    No {activeTab} expenses
                  </h3>
                  <p className="text-sm text-slate-600 mb-6">
                    {activeTab === 'pending'
                      ? 'Create a new expense to get started.'
                      : activeTab === 'active'
                      ? 'No obligations are currently being processed.'
                      : 'No completed obligations yet.'}
                  </p>
                  {activeTab === 'pending' && (
                    <button
                      onClick={() => router.push('/payments/new')}
                      className="
                        inline-flex items-center gap-2 px-6 py-3
                        bg-gradient-to-br from-[#2C5F5D] to-[#1f4644] text-white
                        rounded-xl font-medium shadow-md hover:shadow-lg
                        transition-all duration-200 hover:-translate-y-0.5
                      "
                    >
                      <Plus className="h-4 w-4" />
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <BarChart3 className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-lg">
                Transaction Ledger
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                View the complete financial history for this family file.
              </p>
              <button
                onClick={() => router.push(`/payments/ledger?case_id=${selectedFamilyFile.id}`)}
                className="
                  inline-flex items-center gap-2 px-6 py-3
                  bg-gradient-to-br from-purple-500 to-purple-600 text-white
                  rounded-xl font-medium shadow-md hover:shadow-lg
                  transition-all duration-200 hover:-translate-y-0.5
                "
              >
                <FileText className="h-4 w-4" />
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

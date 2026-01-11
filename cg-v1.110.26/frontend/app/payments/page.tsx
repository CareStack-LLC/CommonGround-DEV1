'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, agreementsAPI, clearfundAPI, walletAPI, FamilyFile, FamilyFileDetail, Agreement, Obligation, BalanceSummary, ObligationMetrics, WalletWithBalance } from '@/lib/api';
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
  BarChart3,
  AlertCircle,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

type TabType = 'pending' | 'active' | 'completed' | 'ledger';

interface FamilyFileWithAgreements {
  familyFile: FamilyFile;
  agreements: Agreement[];
}

/**
 * ClearFund - The Ledger
 *
 * Design Philosophy: Fintech aesthetic
 * - Large "Net Balance" card
 * - Transaction list with category icons
 * - Monospace numbers for precision
 * - Secure, calculated, premium feel
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
    <span className={`font-mono tabular-nums ${sizeClasses[size]} ${isPositive ? 'text-cg-success' : 'text-cg-error'}`}>
      {isPositive ? '' : '-'}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// Net Balance Card
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
      <div className="cg-card-elevated p-6 sm:p-8">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="h-10 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Determine if user is petitioner (parent_a) or respondent (parent_b)
  const isPetitioner = balance?.petitioner_id === userId;

  // Calculate user-specific balances
  // For petitioner: what respondent owes them, and what they owe respondent
  // For respondent: what petitioner owes them, and what they owe petitioner
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
    <div className="cg-card-elevated overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Net Balance</p>
            <div className="flex items-baseline gap-3">
              <Currency amount={Math.abs(netBalance)} size="xl" positive={isOwed} />
              <span className={`text-sm font-medium ${isOwed ? 'text-cg-success' : netBalance < 0 ? 'text-cg-error' : 'text-muted-foreground'}`}>
                {netBalance === 0 ? 'balanced' : isOwed ? 'owed to you' : 'you owe'}
              </span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isOwed ? 'bg-cg-success-subtle' : netBalance < 0 ? 'bg-cg-error-subtle' : 'bg-muted'
          }`}>
            {isOwed ? (
              <TrendingUp className="h-6 w-6 text-cg-success" />
            ) : netBalance < 0 ? (
              <TrendingDown className="h-6 w-6 text-cg-error" />
            ) : (
              <Receipt className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Owed to You</p>
            <p className="font-mono text-lg text-cg-success tabular-nums">
              ${totalOwedToUser.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total You Owe</p>
            <p className="font-mono text-lg text-cg-error tabular-nums">
              ${totalUserOwes.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="font-mono text-lg text-foreground tabular-nums">
              ${thisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Overdue</p>
            <p className={`font-mono text-lg tabular-nums ${overdue > 0 ? 'text-cg-error' : 'text-foreground'}`}>
              ${overdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metrics Row
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
          <div key={i} className="cg-card p-4 animate-pulse">
            <div className="h-4 w-16 bg-muted rounded mb-2" />
            <div className="h-6 w-12 bg-muted rounded" />
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
      color: 'text-cg-warning',
      bg: 'bg-cg-warning-subtle',
    },
    {
      label: 'Active',
      value: metrics?.total_funded || 0,
      icon: ArrowUpRight,
      color: 'text-cg-sage',
      bg: 'bg-cg-sage-subtle',
    },
    {
      label: 'Completed',
      value: metrics?.total_completed || 0,
      icon: CheckCircle,
      color: 'text-cg-success',
      bg: 'bg-cg-success-subtle',
    },
    {
      label: 'Overdue',
      value: metrics?.total_overdue || 0,
      icon: AlertTriangle,
      color: 'text-cg-error',
      bg: 'bg-cg-error-subtle',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="cg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Tab Button
function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth ${
        active
          ? `bg-${color} text-white`
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      style={active ? { backgroundColor: `var(--${color})` } : undefined}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
          active ? 'bg-white/20' : 'bg-muted'
        }`}>
          {count}
        </span>
      )}
    </button>
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
        // Load all obligations for the family file (don't filter by agreement)
        // This ensures consistency with metrics which also show all obligations
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
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-cg-sage border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading ClearFund...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (!selectedFamilyFile) {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md px-6">
            <div className="w-20 h-20 rounded-full bg-cg-sage-subtle flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-10 w-10 text-cg-sage" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Welcome to ClearFund
            </h2>
            <p className="text-muted-foreground mb-6">
              Create or join a Family File to start tracking shared expenses transparently.
            </p>
            <Link
              href="/family-files"
              className="cg-btn-primary inline-flex items-center gap-2"
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
  const currentFamilyFileData = familyFilesWithAgreements.find(f => f.familyFile.id === selectedFamilyFile.id);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-cg-sage" />
                </div>
                ClearFund
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Users className="h-4 w-4" />
                <span>{selectedFamilyFile.title}</span>
                {selectedAgreement && (
                  <>
                    <span className="text-border">•</span>
                    <FileText className="h-4 w-4" />
                    <span>{selectedAgreement.title}</span>
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
                    className="appearance-none bg-card border border-border rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage transition-smooth cursor-pointer"
                  >
                    {familyFilesWithAgreements.map(item => (
                      <option key={item.familyFile.id} value={item.familyFile.id}>
                        {item.familyFile.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              )}

              {/* Add Expense Button */}
              <button
                onClick={() => router.push('/payments/new')}
                className="cg-btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <p className="text-sm text-cg-error">{error}</p>
          </div>
        )}

        {/* Wallet Banner */}
        {!wallet?.onboarding_completed && (
          <div className="cg-card-elevated p-4 sm:p-5 bg-gradient-to-r from-cg-sage/10 to-cg-sage/5 border-cg-sage/20">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-6 w-6 text-cg-sage" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {wallet ? 'Complete Wallet Setup' : 'Set Up Payment Wallet'}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {wallet
                    ? 'Finish connecting your bank account to send and receive ClearFund payments.'
                    : 'Connect your bank account to pay obligations and receive payouts instantly.'
                  }
                </p>
              </div>
              <button
                onClick={() => router.push('/wallet')}
                className="cg-btn-primary inline-flex items-center gap-2 whitespace-nowrap"
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
          <div className="flex items-center justify-between p-4 bg-cg-success-subtle/50 rounded-xl border border-cg-success/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cg-success/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-cg-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="font-mono text-lg font-semibold text-foreground">
                  ${parseFloat(wallet.available_balance || wallet.balance?.available || '0').toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/wallet')}
              className="text-sm text-cg-sage font-medium hover:underline flex items-center gap-1"
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
          <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <div>
              <p className="font-medium text-cg-error">
                {metrics.total_overdue} Overdue Obligation{metrics.total_overdue > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-cg-error/80">
                Please address overdue items to maintain compliance.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-cg-warning text-white'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pending</span>
            {metrics && metrics.total_pending_funding > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === 'pending' ? 'bg-white/20' : 'bg-muted'
              }`}>
                {metrics.total_pending_funding}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-cg-sage text-white'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>Active</span>
            {metrics && metrics.total_funded > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === 'active' ? 'bg-white/20' : 'bg-muted'
              }`}>
                {metrics.total_funded}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-cg-success text-white'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Completed</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-smooth whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-purple-600 text-white'
                : 'text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Ledger</span>
          </button>
        </div>

        {/* Content */}
        <div className="cg-card p-4">
          {activeTab !== 'ledger' ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-cg-sage border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="mt-4 text-muted-foreground">Loading obligations...</p>
                </div>
              ) : filteredObligations.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    No {activeTab} expenses
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {activeTab === 'pending'
                      ? 'Create a new expense to get started.'
                      : activeTab === 'active'
                      ? 'No obligations are currently being processed.'
                      : 'No completed obligations yet.'}
                  </p>
                  {activeTab === 'pending' && (
                    <button
                      onClick={() => router.push('/payments/new')}
                      className="cg-btn-primary inline-flex items-center gap-2"
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
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Transaction Ledger
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                View the complete financial history for this family file.
              </p>
              <button
                onClick={() => router.push(`/payments/ledger?case_id=${selectedFamilyFile.id}`)}
                className="cg-btn-primary inline-flex items-center gap-2"
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

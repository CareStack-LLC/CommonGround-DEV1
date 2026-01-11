'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Upload,
  FileText,
  User,
  Calendar,
  Shield,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  clearfundAPI,
  Obligation,
  FundingStatus,
  Attestation,
  VerificationArtifact,
  LedgerEntry
} from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import FundingProgress from '@/components/clearfund/funding-progress';

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

const statusColors: Record<string, string> = {
  open: 'bg-cg-warning-subtle text-cg-warning',
  partially_funded: 'bg-cg-amber-subtle text-cg-amber',
  funded: 'bg-cg-sage-subtle text-cg-sage',
  pending_verification: 'bg-purple-100 text-purple-700',
  verified: 'bg-cg-success-subtle text-cg-success',
  completed: 'bg-cg-success-subtle text-cg-success',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-cg-error-subtle text-cg-error',
};

function ObligationDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [obligation, setObligation] = useState<Obligation | null>(null);
  const [fundingStatus, setFundingStatus] = useState<FundingStatus | null>(null);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [artifacts, setArtifacts] = useState<VerificationArtifact[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('');
  const [isFunding, setIsFunding] = useState(false);

  const obligationId = params.id as string;

  useEffect(() => {
    if (obligationId) {
      loadObligationData();
    }
  }, [obligationId]);

  const loadObligationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [obligationRes, fundingRes, attestationRes, artifactsRes] = await Promise.all([
        clearfundAPI.getObligation(obligationId),
        clearfundAPI.getFundingStatus(obligationId),
        clearfundAPI.getAttestation(obligationId).catch(() => null),
        clearfundAPI.listArtifacts(obligationId),
      ]);

      setObligation(obligationRes);
      setFundingStatus(fundingRes);
      setAttestation(attestationRes);
      setArtifacts(artifactsRes);

      // Fetch ledger entries for this obligation
      if (obligationRes.case_id) {
        try {
          const ledgerRes = await clearfundAPI.getLedger(obligationRes.case_id, 1, 100);
          // Filter to only entries for this obligation
          const obligationLedger = ledgerRes.items.filter(
            entry => entry.obligation_id === obligationId
          );
          setLedgerEntries(obligationLedger);
        } catch {
          // Ledger might not exist yet, that's ok
          setLedgerEntries([]);
        }
      }
    } catch (err: any) {
      console.error('Error loading obligation:', err);
      setError(err.message || 'Failed to load obligation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFund = async () => {
    if (!fundingAmount || parseFloat(fundingAmount) <= 0) return;

    try {
      setIsFunding(true);
      await clearfundAPI.recordFunding(obligationId, {
        amount: parseFloat(fundingAmount)
      });
      setShowFundingModal(false);
      setFundingAmount('');
      await loadObligationData();
    } catch (err: any) {
      setError(err.message || 'Failed to record funding');
    } finally {
      setIsFunding(false);
    }
  };

  const handleComplete = async () => {
    try {
      await clearfundAPI.completeObligation(obligationId);
      await loadObligationData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete obligation');
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason || reason.length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }

    try {
      await clearfundAPI.cancelObligation(obligationId, reason);
      await loadObligationData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel obligation');
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cg-sage border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading obligation...</p>
        </div>
      </div>
    );
  }

  if (!obligation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto p-8">
          <div className="cg-card-elevated p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Obligation Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This obligation may have been deleted or you don't have access.
            </p>
            <button onClick={() => router.push('/payments')} className="cg-btn-primary">
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  const needsFunding = ['open', 'partially_funded'].includes(obligation.status);
  const needsVerification = ['funded', 'pending_verification'].includes(obligation.status) && obligation.verification_required;
  const canComplete = obligation.status === 'verified' || (obligation.status === 'funded' && !obligation.verification_required);
  const canCancel = ['open', 'partially_funded'].includes(obligation.status);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <Navigation />

      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/payments')}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-smooth"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Payments
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-cg-sage" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{obligation.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[obligation.status]}`}>
                  {capitalizeFirst(obligation.status)}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 ml-[52px]">
                {capitalizeFirst(obligation.purpose_category)} &bull; {obligation.petitioner_percentage}/{100 - obligation.petitioner_percentage} split
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold font-mono tabular-nums text-foreground">
                {formatCurrency(obligation.total_amount)}
              </p>
              {obligation.is_overdue && (
                <span className="inline-flex items-center gap-1 text-cg-error text-sm mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <p className="text-sm text-cg-error">{error}</p>
          </div>
        )}

        {/* Funding Status */}
        <div className="cg-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-cg-success" />
            Funding Status
          </h2>

          <FundingProgress
            funded={parseFloat(obligation.amount_funded)}
            total={parseFloat(obligation.total_amount)}
            size="lg"
            className="mb-4"
          />

          {fundingStatus && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground">Petitioner Share</p>
                <p className="text-lg font-semibold font-mono text-foreground">{formatCurrency(obligation.petitioner_share)}</p>
                {fundingStatus.petitioner_funding && (
                  <p className={`text-sm ${fundingStatus.petitioner_funding.is_fully_funded ? 'text-cg-success' : 'text-cg-amber'}`}>
                    {fundingStatus.petitioner_funding.is_fully_funded
                      ? 'Fully funded'
                      : `${formatCurrency(fundingStatus.petitioner_funding.amount_funded)} funded`}
                  </p>
                )}
              </div>
              <div className="p-4 bg-muted/30 rounded-xl">
                <p className="text-sm text-muted-foreground">Respondent Share</p>
                <p className="text-lg font-semibold font-mono text-foreground">{formatCurrency(obligation.respondent_share)}</p>
                {fundingStatus.respondent_funding && (
                  <p className={`text-sm ${fundingStatus.respondent_funding.is_fully_funded ? 'text-cg-success' : 'text-cg-amber'}`}>
                    {fundingStatus.respondent_funding.is_fully_funded
                      ? 'Fully funded'
                      : `${formatCurrency(fundingStatus.respondent_funding.amount_funded)} funded`}
                  </p>
                )}
              </div>
            </div>
          )}

          {needsFunding && (
            <div className="mt-4">
              {showFundingModal ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    placeholder="Amount to fund"
                    className="flex-1 px-3 py-2.5 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cg-sage/20 focus:border-cg-sage transition-smooth"
                  />
                  <button onClick={handleFund} disabled={isFunding} className="cg-btn-primary">
                    {isFunding ? 'Processing...' : 'Confirm'}
                  </button>
                  <button onClick={() => setShowFundingModal(false)} className="cg-btn-secondary">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowFundingModal(true)} className="cg-btn-primary flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Fund My Share
                </button>
              )}
            </div>
          )}
        </div>

        {/* Transaction Ledger */}
        <div className="cg-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            Transaction Ledger
          </h2>

          {ledgerEntries.length > 0 ? (
            <div className="space-y-3">
              {ledgerEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50"
                >
                  <div className={`p-2 rounded-full ${
                    entry.entry_type === 'funding' || entry.entry_type === 'payment'
                      ? 'bg-cg-success-subtle'
                      : 'bg-cg-sage-subtle'
                  }`}>
                    {entry.entry_type === 'funding' || entry.entry_type === 'payment' ? (
                      <ArrowDownLeft className="h-4 w-4 text-cg-success" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-cg-sage" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.effective_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold font-mono ${
                      entry.entry_type === 'funding' || entry.entry_type === 'payment'
                        ? 'text-cg-success'
                        : 'text-foreground'
                    }`}>
                      {entry.entry_type === 'funding' || entry.entry_type === 'payment' ? '+' : ''}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(entry.running_balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Transactions will appear here when payments are made</p>
            </div>
          )}

          {/* Funding History from FundingStatus */}
          {fundingStatus && (fundingStatus.petitioner_funding?.funded_at || fundingStatus.respondent_funding?.funded_at) && ledgerEntries.length === 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-3">Funding Activity</p>
              <div className="space-y-2">
                {fundingStatus.petitioner_funding?.funded_at && parseFloat(fundingStatus.petitioner_funding.amount_funded) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-cg-success-subtle rounded-xl">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-cg-success" />
                      <span className="text-sm text-foreground">Petitioner funded</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium font-mono text-cg-success">
                        +{formatCurrency(fundingStatus.petitioner_funding.amount_funded)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(fundingStatus.petitioner_funding.funded_at)}
                      </p>
                    </div>
                  </div>
                )}
                {fundingStatus.respondent_funding?.funded_at && parseFloat(fundingStatus.respondent_funding.amount_funded) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-cg-success-subtle rounded-xl">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-cg-success" />
                      <span className="text-sm text-foreground">Respondent funded</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium font-mono text-cg-success">
                        +{formatCurrency(fundingStatus.respondent_funding.amount_funded)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(fundingStatus.respondent_funding.funded_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="cg-card p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-cg-slate" />
            Details
          </h2>

          <div className="space-y-4">
            {obligation.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground">{obligation.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(obligation.due_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-foreground">{formatDate(obligation.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="text-foreground">{capitalizeFirst(obligation.source_type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requirements</p>
                <p className="text-foreground">
                  {obligation.verification_required ? 'Verification required' : 'No verification needed'}
                  {obligation.receipt_required && ' • Receipt required'}
                </p>
              </div>
            </div>

            {obligation.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-foreground">{obligation.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Attestation */}
        {attestation && (
          <div className="cg-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Attestation
            </h2>

            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-purple-800 font-medium mb-2">Sworn Statement</p>
              <p className="text-purple-900">{attestation.attestation_text}</p>
              <p className="text-sm text-purple-600 mt-2">
                Attested on {formatDate(attestation.attested_at)}
              </p>
            </div>
          </div>
        )}

        {/* Verification Artifacts */}
        {artifacts.length > 0 && (
          <div className="cg-card p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-cg-success" />
              Verification Artifacts
            </h2>

            <div className="space-y-3">
              {artifacts.map(artifact => (
                <div key={artifact.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <div className="p-2 bg-card rounded-lg border border-border">
                    {artifact.artifact_type === 'receipt' ? (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{capitalizeFirst(artifact.artifact_type)}</p>
                    {artifact.vendor_name && (
                      <p className="text-sm text-muted-foreground">{artifact.vendor_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(artifact.amount_verified)} verified on {formatDate(artifact.verified_at)}
                    </p>
                  </div>
                  {artifact.receipt_url && (
                    <a
                      href={artifact.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cg-btn-secondary text-sm py-1.5 px-3"
                    >
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {needsVerification && (
            <button onClick={() => router.push(`/payments/${obligationId}/verify`)} className="cg-btn-primary flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Receipt
            </button>
          )}
          {canComplete && (
            <button onClick={handleComplete} className="cg-btn-primary flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Mark Complete
            </button>
          )}
          {canCancel && (
            <button onClick={handleCancel} className="px-4 py-2.5 text-cg-error border border-cg-error/30 rounded-xl hover:bg-cg-error-subtle transition-smooth">
              Cancel Obligation
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ObligationDetailPage() {
  return (
    <ProtectedRoute>
      <ObligationDetailContent />
    </ProtectedRoute>
  );
}

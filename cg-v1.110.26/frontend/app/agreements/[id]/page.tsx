'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { agreementsAPI, Agreement, AgreementSection, AgreementQuickSummary } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import {
  FileText,
  Sparkles,
  CheckCircle,
  Pencil,
  ArrowLeft,
  Download,
  Power,
  PowerOff,
  Trash2,
  Send,
  Clock,
  AlertCircle,
  FileSignature,
  Loader2,
  ChevronDown,
  ChevronUp,
  Quote,
  Edit3,
  Calendar,
} from 'lucide-react';

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

// Map backend section types to wizard section indexes for editing
function getSectionEditIndex(sectionType: string, sectionNumber: string): number {
  const mappings: Record<string, number> = {
    'basic_info_1': 1,
    'custody_2': 4,
    'custody_3': 5,
    'schedule_4': 6,
    'schedule_5': 7,
    'schedule_6': 15,
    'logistics_8': 8,
    'decision_making_9': 18,
    'decision_making_10': 12,
    'decision_making_11': 11,
    'financial_14': 10,
    'financial_15': 10,
    'communication_16': 13,
    'legal_17': 17,
    'legal_18': 16,
  };

  const key = `${sectionType}_${sectionNumber}`;
  return mappings[key] ?? -1;
}

// Helper to format structured data into human-readable summary
function formatSectionSummary(section: AgreementSection): string | null {
  if (section.content && !section.content.startsWith('{')) {
    return section.content;
  }

  const data = section.structured_data;
  if (!data) return null;

  try {
    const sectionData = typeof data === 'string' ? JSON.parse(data) : data;

    switch (section.section_type) {
      case 'physical_custody':
      case 'custody': {
        const pc = sectionData.physical_custody || sectionData;
        const parts = [];
        if (pc.arrangement_type) parts.push(pc.arrangement_type);
        if (pc.percentage_split) parts.push(`${pc.percentage_split} split`);
        if (pc.primary_residential_parent) parts.push(`Primary: ${pc.primary_residential_parent}`);
        if (pc.time_split) parts.push(`${pc.time_split} time split`);
        if (pc.schedule_type) parts.push(pc.schedule_type.replace(/_/g, ' '));
        return parts.length > 0 ? parts.join(' • ') : null;
      }

      case 'parenting_schedule':
      case 'schedule': {
        const ps = sectionData.parenting_schedule || sectionData.regular_schedule || sectionData;
        const parts = [];
        if (ps.weekly_pattern) parts.push(ps.weekly_pattern);
        if (ps.type) parts.push(ps.type.replace(/_/g, ' '));
        if (ps.exchange_day) parts.push(`Exchange: ${ps.exchange_day}`);
        if (ps.exchange_time) parts.push(`at ${ps.exchange_time}`);
        return parts.length > 0 ? parts.join(' • ') : null;
      }

      case 'holiday_schedule': {
        const hs = sectionData.holiday_schedule || sectionData.holidays || sectionData;
        const holidays = Object.entries(hs)
          .filter(([_, v]) => v && typeof v === 'string' && v !== '')
          .slice(0, 4)
          .map(([k, _]) => k.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));
        return holidays.length > 0
          ? `Holidays covered: ${holidays.join(', ')}`
          : 'Holiday schedule configured';
      }

      case 'education': {
        const ed = sectionData.education || sectionData;
        const parts = [];
        if (ed.current_school) parts.push(ed.current_school);
        if (ed.school_district) parts.push(ed.school_district);
        if (ed.school_choice) parts.push(`School decisions: ${ed.school_choice}`);
        if (ed.conferences === 'Yes') parts.push('Both attend conferences');
        return parts.length > 0 ? parts.join(' • ') : 'Education provisions configured';
      }

      case 'healthcare':
      case 'medical_healthcare': {
        const hc = sectionData.medical_healthcare || sectionData;
        const parts = [];
        if (hc.insurance_provider) parts.push(`Insurance: ${hc.insurance_provider}`);
        if (hc.primary_pediatrician) parts.push(hc.primary_pediatrician);
        if (hc.medical_records_access === 'Yes') parts.push('Shared medical records access');
        if (hc.cost_sharing) parts.push(`Costs: ${hc.cost_sharing}`);
        return parts.length > 0 ? parts.join(' • ') : 'Healthcare provisions configured';
      }

      case 'child_support':
      case 'financial': {
        const cs = sectionData.child_support || sectionData;
        const parts = [];
        if (cs.monthly_amount) parts.push(`$${cs.monthly_amount}/month`);
        if (cs.paying_parent) parts.push(`Paid by ${cs.paying_parent.split(' ')[0]}`);
        if (cs.has_support === 'Yes') parts.push('Child support established');
        if (cs.payment_method) parts.push(`via ${cs.payment_method}`);
        return parts.length > 0 ? parts.join(' • ') : 'Financial provisions configured';
      }

      case 'expenses': {
        const exp = sectionData.shared_expenses || sectionData;
        const shared = Object.entries(exp)
          .filter(([_, v]) => v === '50/50')
          .map(([k, _]) => k.replace(/_/g, ' '));
        return shared.length > 0
          ? `50/50 split: ${shared.slice(0, 3).join(', ')}`
          : 'Expense sharing configured';
      }

      case 'dispute_resolution': {
        const dr = sectionData.dispute_resolution || sectionData;
        const parts = [];
        if (dr.first_step) parts.push(`First: ${dr.first_step}`);
        if (dr.mediation_required === 'Yes') parts.push('Mediation required');
        if (dr.steps) parts.push(dr.steps.map((s: any) => s.method || s).join(' → '));
        return parts.length > 0 ? parts.join(' • ') : 'Dispute resolution process defined';
      }

      case 'communication': {
        const comm = sectionData.parent_communication || sectionData;
        const parts = [];
        if (comm.primary_method) parts.push(`Via ${comm.primary_method}`);
        if (comm.response_time_hours) parts.push(`${comm.response_time_hours}h response time`);
        return parts.length > 0 ? parts.join(' • ') : 'Communication guidelines set';
      }

      case 'basic_info': {
        const bi = sectionData;
        const parts = [];
        if (bi.parent_a?.name) parts.push(bi.parent_a.name);
        if (bi.parent_b?.name) parts.push(bi.parent_b.name);
        if (bi.children?.length)
          parts.push(`${bi.children.length} child${bi.children.length > 1 ? 'ren' : ''}`);
        return parts.length > 0 ? parts.join(' & ') : null;
      }

      case 'legal':
      case 'legal_custody': {
        const lc = sectionData;
        const parts = [];
        if (lc.custody_type) parts.push(lc.custody_type.replace(/_/g, ' '));
        if (lc.tie_breaker) parts.push(`Tie-breaker: ${lc.tie_breaker}`);
        return parts.length > 0 ? parts.join(' • ') : 'Legal custody defined';
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/* =============================================================================
   HELPER COMPONENTS - Editorial/Legal Aesthetic
   ============================================================================= */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    active: {
      icon: <CheckCircle className="h-4 w-4" />,
      className: 'bg-cg-success text-white',
      label: 'Active',
    },
    approved: {
      icon: <CheckCircle className="h-4 w-4" />,
      className: 'bg-cg-sage text-white',
      label: 'Approved',
    },
    pending_approval: {
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-cg-amber text-white',
      label: 'Pending Approval',
    },
    draft: {
      icon: <FileText className="h-4 w-4" />,
      className: 'bg-cg-slate text-white',
      label: 'Draft',
    },
    inactive: {
      icon: <PowerOff className="h-4 w-4" />,
      className: 'bg-muted text-muted-foreground',
      label: 'Inactive',
    },
    rejected: {
      icon: <AlertCircle className="h-4 w-4" />,
      className: 'bg-cg-error text-white',
      label: 'Rejected',
    },
  };

  const { icon, className, label } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function ApprovalTracker({
  approvedByA,
  approvedByB,
}: {
  approvedByA: boolean;
  approvedByB: boolean;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            approvedByA ? 'bg-cg-success text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {approvedByA ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-medium">A</span>}
        </div>
        <span className={`text-sm ${approvedByA ? 'text-cg-success font-medium' : 'text-muted-foreground'}`}>
          Parent A {approvedByA ? 'Approved' : 'Pending'}
        </span>
      </div>
      <div className="h-px w-8 bg-border" />
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            approvedByB ? 'bg-cg-success text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {approvedByB ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-medium">B</span>}
        </div>
        <span className={`text-sm ${approvedByB ? 'text-cg-success font-medium' : 'text-muted-foreground'}`}>
          Parent B {approvedByB ? 'Approved' : 'Pending'}
        </span>
      </div>
    </div>
  );
}

function AgreementSectionCard({
  section,
  sectionIndex,
  canEdit,
  onEdit,
}: {
  section: AgreementSection;
  sectionIndex: number;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = formatSectionSummary(section);

  return (
    <div
      className={`border-l-4 transition-all duration-200 ${
        section.is_completed
          ? 'border-l-cg-sage bg-card'
          : 'border-l-muted bg-muted/30'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Paragraph Number */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cg-sand flex items-center justify-center">
            <span className="font-mono text-sm font-semibold text-muted-foreground">
              §{sectionIndex}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">
                  {section.section_title}
                </h3>
                {section.is_required && (
                  <span className="text-xs text-cg-amber font-medium">Required</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {section.is_completed ? (
                  <span className="px-2.5 py-1 bg-cg-success-subtle text-cg-success text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                    Incomplete
                  </span>
                )}

                {canEdit && (
                  <button
                    onClick={onEdit}
                    className="p-2 rounded-lg hover:bg-cg-sage-subtle text-muted-foreground hover:text-cg-sage transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <p className="font-serif text-muted-foreground mt-3 leading-relaxed">
                {summary}
              </p>
            )}

            {!section.content && !section.structured_data && !section.is_completed && (
              <p className="text-sm text-muted-foreground/60 mt-2 italic">
                This section has not been completed yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  isLoading,
  disabled,
  variant = 'primary',
  icon,
  loadingText,
  children,
}: {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  icon: React.ReactNode;
  loadingText?: string;
  children: React.ReactNode;
}) {
  const variantClasses = {
    primary: 'cg-btn-primary',
    secondary: 'cg-btn-secondary',
    success: 'bg-cg-success text-white hover:bg-cg-success/90 px-6 py-3 rounded-full font-medium transition-all duration-200',
    danger: 'bg-cg-error text-white hover:bg-cg-error/90 px-6 py-3 rounded-full font-medium transition-all duration-200',
    warning: 'bg-cg-amber text-white hover:bg-cg-amber/90 px-6 py-3 rounded-full font-medium transition-all duration-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`${variantClasses[variant]} flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

function AgreementDetailsContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const agreementId = params.id as string;

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [sections, setSections] = useState<AgreementSection[]>([]);
  const [summary, setSummary] = useState<AgreementQuickSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgreement();
  }, [agreementId]);

  const loadAgreement = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await agreementsAPI.get(agreementId);
      setAgreement(data.agreement);
      setSections(data.sections);

      try {
        const summaryData = await agreementsAPI.getQuickSummary(agreementId);
        setSummary(summaryData);
      } catch {
        // Summary may fail if AI is unavailable
      }
    } catch (err: any) {
      console.error('Failed to load agreement:', err);
      setError(err.message || 'Failed to load agreement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsApproving(true);
      setError(null);

      const data = await agreementsAPI.submit(agreementId);
      setAgreement(data.agreement);
      setSections(data.sections);
    } catch (err: any) {
      console.error('Failed to submit agreement:', err);
      setError(err.message || 'Failed to submit agreement');
    } finally {
      setIsApproving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      setError(null);

      const data = await agreementsAPI.approve(agreementId);
      setAgreement(data.agreement);
      setSections(data.sections);
    } catch (err: any) {
      console.error('Failed to approve agreement:', err);
      setError(err.message || 'Failed to approve agreement');
    } finally {
      setIsApproving(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      setError(null);

      const pdfBlob = await agreementsAPI.generatePDF(agreementId);

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${agreement?.title || 'agreement'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleActivate = async () => {
    try {
      setIsActivating(true);
      setError(null);

      const data = await agreementsAPI.activate(agreementId);
      setAgreement(data.agreement);
      setSections(data.sections);
    } catch (err: any) {
      console.error('Failed to activate agreement:', err);
      setError(err.message || 'Failed to activate agreement');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this agreement?')) {
      return;
    }

    try {
      setIsActivating(true);
      setError(null);

      const data = await agreementsAPI.deactivate(agreementId);
      setAgreement(data.agreement);
      setSections(data.sections);
    } catch (err: any) {
      console.error('Failed to deactivate agreement:', err);
      setError(err.message || 'Failed to deactivate agreement');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft agreement? This cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await agreementsAPI.delete(agreementId);

      if (agreement?.case_id) {
        router.push(`/cases/${agreement.case_id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Failed to delete agreement:', err);
      setError(err.message || 'Failed to delete agreement');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasUserApproved = () => {
    if (!agreement || !user) return false;
    return agreement.approved_by_a === user.id || agreement.approved_by_b === user.id;
  };

  const canApprove = () => {
    if (!agreement || !user) return false;
    if (agreement.status !== 'pending_approval' && agreement.status !== 'draft') return false;
    return !hasUserApproved();
  };

  const completedSections = sections.filter((s) => s.is_completed).length;
  const completionPercent = sections.length > 0 ? Math.round((completedSections / sections.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-cg-sand">
      <Navigation />

      {/* Back Button */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/agreements"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cg-sage transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agreements
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-cg-sage mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading agreement...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="cg-card p-6 bg-cg-error-subtle border-cg-error/20">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-cg-error flex-shrink-0" />
              <div>
                <p className="font-semibold text-cg-error">Error Loading Agreement</p>
                <p className="text-sm text-cg-error/80 mt-1">{error}</p>
              </div>
            </div>
            <button onClick={loadAgreement} className="mt-4 cg-btn-secondary">
              Try Again
            </button>
          </div>
        )}

        {/* Agreement Content */}
        {!isLoading && agreement && (
          <div className="space-y-8">
            {/* Document Header - Paper Texture Background */}
            <div className="cg-card overflow-hidden">
              {/* Decorative Header Bar */}
              <div className="h-2 bg-gradient-to-r from-cg-sage via-cg-amber to-cg-sage" />

              <div className="p-8">
                {/* Title and Status */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <FileSignature className="h-6 w-6 text-cg-sage" />
                      <span className="text-sm text-muted-foreground font-mono">
                        Version {agreement.version}
                      </span>
                    </div>
                    <h1 className="font-serif text-3xl font-bold text-foreground">
                      {agreement.title}
                    </h1>
                  </div>
                  <StatusBadge status={agreement.status} />
                </div>

                {/* Meta Information */}
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground border-t border-border pt-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Created {new Date(agreement.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {agreement.effective_date && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-cg-success" />
                      <span>
                        Effective {new Date(agreement.effective_date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Approval Tracker */}
                {agreement.status === 'pending_approval' && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-4">Approval Status</p>
                    <ApprovalTracker
                      approvedByA={!!agreement.approved_by_a}
                      approvedByB={!!agreement.approved_by_b}
                    />
                  </div>
                )}

                {/* Completion Progress */}
                {sections.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {completedSections} of {sections.length} sections complete
                      </span>
                      <span className="font-semibold text-foreground">{completionPercent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cg-sage rounded-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary Card */}
            {summary && summary.completion_percentage > 0 && (
              <div className="cg-card p-6 bg-cg-amber-subtle/30 border-cg-amber/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cg-amber flex items-center justify-center flex-shrink-0 aria-glow">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">ARIA Summary</h3>
                    <p className="font-serif text-muted-foreground leading-relaxed">
                      {summary.summary}
                    </p>

                    {summary.key_points && summary.key_points.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-cg-amber/20">
                        <p className="text-sm font-medium text-foreground mb-2">Key Terms:</p>
                        <ul className="space-y-1.5">
                          {summary.key_points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-cg-success flex-shrink-0 mt-0.5" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Card */}
            <div className="cg-card p-6">
              <h3 className="font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                {/* Draft Actions */}
                {agreement.status === 'draft' && (
                  <>
                    <ActionButton
                      onClick={handleSubmit}
                      isLoading={isApproving}
                      variant="success"
                      icon={<Send className="h-4 w-4" />}
                      loadingText="Submitting..."
                    >
                      Submit for Approval
                    </ActionButton>
                    <ActionButton
                      onClick={() => router.push(`/agreements/${agreementId}/builder`)}
                      variant="secondary"
                      icon={<Edit3 className="h-4 w-4" />}
                    >
                      Continue Editing
                    </ActionButton>
                    <ActionButton
                      onClick={handleDelete}
                      isLoading={isDeleting}
                      variant="danger"
                      icon={<Trash2 className="h-4 w-4" />}
                      loadingText="Deleting..."
                    >
                      Delete Draft
                    </ActionButton>
                  </>
                )}

                {/* Pending Approval Actions */}
                {agreement.status === 'pending_approval' && (
                  <>
                    {canApprove() ? (
                      <ActionButton
                        onClick={handleApprove}
                        isLoading={isApproving}
                        variant="success"
                        icon={<CheckCircle className="h-4 w-4" />}
                        loadingText="Approving..."
                      >
                        Approve Agreement
                      </ActionButton>
                    ) : hasUserApproved() ? (
                      <div className="p-4 bg-cg-sage-subtle rounded-xl text-center">
                        <CheckCircle className="h-6 w-6 text-cg-sage mx-auto mb-2" />
                        <p className="text-sm font-medium text-cg-sage">You've approved this agreement</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Waiting for the other parent's approval
                        </p>
                      </div>
                    ) : null}
                  </>
                )}

                {/* Approved Actions */}
                {agreement.status === 'approved' && (
                  <>
                    <ActionButton
                      onClick={handleActivate}
                      isLoading={isActivating}
                      variant="success"
                      icon={<Power className="h-4 w-4" />}
                      loadingText="Activating..."
                    >
                      Activate Agreement
                    </ActionButton>
                    <ActionButton
                      onClick={handleGeneratePDF}
                      isLoading={isGeneratingPDF}
                      variant="secondary"
                      icon={<Download className="h-4 w-4" />}
                      loadingText="Generating..."
                    >
                      Download PDF
                    </ActionButton>
                  </>
                )}

                {/* Active Actions */}
                {agreement.status === 'active' && (
                  <>
                    <div className="p-4 bg-cg-success-subtle rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-cg-success" />
                        <div>
                          <p className="font-medium text-cg-success">Agreement is Active</p>
                          {agreement.effective_date && (
                            <p className="text-xs text-cg-success/80">
                              Effective since {new Date(agreement.effective_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <ActionButton
                      onClick={handleGeneratePDF}
                      isLoading={isGeneratingPDF}
                      variant="secondary"
                      icon={<Download className="h-4 w-4" />}
                      loadingText="Generating..."
                    >
                      Download PDF
                    </ActionButton>
                    <ActionButton
                      onClick={handleDeactivate}
                      isLoading={isActivating}
                      variant="warning"
                      icon={<PowerOff className="h-4 w-4" />}
                      loadingText="Deactivating..."
                    >
                      Deactivate Agreement
                    </ActionButton>
                  </>
                )}
              </div>
            </div>

            {/* Sections - The Living Document */}
            <div className="cg-card overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-foreground">
                      Agreement Sections
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      The terms and conditions of your parenting agreement
                    </p>
                  </div>
                  {agreement.status === 'draft' && (
                    <button
                      onClick={() => router.push(`/agreements/${agreementId}/builder`)}
                      className="cg-btn-secondary text-sm py-2 px-4"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit All
                    </button>
                  )}
                </div>
              </div>

              {sections.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No sections completed yet</p>
                  <button
                    onClick={() => router.push(`/agreements/${agreementId}/builder`)}
                    className="cg-btn-primary"
                  >
                    Start Building
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {sections.map((section, index) => {
                    const editIndex = getSectionEditIndex(section.section_type, section.section_number);
                    const canEdit = agreement.status === 'draft' && editIndex >= 0;

                    return (
                      <AgreementSectionCard
                        key={section.id}
                        section={section}
                        sectionIndex={index + 1}
                        canEdit={canEdit}
                        onEdit={() => router.push(`/agreements/${agreementId}/builder?section=${editIndex}`)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating Propose Change Button - Future Feature */}
            {agreement.status === 'active' && (
              <div className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8">
                <button
                  className="w-14 h-14 rounded-full bg-cg-amber text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center aria-glow"
                  title="Propose Change (Coming Soon)"
                  onClick={() => alert('Propose Change feature coming soon!')}
                >
                  <Quote className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AgreementDetailsPage() {
  return (
    <ProtectedRoute>
      <AgreementDetailsContent />
    </ProtectedRoute>
  );
}

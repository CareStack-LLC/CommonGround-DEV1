'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth-context';
import { agreementsAPI, Agreement, AgreementSection, AgreementQuickSummary } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardDescription,
  CGCardContent,
  CGCardFooter,
} from '@/components/cg/cg-card';
import { CGButton } from '@/components/cg/cg-button';
import { CGBadge } from '@/components/cg/cg-badge';
import { CGPageHeader } from '@/components/cg/cg-page-header';
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
  Lock,
  Info,
  Hash,
  Layers,
  Users,
  Heart,
} from 'lucide-react';
import { useFeatureGate } from '@/hooks/use-feature-gate';
import { TierBadge } from '@/components/tier-badge';
import { ApprovalDisclaimerModal } from '@/components/approval-disclaimer-modal';

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

// Map backend section types to wizard section indexes for editing
function getSectionEditIndex(sectionType: string, sectionNumber: string): number {
  // V2 section mappings (new simplified builder)
  const v2Mappings: Record<string, number> = {
    'parties_1': 0,
    'scope_2': 1,
    'schedule_3': 2,
    'logistics_4': 3,
    'decision_making_5': 4,
    'financial_6': 5,
    'legal_7': 6,
  };

  // V1 section mappings (legacy builder)
  const v1Mappings: Record<string, number> = {
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
  return v2Mappings[key] ?? v1Mappings[key] ?? 0; // Default to 0 for v2 builder
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
      // V2 Section Types
      case 'parties': {
        const parts = [];
        if (sectionData.parent1_name) parts.push(sectionData.parent1_name);
        if (sectionData.parent2_name) parts.push(sectionData.parent2_name);
        if (sectionData.children_count) parts.push(`${sectionData.children_count} child(ren)`);
        if (sectionData.children && Array.isArray(sectionData.children)) {
          parts.push(`${sectionData.children.length} child(ren)`);
        }
        return parts.length > 0 ? parts.join(' • ') : 'Parties identified';
      }

      case 'scope': {
        const parts = [];
        if (sectionData.effective_date) parts.push(`Effective: ${sectionData.effective_date}`);
        if (sectionData.duration) parts.push(sectionData.duration);
        if (sectionData.review_frequency) parts.push(`Review: ${sectionData.review_frequency}`);
        return parts.length > 0 ? parts.join(' • ') : 'Scope defined';
      }

      case 'logistics': {
        const parts = [];
        if (sectionData.exchange_location) parts.push(`Exchange at: ${sectionData.exchange_location}`);
        if (sectionData.transportation_responsibility) parts.push(`Transport: ${sectionData.transportation_responsibility}`);
        if (sectionData.pickup_time) parts.push(`Pickup: ${sectionData.pickup_time}`);
        if (sectionData.dropoff_time) parts.push(`Dropoff: ${sectionData.dropoff_time}`);
        return parts.length > 0 ? parts.join(' • ') : 'Logistics configured';
      }

      case 'legal': {
        const parts = [];
        if (sectionData.modification_process) parts.push(sectionData.modification_process);
        if (sectionData.dispute_resolution) parts.push(sectionData.dispute_resolution);
        if (sectionData.acknowledged === true || sectionData.acknowledged === 'yes') parts.push('Acknowledged');
        return parts.length > 0 ? parts.join(' • ') : 'Terms acknowledged';
      }

      // V1 Section Types (legacy)
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
   STATUS HELPERS
   ============================================================================= */

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'sage' | 'slate' | 'amber';

function getStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    approved: 'sage',
    pending_approval: 'warning',
    draft: 'slate',
    inactive: 'default',
    rejected: 'error',
  };
  return map[status] || 'default';
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    approved: 'Approved',
    pending_approval: 'Pending Approval',
    draft: 'Draft',
    inactive: 'Inactive',
    rejected: 'Rejected',
  };
  return map[status] || status;
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function ApprovalTracker({
  approvedByA,
  approvedByB,
}: {
  approvedByA: boolean;
  approvedByB: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            approvedByA ? 'bg-cg-success text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {approvedByA ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-medium">A</span>}
        </div>
        <div className="flex-1">
          <span className={`text-sm ${approvedByA ? 'text-cg-success font-medium' : 'text-muted-foreground'}`}>
            Parent A
          </span>
        </div>
        <CGBadge variant={approvedByA ? 'success' : 'default'} size="sm">
          {approvedByA ? 'Approved' : 'Pending'}
        </CGBadge>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            approvedByB ? 'bg-cg-success text-white' : 'bg-muted text-muted-foreground'
          }`}
        >
          {approvedByB ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs font-medium">B</span>}
        </div>
        <div className="flex-1">
          <span className={`text-sm ${approvedByB ? 'text-cg-success font-medium' : 'text-muted-foreground'}`}>
            Parent B
          </span>
        </div>
        <CGBadge variant={approvedByB ? 'success' : 'default'} size="sm">
          {approvedByB ? 'Approved' : 'Pending'}
        </CGBadge>
      </div>
    </div>
  );
}

function AgreementSectionCard({
  section,
  sectionIndex,
  canEdit,
  onEdit,
  defaultExpanded = false,
}: {
  section: AgreementSection;
  sectionIndex: number;
  canEdit: boolean;
  onEdit: () => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const summary = formatSectionSummary(section);

  return (
    <div
      className={`border-l-4 transition-all duration-200 ${
        section.is_completed
          ? 'border-l-cg-sage bg-card'
          : 'border-l-muted bg-muted/30'
      }`}
    >
      {/* Clickable header row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Paragraph Number */}
          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-cg-sand flex items-center justify-center">
            <span className="font-mono text-xs sm:text-sm font-semibold text-muted-foreground">
              §{sectionIndex}
            </span>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-serif text-base sm:text-lg font-semibold text-foreground truncate"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              {section.section_title}
            </h3>
            {section.is_required && !isExpanded && (
              <span className="text-xs text-cg-amber font-medium">Required</span>
            )}
          </div>

          {/* Status + Expand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <CGBadge
              variant={section.is_completed ? 'success' : 'default'}
              size="sm"
            >
              {section.is_completed ? 'Complete' : 'Incomplete'}
            </CGBadge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
          <div className="pl-11 sm:pl-14">
            {section.is_required && (
              <span className="text-xs text-cg-amber font-medium mb-2 inline-block">Required</span>
            )}

            {summary && (
              <p className="font-serif text-muted-foreground leading-relaxed text-sm">
                {summary}
              </p>
            )}

            {!section.content && !section.structured_data && !section.is_completed && (
              <p className="text-sm text-muted-foreground/60 italic">
                This section has not been completed yet.
              </p>
            )}

            {canEdit && (
              <CGButton
                variant="ghost"
                size="sm"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="mt-3"
              >
                Edit Section
              </CGButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   MARKDOWN COMPONENTS (for summary rendering)
   ============================================================================= */

const markdownComponents = {
  table: ({ node, ...props }: any) => (
    <div className="my-4 w-full overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full text-xs md:text-sm text-left relative" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => (
    <thead className="bg-muted/30 text-[10px] md:text-xs uppercase tracking-wider font-bold text-muted-foreground border-b border-border" {...props} />
  ),
  th: ({ node, ...props }: any) => (
    <th className="px-3 py-2 whitespace-nowrap" {...props} />
  ),
  td: ({ node, ...props }: any) => (
    <td className="px-3 py-2 border-b border-border/50 last:border-0 align-top" {...props} />
  ),
  tr: ({ node, ...props }: any) => (
    <tr className="hover:bg-muted/10 transition-colors" {...props} />
  ),
  h3: ({ node, ...props }: any) => {
    const text = String(props.children);
    let colorClass = "text-[var(--portal-primary)]";
    if (text.includes("Holidays")) colorClass = "text-cg-amber";
    if (text.includes("Decision")) colorClass = "text-cg-slate";
    if (text.includes("Quick")) colorClass = "text-cg-sage";
    return (
      <h3
        className={`text-[11px] md:text-xs font-bold uppercase tracking-widest ${colorClass} mt-6 mb-2 pb-1 border-b border-border/50 flex items-center gap-2`}
        {...props}
      />
    );
  },
  ul: ({ node, ...props }: any) => (
    <ul className="my-2 space-y-1.5 list-disc list-inside text-muted-foreground text-sm" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="leading-snug" {...props} />
  ),
  p: ({ node, ...props }: any) => (
    <p className="mb-3 last:mb-0" {...props} />
  ),
};

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

function AgreementDetailsContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const agreementId = params.id as string;

  // Feature gate for PDF exports
  const { hasAccess: hasPdfAccess } = useFeatureGate('pdf_summaries');

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [sections, setSections] = useState<AgreementSection[]>([]);
  const [summary, setSummary] = useState<AgreementQuickSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationSummary, setActivationSummary] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'implementation' | 'adherence'>('details');

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

      // Load activation summary and compliance for active agreements
      if (data.agreement.status === 'active') {
        try {
          const [activationData, complianceResult] = await Promise.all([
            agreementsAPI.getActivationSummary(agreementId),
            agreementsAPI.getCompliance(agreementId),
          ]);
          setActivationSummary(activationData);
          setComplianceData(complianceResult);
        } catch {
          // Non-critical - page still works without these
        }
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
      const data = await agreementsAPI.approve(agreementId, undefined, true);
      setAgreement(data.agreement);
      setSections(data.sections);
      setShowApprovalModal(false);
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
      router.push('/agreements');
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

  // Determine total sections based on agreement version
  const isGoodFaith = agreement?.agreement_version === 'good_faith';
  const isV2Agreement = agreement?.agreement_version?.startsWith('v2') ?? (!isGoodFaith && agreement?.agreement_version !== 'comprehensive');
  const totalSections = isGoodFaith ? 0 : (agreement?.agreement_version === 'comprehensive' ? 18 : (agreement?.agreement_version === 'co-operative' || isV2Agreement ? 7 : 18));
  const completedSections = sections.filter((s) => s.is_completed).length;
  const completionPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 100;

  // Find first incomplete section index for auto-expand
  const firstIncompleteIndex = sections.findIndex((s) => !s.is_completed);

  // Primary action helper
  const getPrimaryAction = () => {
    if (!agreement) return null;
    switch (agreement.status) {
      case 'draft':
        return (
          <CGButton
            variant="primary"
            size="sm"
            leftIcon={<Send className="h-4 w-4" />}
            isLoading={isApproving}
            onClick={handleSubmit}
          >
            Submit
          </CGButton>
        );
      case 'pending_approval':
        if (canApprove()) {
          return (
            <CGButton
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle className="h-4 w-4" />}
              isLoading={isApproving}
              onClick={() => setShowApprovalModal(true)}
            >
              Approve
            </CGButton>
          );
        }
        return null;
      case 'approved':
        return (
          <CGButton
            variant="primary"
            size="sm"
            leftIcon={<Power className="h-4 w-4" />}
            isLoading={isActivating}
            onClick={handleActivate}
          >
            Activate
          </CGButton>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navigation />

      {/* Page Header */}
      {agreement && (
        <CGPageHeader
          backHref="/agreements"
          title={agreement.title}
          subtitle={`Version ${agreement.version}`}
          icon={<FileSignature className="h-5 w-5" />}
          actions={
            <div className="flex items-center gap-2">
              <CGBadge variant={getStatusBadgeVariant(agreement.status)} size="md" dot>
                {getStatusLabel(agreement.status)}
              </CGBadge>
              <span className="hidden sm:inline-flex">{getPrimaryAction()}</span>
            </div>
          }
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
          <CGCard className="bg-cg-error-subtle border-cg-error/20">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-cg-error flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-cg-error">Error Loading Agreement</p>
                <p className="text-sm text-cg-error/80 mt-1">{error}</p>
              </div>
            </div>
            <CGButton variant="secondary" onClick={loadAgreement} className="mt-4">
              Try Again
            </CGButton>
          </CGCard>
        )}

        {/* Agreement Content — Two-Column Grid */}
        {!isLoading && agreement && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ============================================================
                LEFT COLUMN — Main Content
                ============================================================ */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mobile-only primary CTA */}
              <div className="sm:hidden">
                {getPrimaryAction() && (
                  <div className="w-full [&>button]:w-full">
                    {agreement.status === 'draft' && (
                      <CGButton
                        variant="primary"
                        leftIcon={<Send className="h-4 w-4" />}
                        isLoading={isApproving}
                        onClick={handleSubmit}
                        className="w-full"
                      >
                        Submit for Approval
                      </CGButton>
                    )}
                    {agreement.status === 'pending_approval' && canApprove() && (
                      <CGButton
                        variant="primary"
                        leftIcon={<CheckCircle className="h-4 w-4" />}
                        isLoading={isApproving}
                        onClick={() => setShowApprovalModal(true)}
                        className="w-full"
                      >
                        Approve Agreement
                      </CGButton>
                    )}
                    {agreement.status === 'approved' && (
                      <CGButton
                        variant="primary"
                        leftIcon={<Power className="h-4 w-4" />}
                        isLoading={isActivating}
                        onClick={handleActivate}
                        className="w-full"
                      >
                        Activate Agreement
                      </CGButton>
                    )}
                  </div>
                )}
              </div>

              {/* Status Banner — conditional */}
              {agreement.status === 'active' && (
                <div className="p-4 bg-cg-success-subtle rounded-2xl border border-cg-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-cg-success flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cg-success text-sm">Agreement is Active</p>
                      {agreement.effective_date && (
                        <p className="text-xs text-cg-success/80">
                          Effective since {new Date(agreement.effective_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {agreement.status === 'pending_approval' && hasUserApproved() && (
                <div className="p-4 bg-cg-sage-subtle rounded-2xl border border-cg-sage/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-cg-sage flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cg-sage text-sm">You&apos;ve approved this agreement</p>
                      <p className="text-xs text-muted-foreground">Waiting for the other parent&apos;s approval</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Navigation — Active agreements only */}
              {agreement.status === 'active' && (
                <div className="flex rounded-xl bg-muted/50 p-1 overflow-x-auto">
                  {[
                    { key: 'details' as const, label: 'Agreement', icon: '📋' },
                    { key: 'implementation' as const, label: 'Implementation', icon: '⚡' },
                    { key: 'adherence' as const, label: 'Adherence', icon: '📊' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                        activeTab === tab.key
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Summary Card */}
              {(agreement.status !== 'active' || activeTab === 'details') && summary?.summary && (
                <CGCard variant="elevated">
                  <CGCardHeader>
                    <div className="flex items-start gap-3">
                      <Quote className="h-5 w-5 text-cg-sage flex-shrink-0 mt-0.5" />
                      <CGCardTitle>Agreement Summary</CGCardTitle>
                    </div>
                  </CGCardHeader>
                  <CGCardContent className="mt-4">
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm md:prose-p:text-base prose-strong:text-foreground prose-strong:font-semibold">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {summary.summary}
                      </ReactMarkdown>
                    </div>

                    {/* Shared Expenses Table */}
                    {summary.shared_expenses_table && (
                      <div className="mt-5 pt-5 border-t border-border/30">
                        <p className="text-sm font-semibold text-foreground mb-3">
                          <strong>Shared Expenses:</strong> {summary.shared_expenses_table.split}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-cg-sage-subtle dark:bg-foreground/10 rounded-lg p-3 border border-cg-sage-subtle dark:border-foreground">
                            <p className="font-semibold text-foreground dark:text-cg-sage-subtle mb-2">✓ Covered</p>
                            <ul className="space-y-1.5 text-foreground dark:text-cg-sage-subtle">
                              {summary.shared_expenses_table.covered?.map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                              ))}
                              {(!summary.shared_expenses_table.covered || summary.shared_expenses_table.covered.length === 0) && (
                                <li className="text-muted-foreground italic">None specified</li>
                              )}
                            </ul>
                          </div>
                          <div className="bg-cg-error-subtle dark:bg-cg-error-deep/10 rounded-lg p-3 border border-cg-error-subtle dark:border-cg-error-dark">
                            <p className="font-semibold text-cg-error-deep dark:text-cg-error-subtle mb-2">✗ Not Covered</p>
                            <ul className="space-y-1.5 text-cg-error-dark dark:text-cg-error-subtle">
                              {summary.shared_expenses_table.not_covered?.map((item: string, idx: number) => (
                                <li key={idx}>• {item}</li>
                              ))}
                              {(!summary.shared_expenses_table.not_covered || summary.shared_expenses_table.not_covered.length === 0) && (
                                <li className="text-muted-foreground italic">None specified</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </CGCardContent>
                </CGCard>
              )}

              {/* Implementation Tab Content */}
              {agreement.status === 'active' && activeTab === 'implementation' && activationSummary && (
                <CGCard variant="elevated">
                  <CGCardHeader>
                    <CGCardTitle style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                      What&apos;s Been Set Up
                    </CGCardTitle>
                    <CGCardDescription>
                      These items were automatically created from your agreement
                    </CGCardDescription>
                  </CGCardHeader>
                  <CGCardContent className="mt-4 space-y-4">
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activationSummary.summary.custody_exchanges > 0 && (
                        <div className="p-3 rounded-xl bg-cg-slate-subtle dark:bg-foreground/30 text-center">
                          <div className="text-2xl font-bold text-cg-slate">{activationSummary.summary.custody_exchanges}</div>
                          <div className="text-xs text-cg-slate/70">Exchanges</div>
                        </div>
                      )}
                      {activationSummary.summary.holiday_events > 0 && (
                        <div className="p-3 rounded-xl bg-cg-amber-subtle dark:bg-foreground/30 text-center">
                          <div className="text-2xl font-bold text-cg-amber-dark">{activationSummary.summary.holiday_events}</div>
                          <div className="text-xs text-cg-amber-dark/70">Holidays</div>
                        </div>
                      )}
                      {activationSummary.summary.activity_events > 0 && (
                        <div className="p-3 rounded-xl bg-cg-sage-subtle dark:bg-foreground/30 text-center">
                          <div className="text-2xl font-bold text-cg-sage-dark">{activationSummary.summary.activity_events}</div>
                          <div className="text-xs text-cg-sage-dark/70">Activities</div>
                        </div>
                      )}
                      {activationSummary.summary.obligation_templates > 0 && (
                        <div className="p-3 rounded-xl bg-cg-slate-subtle dark:bg-foreground/30 text-center">
                          <div className="text-2xl font-bold text-cg-slate">{activationSummary.summary.obligation_templates}</div>
                          <div className="text-xs text-cg-slate/70">Obligations</div>
                        </div>
                      )}
                    </div>

                    {/* Item list */}
                    {activationSummary.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                        <CheckCircle className="h-5 w-5 text-cg-success flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.type === 'exchange' && '📍 Calendar Exchange'}
                            {item.type === 'holiday' && '🎄 Holiday Event'}
                            {item.type === 'activity' && '⚽ Recurring Activity'}
                            {item.type === 'custody_exchange' && '🔄 Custody Exchange'}
                            {item.type === 'obligation_template' && `💰 ${item.amount ? `$${item.amount}` : 'Expense'}`}
                          </p>
                        </div>
                        <CGBadge
                          variant={item.status === 'active' || item.status === 'scheduled' ? 'success' : 'default'}
                          size="sm"
                        >
                          {item.status}
                        </CGBadge>
                      </div>
                    ))}

                    {activationSummary.items.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No items have been auto-created yet.</p>
                    )}
                  </CGCardContent>
                </CGCard>
              )}

              {/* Adherence Tab Content */}
              {agreement.status === 'active' && activeTab === 'adherence' && (
                <CGCard variant="elevated">
                  <CGCardHeader>
                    <CGCardTitle style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                      Agreement Adherence
                    </CGCardTitle>
                    <CGCardDescription>
                      How well both parents are following the agreement
                    </CGCardDescription>
                  </CGCardHeader>
                  <CGCardContent className="mt-4">
                    {complianceData ? (
                      <div className="space-y-6">
                        {/* Overall Score */}
                        <div className="text-center p-6 rounded-2xl bg-muted/30">
                          <div className={`text-5xl font-bold ${
                            complianceData.overall_score >= 90 ? 'text-cg-sage-dark' :
                            complianceData.overall_score >= 75 ? 'text-cg-slate' :
                            complianceData.overall_score >= 50 ? 'text-cg-amber-dark' :
                            'text-cg-error'
                          }`}>
                            {complianceData.overall_score}%
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 capitalize">
                            {complianceData.status?.replace('_', ' ')}
                          </div>
                        </div>

                        {/* Exchange Compliance */}
                        <div className="p-4 rounded-xl border border-border">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Exchange Compliance
                          </h4>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                              <div className="text-lg font-bold text-foreground">{complianceData.exchange_compliance.completed}</div>
                              <div className="text-xs text-muted-foreground">Completed</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">{complianceData.exchange_compliance.missed}</div>
                              <div className="text-xs text-muted-foreground">Missed</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">{complianceData.exchange_compliance.on_time_rate}%</div>
                              <div className="text-xs text-muted-foreground">On-Time</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Completion Rate</span>
                              <span>{complianceData.exchange_compliance.completion_rate}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cg-slate rounded-full transition-all"
                                style={{ width: `${complianceData.exchange_compliance.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Financial Compliance */}
                        <div className="p-4 rounded-xl border border-border">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            💰 Financial Compliance
                          </h4>
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div>
                              <div className="text-lg font-bold text-foreground">{complianceData.financial_compliance.funded}</div>
                              <div className="text-xs text-muted-foreground">Funded</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">{complianceData.financial_compliance.total_obligations}</div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Funding Rate</span>
                              <span>{complianceData.financial_compliance.completion_rate}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cg-sage rounded-full transition-all"
                                style={{ width: `${complianceData.financial_compliance.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Adherence data will appear as exchanges and payments are tracked.</p>
                      </div>
                    )}
                  </CGCardContent>
                </CGCard>
              )}

              {/* Good Faith Agreement — Simple Card (no sections) */}
              {isGoodFaith && (agreement.status !== 'active' || activeTab === 'details') && (
                <CGCard variant="elevated">
                  <CGCardHeader>
                    <div className="flex items-center gap-3">
                      <Heart className="h-6 w-6 text-cg-sage flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CGCardTitle>{agreement.title}</CGCardTitle>
                          <CGBadge variant="sage" size="sm">Good Faith Agreement</CGBadge>
                        </div>
                        <CGCardDescription className="mt-1">
                          Agreement #{agreement.version}
                        </CGCardDescription>
                      </div>
                    </div>
                  </CGCardHeader>
                  <CGCardContent className="mt-4 space-y-5">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <CGBadge variant={getStatusBadgeVariant(agreement.status)} size="sm" dot>
                        {getStatusLabel(agreement.status)}
                      </CGBadge>
                    </div>

                    {/* Effective date when active */}
                    {agreement.status === 'active' && agreement.effective_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-cg-success flex-shrink-0" />
                        <span className="text-muted-foreground">Effective since</span>
                        <span className="font-medium text-foreground">
                          {new Date(agreement.effective_date).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}

                    {/* Agreement statement */}
                    <div className="p-4 bg-cg-sage-subtle rounded-2xl border border-cg-sage/20">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-cg-sage flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground leading-relaxed">
                          Both parents agree to co-parent cooperatively and communicate through CommonGround.
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {agreement.status === 'draft' && (
                      <CGButton
                        variant="primary"
                        leftIcon={<Send className="h-4 w-4" />}
                        isLoading={isApproving}
                        onClick={handleSubmit}
                        className="w-full"
                      >
                        Submit for Approval
                      </CGButton>
                    )}
                    {agreement.status === 'pending_approval' && canApprove() && (
                      <CGButton
                        variant="primary"
                        leftIcon={<CheckCircle className="h-4 w-4" />}
                        isLoading={isApproving}
                        onClick={() => setShowApprovalModal(true)}
                        className="w-full"
                      >
                        Approve Agreement
                      </CGButton>
                    )}
                    {agreement.status === 'approved' && (
                      <CGButton
                        variant="primary"
                        leftIcon={<Power className="h-4 w-4" />}
                        isLoading={isActivating}
                        onClick={handleActivate}
                        className="w-full"
                      >
                        Activate Agreement
                      </CGButton>
                    )}
                  </CGCardContent>
                </CGCard>
              )}

              {/* Agreement Sections Card — co-operative and comprehensive only */}
              {!isGoodFaith && (agreement.status !== 'active' || activeTab === 'details') && (
                <CGCard variant="default" noPadding>
                  <div className="p-5 sm:p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3
                          className="text-xl font-semibold text-foreground"
                          style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                        >
                          Agreement Sections
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          The terms and conditions of your parenting agreement
                        </p>
                      </div>
                      {agreement.status === 'draft' && (
                        <CGButton
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit3 className="h-4 w-4" />}
                          onClick={() => router.push(`/agreements/${agreementId}/builder-v2`)}
                        >
                          Edit All
                        </CGButton>
                      )}
                    </div>
                  </div>

                  {sections.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No sections completed yet</p>
                      <CGButton
                        variant="primary"
                        onClick={() => router.push(`/agreements/${agreementId}/builder-v2`)}
                      >
                        Start Building
                      </CGButton>
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
                            onEdit={() => router.push(`/agreements/${agreementId}/builder-v2`)}
                            defaultExpanded={index === firstIncompleteIndex}
                          />
                        );
                      })}
                    </div>
                  )}
                </CGCard>
              )}
            </div>

            {/* ============================================================
                RIGHT COLUMN — Sidebar
                ============================================================ */}
            <div className="space-y-6">
              {/* Metadata Card */}
              <CGCard>
                <CGCardHeader>
                  <CGCardTitle className="text-base">Details</CGCardTitle>
                </CGCardHeader>
                <CGCardContent className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <CGBadge variant={getStatusBadgeVariant(agreement.status)} size="sm" dot>
                      {getStatusLabel(agreement.status)}
                    </CGBadge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{agreement.version}</span>
                      {isV2Agreement && (
                        <CGBadge variant="sage" size="sm">v2</CGBadge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <CGBadge variant="info" size="sm">
                      {isGoodFaith ? 'Good Faith' : agreement.agreement_version === 'comprehensive' ? '18-Section' : (agreement.agreement_version === 'co-operative' || isV2Agreement) ? '7-Section' : 'Legacy'}
                    </CGBadge>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>Created {new Date(agreement.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}</span>
                    </div>
                    {agreement.effective_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-cg-success" />
                        <span>Effective {new Date(agreement.effective_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}</span>
                      </div>
                    )}
                  </div>
                </CGCardContent>
              </CGCard>

              {/* Approval Tracker Card */}
              {agreement.status === 'pending_approval' && (
                <CGCard>
                  <CGCardHeader>
                    <CGCardTitle className="text-base">Approval Status</CGCardTitle>
                  </CGCardHeader>
                  <CGCardContent className="mt-4">
                    <ApprovalTracker
                      approvedByA={!!agreement.approved_by_a}
                      approvedByB={!!agreement.approved_by_b}
                    />
                  </CGCardContent>
                </CGCard>
              )}

              {/* Completion Progress Card — hidden for Good Faith (no sections) */}
              {!isGoodFaith && (
                <CGCard>
                  <CGCardHeader>
                    <CGCardTitle className="text-base">Progress</CGCardTitle>
                  </CGCardHeader>
                  <CGCardContent className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        {completedSections} of {totalSections} sections
                      </span>
                      <span className="font-semibold text-foreground">{completionPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cg-sage rounded-full transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </CGCardContent>
                </CGCard>
              )}

              {/* Quick Facts Card */}
              {summary?.key_points && summary.key_points.length > 0 && (
                <CGCard>
                  <CGCardHeader>
                    <CGCardTitle className="text-base">Quick Facts</CGCardTitle>
                  </CGCardHeader>
                  <CGCardContent className="mt-4">
                    <div className="space-y-2.5 text-sm leading-relaxed">
                      {summary.key_points.map((point: string, idx: number) => (
                        <div key={idx} className="text-foreground prose prose-sm max-w-none prose-strong:text-foreground prose-strong:font-semibold">
                          <ReactMarkdown>{point}</ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  </CGCardContent>
                </CGCard>
              )}

              {/* Actions Card */}
              <CGCard>
                <CGCardHeader>
                  <CGCardTitle className="text-base">Actions</CGCardTitle>
                </CGCardHeader>
                <CGCardContent className="mt-4 space-y-3">
                  {/* Draft Actions */}
                  {agreement.status === 'draft' && (
                    <>
                      <CGButton
                        variant="primary"
                        leftIcon={<Send className="h-4 w-4" />}
                        isLoading={isApproving}
                        onClick={handleSubmit}
                        className="w-full"
                      >
                        Submit for Approval
                      </CGButton>
                      <CGButton
                        variant="secondary"
                        leftIcon={<Edit3 className="h-4 w-4" />}
                        onClick={() => router.push(`/agreements/${agreementId}/builder-v2`)}
                        className="w-full"
                      >
                        Continue Editing
                      </CGButton>
                      <CGButton
                        variant="danger"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        isLoading={isDeleting}
                        onClick={handleDelete}
                        className="w-full"
                      >
                        Delete Draft
                      </CGButton>
                    </>
                  )}

                  {/* Pending Approval Actions */}
                  {agreement.status === 'pending_approval' && (
                    <>
                      {canApprove() ? (
                        <CGButton
                          variant="primary"
                          leftIcon={<CheckCircle className="h-4 w-4" />}
                          isLoading={isApproving}
                          onClick={() => setShowApprovalModal(true)}
                          className="w-full"
                        >
                          Approve Agreement
                        </CGButton>
                      ) : hasUserApproved() ? (
                        <div className="p-4 bg-cg-sage-subtle rounded-xl text-center">
                          <CheckCircle className="h-5 w-5 text-cg-sage mx-auto mb-2" />
                          <p className="text-sm font-medium text-cg-sage">You&apos;ve approved</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Waiting for the other parent
                          </p>
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Approved Actions */}
                  {agreement.status === 'approved' && (
                    <>
                      <CGButton
                        variant="primary"
                        leftIcon={<Power className="h-4 w-4" />}
                        isLoading={isActivating}
                        onClick={handleActivate}
                        className="w-full"
                      >
                        Activate Agreement
                      </CGButton>
                      {hasPdfAccess ? (
                        <CGButton
                          variant="secondary"
                          leftIcon={<Download className="h-4 w-4" />}
                          isLoading={isGeneratingPDF}
                          onClick={handleGeneratePDF}
                          className="w-full"
                        >
                          Download PDF
                        </CGButton>
                      ) : (
                        <button
                          onClick={() => router.push('/settings/billing')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm font-medium"
                        >
                          <Lock className="h-4 w-4" />
                          Download PDF
                          <TierBadge tier="plus" size="sm" />
                        </button>
                      )}
                    </>
                  )}

                  {/* Active Actions */}
                  {agreement.status === 'active' && (
                    <>
                      {hasPdfAccess ? (
                        <CGButton
                          variant="secondary"
                          leftIcon={<Download className="h-4 w-4" />}
                          isLoading={isGeneratingPDF}
                          onClick={handleGeneratePDF}
                          className="w-full"
                        >
                          Download PDF
                        </CGButton>
                      ) : (
                        <button
                          onClick={() => router.push('/settings/billing')}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors text-sm font-medium"
                        >
                          <Lock className="h-4 w-4" />
                          Download PDF
                          <TierBadge tier="plus" size="sm" />
                        </button>
                      )}
                      <CGButton
                        variant="danger"
                        leftIcon={<PowerOff className="h-4 w-4" />}
                        isLoading={isActivating}
                        onClick={handleDeactivate}
                        className="w-full"
                      >
                        Deactivate Agreement
                      </CGButton>
                    </>
                  )}
                </CGCardContent>
              </CGCard>
            </div>
          </div>
        )}
      </main>

      {/* Floating Propose Change Button — Active agreements only */}
      {agreement?.status === 'active' && (
        <div className="fixed bottom-24 right-6 sm:bottom-8 sm:right-8 z-30">
          <button
            className="w-14 h-14 rounded-full bg-cg-amber text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
            title="Propose Change (Coming Soon)"
            onClick={() => alert('Propose Change feature coming soon!')}
          >
            <Quote className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Approval Disclaimer Modal */}
      <ApprovalDisclaimerModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onConfirm={handleApprove}
        agreementTitle={agreement?.title || 'SharedCare Agreement'}
        isLoading={isApproving}
      />
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

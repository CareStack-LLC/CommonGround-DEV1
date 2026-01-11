'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { childrenAPI, ChildProfileBasic } from '@/lib/api';
import { Navigation } from '@/components/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import {
  ArrowLeft,
  Plus,
  Users,
  CheckCircle,
  Clock,
  Archive,
  ChevronRight,
  Loader2,
  AlertCircle,
  Heart,
  Eye,
  EyeOff,
} from 'lucide-react';

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatAge(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  if (age < 1) {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    return `${months} months`;
  }
  return `${age} years old`;
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    active: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Active',
    },
    pending_approval: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-cg-amber-subtle text-cg-amber border-cg-amber/20',
      label: 'Pending',
    },
    archived: {
      icon: <Archive className="h-3.5 w-3.5" />,
      className: 'bg-muted text-muted-foreground border-border',
      label: 'Archived',
    },
  };

  const { icon, className, label } = config[status] || config.active;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function ChildCard({
  child,
  caseId,
  onApprove,
}: {
  child: ChildProfileBasic;
  caseId: string;
  onApprove: (childId: string) => void;
}) {
  const router = useRouter();
  const isPending = child.status === 'pending_approval';
  const isArchived = child.status === 'archived';

  return (
    <div
      className={`cg-card-interactive p-5 group ${isArchived ? 'opacity-60' : ''}`}
      onClick={() => router.push(`/cases/${caseId}/children/${child.id}`)}
    >
      <div className="flex items-start gap-4">
        {/* Profile Photo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
          {child.photo_url ? (
            <img src={child.photo_url} alt={child.first_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">
              {child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '👶'}
            </span>
          )}
        </div>

        {/* Child Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="font-semibold text-foreground text-lg truncate group-hover:text-cg-sage transition-colors">
              {child.first_name} {child.last_name}
            </h3>
            <StatusBadge status={child.status} />
          </div>

          <p className="text-muted-foreground text-sm">
            {formatAge(child.date_of_birth)}
            {child.school_name && (
              <>
                <span className="mx-2">•</span>
                {child.school_name}
              </>
            )}
            {child.grade_level && `, ${child.grade_level}`}
          </p>

          {/* Pending Approval Notice */}
          {isPending && (
            <div className="mt-3 p-3 bg-cg-amber-subtle/50 rounded-lg border border-cg-amber/10">
              <p className="text-xs text-cg-amber font-medium mb-2">Awaiting approval from co-parent</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(child.id);
                }}
                className="cg-btn-primary text-xs py-1.5 px-3"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </button>
            </div>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-cg-sage group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}

function EmptyState({ caseId }: { caseId: string }) {
  return (
    <div className="cg-card">
      <div className="text-center py-16 px-6">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-cg-sage-subtle via-cg-amber-subtle to-pink-100 flex items-center justify-center">
          <span className="text-5xl">👶</span>
        </div>
        <h3 className="font-serif text-xl font-semibold text-foreground mb-2">No Children Added Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Add your children to create shared profiles with important information like medical records, school details,
          and preferences.
        </p>
        <Link href={`/cases/${caseId}/children/new`}>
          <button className="cg-btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add First Child
          </button>
        </Link>
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

function ChildrenListContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildProfileBasic[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [caseId, showArchived]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await childrenAPI.listForCase(caseId, true, showArchived);
      setChildren(response.children);
    } catch (err: any) {
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (childId: string) => {
    try {
      await childrenAPI.approve(childId);
      loadChildren();
    } catch (err: any) {
      setError(err.message || 'Failed to approve child profile');
    }
  };

  const activeChildren = children.filter((c) => c.status !== 'archived');
  const archivedChildren = children.filter((c) => c.status === 'archived');

  return (
    <div className="min-h-screen bg-cg-sand">
      <Navigation />

      {/* Back Link */}
      <div className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={`/cases/${caseId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-cg-sage transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Case
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <Heart className="h-5 w-5 text-cg-sage" />
              </div>
              Children
            </h1>
            <p className="text-muted-foreground mt-1">Your shared child profiles</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`cg-btn-secondary text-sm py-2 px-4 ${showArchived ? 'bg-muted' : ''}`}
            >
              {showArchived ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Archived
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Archived
                </>
              )}
            </button>
            <Link href={`/cases/${caseId}/children/new`}>
              <button className="cg-btn-primary text-sm py-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-cg-error-subtle border border-cg-error/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
            <p className="text-sm text-cg-error font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-cg-sage mx-auto" />
              <p className="mt-4 text-muted-foreground">Loading children...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Empty State */}
            {children.length === 0 && <EmptyState caseId={caseId} />}

            {/* Active Children */}
            {activeChildren.length > 0 && (
              <div className="space-y-4 mb-8">
                {activeChildren.map((child) => (
                  <ChildCard key={child.id} child={child} caseId={caseId} onApprove={handleApprove} />
                ))}
              </div>
            )}

            {/* Archived Children */}
            {showArchived && archivedChildren.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Archived
                </h2>
                {archivedChildren.map((child) => (
                  <ChildCard key={child.id} child={child} caseId={caseId} onApprove={handleApprove} />
                ))}
              </div>
            )}

            {/* Info Card */}
            <div className="cg-card p-5 bg-cg-sage-subtle/30 border-cg-sage/10 mt-8">
              <div className="flex items-start gap-4">
                <Users className="h-5 w-5 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-foreground mb-2">About Child Profiles</h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-cg-sage">•</span>
                      Both parents can contribute to create a complete profile
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cg-sage">•</span>
                      New profiles require approval from the other parent
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cg-sage">•</span>
                      Track medical info, school details, and preferences
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cg-sage">•</span>
                      All changes are logged for transparency
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ChildrenListPage() {
  return (
    <ProtectedRoute>
      <ChildrenListContent />
    </ProtectedRoute>
  );
}

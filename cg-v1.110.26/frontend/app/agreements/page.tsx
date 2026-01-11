'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Navigation } from '@/components/navigation';
import { familyFilesAPI, agreementsAPI, FamilyFileDetail } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import {
  FolderOpen,
  FileText,
  Plus,
  Scale,
  Lock,
  Sparkles,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSignature,
  Loader2,
} from 'lucide-react';

interface FamilyFileAgreement {
  id: string;
  agreement_number?: string;
  title: string;
  agreement_type?: string;
  version: number;
  status: string;
  petitioner_approved?: boolean;
  respondent_approved?: boolean;
  effective_date?: string;
  created_at: string;
}

interface FamilyFileWithAgreements extends FamilyFileDetail {
  agreements?: FamilyFileAgreement[];
}

/* =============================================================================
   HELPER COMPONENTS - Editorial Aesthetic
   ============================================================================= */

function FamilyFileCard({
  familyFile,
  isSelected,
  onSelect,
}: {
  familyFile: FamilyFileWithAgreements;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-cg-sage-subtle border-2 border-cg-sage shadow-sm'
          : 'bg-card border-2 border-transparent hover:bg-accent/50 hover:border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isSelected ? 'bg-cg-sage text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className={`font-medium ${isSelected ? 'text-cg-sage' : 'text-foreground'}`}>
              {familyFile.title}
            </p>
            <p className="text-xs text-muted-foreground">{familyFile.family_file_number}</p>
          </div>
        </div>
        {familyFile.has_court_case && (
          <span className="px-2 py-1 bg-cg-amber-subtle text-cg-amber text-xs font-medium rounded-full flex items-center gap-1">
            <Scale className="h-3 w-3" />
            Court
          </span>
        )}
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    active: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Active',
    },
    approved: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-success-subtle text-cg-success border-cg-success/20',
      label: 'Approved',
    },
    pending_approval: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-cg-amber-subtle text-cg-amber border-cg-amber/20',
      label: 'Pending Approval',
    },
    draft: {
      icon: <FileText className="h-3.5 w-3.5" />,
      className: 'bg-cg-slate-subtle text-cg-slate border-cg-slate/20',
      label: 'Draft',
    },
    rejected: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-error-subtle text-cg-error border-cg-error/20',
      label: 'Rejected',
    },
    expired: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-cg-warning-subtle text-cg-warning border-cg-warning/20',
      label: 'Expired',
    },
  };

  const { icon, className, label } = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

function AgreementCard({
  agreement,
  onClick,
}: {
  agreement: FamilyFileAgreement;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left cg-card-interactive p-5 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-cg-sage-subtle flex items-center justify-center flex-shrink-0">
            <FileSignature className="h-5 w-5 text-cg-sage" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-foreground truncate group-hover:text-cg-sage transition-colors">
              {agreement.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agreement.agreement_number} • Version {agreement.version}
            </p>
          </div>
        </div>
        <StatusBadge status={agreement.status} />
      </div>

      {/* Details */}
      <div className="pl-[52px]">
        <p className="text-sm text-muted-foreground">
          Created {new Date(agreement.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        {/* Pending Approval Status */}
        {agreement.status === 'pending_approval' && (
          <div className="mt-3 p-3 bg-cg-amber-subtle/50 rounded-lg border border-cg-amber/10">
            <p className="text-xs font-medium text-cg-amber mb-2">Awaiting Approvals</p>
            <div className="flex gap-4 text-xs text-cg-amber/80">
              <span className="flex items-center gap-1.5">
                {agreement.petitioner_approved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-cg-success" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-current" />
                )}
                Parent A
              </span>
              <span className="flex items-center gap-1.5">
                {agreement.respondent_approved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-cg-success" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border border-current" />
                )}
                Parent B
              </span>
            </div>
          </div>
        )}

        {/* Active/Approved Status */}
        {(agreement.status === 'approved' || agreement.status === 'active') &&
          agreement.effective_date && (
            <div className="mt-3 p-3 bg-cg-success-subtle/50 rounded-lg border border-cg-success/10">
              <p className="text-xs text-cg-success">
                <span className="font-medium">Effective:</span>{' '}
                {new Date(agreement.effective_date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Click to view details</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cg-sage group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}

function EmptyAgreementsState({
  canCreate,
  onCreate,
}: {
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cg-sage-subtle to-cg-amber-subtle flex items-center justify-center">
        <FileSignature className="h-10 w-10 text-cg-sage" />
      </div>
      <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
        No Agreements Yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first SharedCare Agreement to establish clear guidelines for your co-parenting arrangement.
      </p>
      {canCreate && (
        <button onClick={onCreate} className="cg-btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create First Agreement
        </button>
      )}
    </div>
  );
}

function BuilderChoiceModal({
  isOpen,
  isCreating,
  onClose,
  onSelectAria,
  onSelectWizard,
}: {
  isOpen: boolean;
  isCreating: boolean;
  onClose: () => void;
  onSelectAria: () => void;
  onSelectWizard: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            Create Your Agreement
          </h2>
          <p className="text-muted-foreground mt-1">
            Choose how you'd like to build your parenting agreement
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* ARIA Option */}
          <button
            onClick={onSelectAria}
            disabled={isCreating}
            className="w-full text-left p-5 border-2 border-cg-amber/30 rounded-xl hover:border-cg-amber hover:bg-cg-amber-subtle/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-amber flex items-center justify-center text-white flex-shrink-0 aria-glow">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground group-hover:text-cg-amber transition-colors">
                    Talk to ARIA
                  </h3>
                  <span className="px-2 py-0.5 bg-cg-amber-subtle text-cg-amber text-xs font-medium rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Have a natural conversation about your custody arrangement. ARIA will ask questions and create your agreement.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-cg-amber-subtle text-cg-amber text-xs rounded-full">
                    Conversational
                  </span>
                  <span className="px-2 py-1 bg-cg-amber-subtle text-cg-amber text-xs rounded-full">
                    Faster
                  </span>
                  <span className="px-2 py-1 bg-cg-amber-subtle text-cg-amber text-xs rounded-full">
                    AI-Powered
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Wizard Option */}
          <button
            onClick={onSelectWizard}
            disabled={isCreating}
            className="w-full text-left p-5 border-2 border-cg-sage/30 rounded-xl hover:border-cg-sage hover:bg-cg-sage-subtle/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-sage flex items-center justify-center text-white flex-shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-cg-sage transition-colors">
                  Step-by-Step Wizard
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill out structured forms with clear sections for custody schedules, holidays, and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-1 bg-cg-sage-subtle text-cg-sage text-xs rounded-full">
                    Structured
                  </span>
                  <span className="px-2 py-1 bg-cg-sage-subtle text-cg-sage text-xs rounded-full">
                    Traditional
                  </span>
                  <span className="px-2 py-1 bg-cg-sage-subtle text-cg-sage text-xs rounded-full">
                    Detailed
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="w-full cg-btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

function AgreementsListContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [familyFiles, setFamilyFiles] = useState<FamilyFileWithAgreements[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFileWithAgreements | null>(null);
  const [isLoadingFamilyFiles, setIsLoadingFamilyFiles] = useState(true);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilderChoice, setShowBuilderChoice] = useState(false);
  const [isCreatingAgreement, setIsCreatingAgreement] = useState(false);

  // Get familyFileId from URL if present
  const urlFamilyFileId = searchParams.get('familyFileId');

  useEffect(() => {
    loadFamilyFiles();
  }, [urlFamilyFileId]);

  const loadFamilyFiles = async () => {
    try {
      setIsLoadingFamilyFiles(true);
      setError(null);
      const data = await familyFilesAPI.list();
      const activeFiles = data.items.filter((ff) => ff.status === 'active');
      setFamilyFiles(activeFiles as FamilyFileWithAgreements[]);

      if (activeFiles.length > 0) {
        // Check if there's a familyFileId in the URL and select that one
        let fileToSelect = activeFiles[0] as FamilyFileWithAgreements;

        if (urlFamilyFileId) {
          const matchingFile = activeFiles.find((ff) => ff.id === urlFamilyFileId);
          if (matchingFile) {
            fileToSelect = matchingFile as FamilyFileWithAgreements;
          }
        }

        handleSelectFamilyFile(fileToSelect);
      }
    } catch (err: any) {
      console.error('Failed to load family files:', err);
      setError(err.message || 'Failed to load family files');
    } finally {
      setIsLoadingFamilyFiles(false);
    }
  };

  const handleSelectFamilyFile = async (familyFile: FamilyFileWithAgreements) => {
    setSelectedFamilyFile(familyFile);
    await loadAgreements(familyFile.id);
  };

  const loadAgreements = async (familyFileId: string) => {
    try {
      setIsLoadingAgreements(true);
      setError(null);

      const data = await agreementsAPI.listForFamilyFile(familyFileId);
      setSelectedFamilyFile((prev) =>
        prev ? { ...prev, agreements: data.items as FamilyFileAgreement[] } : null
      );
    } catch (err: any) {
      console.error('Failed to load agreements:', err);
      if (err.status !== 404) {
        setError(err.message || 'Failed to load agreements');
      }
    } finally {
      setIsLoadingAgreements(false);
    }
  };

  const createAgreementWithBuilder = async (useAria: boolean) => {
    if (!selectedFamilyFile) return;

    try {
      setIsCreatingAgreement(true);
      setShowBuilderChoice(false);

      const newAgreement = await agreementsAPI.createForFamilyFile(selectedFamilyFile.id, {
        title: `${selectedFamilyFile.title} - SharedCare Agreement`,
      });

      if (useAria) {
        router.push(`/agreements/${newAgreement.id}/aria`);
      } else {
        router.push(`/agreements/${newAgreement.id}/builder`);
      }
    } catch (err: any) {
      console.error('Failed to create agreement:', err);
      setError(err.message || 'Failed to create agreement');
      setIsCreatingAgreement(false);
    }
  };

  const canCreateAgreement = selectedFamilyFile && !selectedFamilyFile.has_court_case;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Navigation />

      {/* Page Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
              <FileSignature className="h-6 w-6 text-cg-sage" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">
                Agreements
              </h1>
              <p className="text-sm text-muted-foreground">
                The Living Documents that guide your co-parenting
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Family File Selection */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="cg-card p-5 sticky top-8">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-cg-sage" />
                Family Files
              </h2>

              {isLoadingFamilyFiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
                </div>
              ) : familyFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No family files</p>
                  <Link href="/family-files/new">
                    <button className="cg-btn-primary text-sm py-2">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Family File
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {familyFiles.map((familyFile) => (
                    <FamilyFileCard
                      key={familyFile.id}
                      familyFile={familyFile}
                      isSelected={selectedFamilyFile?.id === familyFile.id}
                      onSelect={() => handleSelectFamilyFile(familyFile)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Area - Agreements */}
          <div className="flex-1 min-w-0">
            {!selectedFamilyFile ? (
              <div className="cg-card">
                <div className="text-center py-16 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                    Select a Family File
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a family file from the sidebar to view and manage agreements
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Court Case Notice */}
                {selectedFamilyFile.has_court_case && (
                  <div className="cg-card p-5 bg-cg-amber-subtle/50 border-cg-amber/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-cg-amber/20 flex items-center justify-center flex-shrink-0">
                        <Scale className="h-5 w-5 text-cg-amber" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Court Custody Case Active</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This family file has an active Court Custody Case. New SharedCare Agreements cannot be created. Use QuickAccords for situational agreements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Family File Header */}
                <div className="cg-card p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h2 className="font-serif text-xl font-semibold text-foreground">
                        {selectedFamilyFile.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        SharedCare Agreements
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBuilderChoice(true)}
                      disabled={isCreatingAgreement || !canCreateAgreement}
                      className={`cg-btn-primary ${
                        !canCreateAgreement ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isCreatingAgreement ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : !canCreateAgreement ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Agreement
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoadingAgreements && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-cg-sage mx-auto" />
                      <p className="mt-4 text-muted-foreground">Loading agreements...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="cg-card p-5 bg-cg-error-subtle border-cg-error/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-cg-error flex-shrink-0" />
                      <div>
                        <p className="font-medium text-cg-error">Failed to load agreements</p>
                        <p className="text-sm text-cg-error/80 mt-1">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => loadAgreements(selectedFamilyFile.id)}
                      className="mt-4 cg-btn-secondary text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingAgreements &&
                  !error &&
                  (!selectedFamilyFile.agreements || selectedFamilyFile.agreements.length === 0) && (
                    <div className="cg-card">
                      <EmptyAgreementsState
                        canCreate={canCreateAgreement || false}
                        onCreate={() => setShowBuilderChoice(true)}
                      />
                    </div>
                  )}

                {/* Agreements Grid */}
                {!isLoadingAgreements &&
                  !error &&
                  selectedFamilyFile.agreements &&
                  selectedFamilyFile.agreements.length > 0 && (
                    <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                      {selectedFamilyFile.agreements.map((agreement) => (
                        <AgreementCard
                          key={agreement.id}
                          agreement={agreement}
                          onClick={() => router.push(`/agreements/${agreement.id}`)}
                        />
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Builder Choice Modal */}
        <BuilderChoiceModal
          isOpen={showBuilderChoice}
          isCreating={isCreatingAgreement}
          onClose={() => setShowBuilderChoice(false)}
          onSelectAria={() => createAgreementWithBuilder(true)}
          onSelectWizard={() => createAgreementWithBuilder(false)}
        />
      </main>
    </div>
  );
}

export default function AgreementsListPage() {
  return (
    <ProtectedRoute>
      <AgreementsListContent />
    </ProtectedRoute>
  );
}

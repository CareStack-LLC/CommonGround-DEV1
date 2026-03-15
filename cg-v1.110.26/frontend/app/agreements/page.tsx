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
  ChevronLeft,
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

/**
 * SharedCare Agreements - Legal Document Management
 *
 * Design Philosophy: Professional, trustworthy, organized
 * - Clear status indicators with contextual colors
 * - Clean card-based layout for easy scanning
 * - Prominent ARIA vs Wizard choice
 */

/* =============================================================================
   HELPER COMPONENTS
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
      className={`
        w-full text-left p-4 rounded-xl transition-all duration-200
        ${isSelected
          ? 'bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 border-2 border-[var(--portal-primary)] shadow-sm'
          : 'bg-card border-2 border-border hover:border-border hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
              isSelected
                ? 'bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <p className={`font-semibold ${isSelected ? 'text-[var(--portal-primary)]' : 'text-foreground'}`}>
              {familyFile.title}
            </p>
            <p className="text-xs text-muted-foreground">{familyFile.family_file_number}</p>
          </div>
        </div>
        {familyFile.has_court_case && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
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
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Active',
    },
    approved: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: 'Approved',
    },
    pending_approval: {
      icon: <Clock className="h-3.5 w-3.5" />,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
      label: 'Pending Approval',
    },
    draft: {
      icon: <FileText className="h-3.5 w-3.5" />,
      className: 'bg-muted text-foreground border-border',
      label: 'Draft',
    },
    rejected: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-red-100 text-red-700 border-red-200',
      label: 'Rejected',
    },
    expired: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: 'bg-orange-100 text-orange-700 border-orange-200',
      label: 'Expired',
    },
  };

  const { icon, className, label } = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${className}`}
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
      className="
        w-full text-left bg-card border-2 border-border rounded-2xl p-5 shadow-lg
        hover:shadow-xl hover:border-[var(--portal-primary)]/30 transition-all duration-300
        group
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-md">
            <FileSignature className="h-5 w-5 text-[var(--portal-primary)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-foreground truncate group-hover:text-[var(--portal-primary)] transition-colors" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              {agreement.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {agreement.agreement_number} • Version {agreement.version}
            </p>
          </div>
        </div>
        <StatusBadge status={agreement.status} />
      </div>

      {/* Details */}
      <div className="pl-[56px]">
        <p className="text-sm text-muted-foreground font-medium">
          Created {new Date(agreement.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        {/* Pending Approval Status */}
        {agreement.status === 'pending_approval' && (
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border-2 border-amber-200">
            <p className="text-xs font-bold text-amber-800 mb-2">Awaiting Approvals</p>
            <div className="flex gap-4 text-xs text-amber-700">
              <span className="flex items-center gap-1.5 font-medium">
                {agreement.petitioner_approved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />
                )}
                Parent A
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                {agreement.respondent_approved ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />
                )}
                Parent B
              </span>
            </div>
          </div>
        )}

        {/* Active/Approved Status */}
        {(agreement.status === 'approved' || agreement.status === 'active') &&
          agreement.effective_date && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-xl border-2 border-emerald-200">
              <p className="text-xs text-emerald-700">
                <span className="font-bold">Effective:</span>{' '}
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
      <div className="mt-4 pt-3 border-t-2 border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Click to view details</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
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
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
        <FileSignature className="h-10 w-10 text-[var(--portal-primary)]" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
        No Agreements Yet
      </h3>
      <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto leading-relaxed">
        Create your first SharedCare Agreement to establish clear guidelines for your co-parenting arrangement.
      </p>
      {canCreate && (
        <button
          onClick={onCreate}
          className="
            inline-flex items-center gap-2 px-6 py-3
            bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white
            rounded-xl font-bold shadow-md hover:shadow-lg
            transition-all duration-300
          "
        >
          <Plus className="h-4 w-4" />
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 border-2 border-border">
        {/* Header */}
        <div className="p-6 border-b-2 border-border">
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Create Your Agreement
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Choose how you'd like to build your parenting agreement
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* ARIA Option */}
          <button
            onClick={onSelectAria}
            disabled={isCreating}
            className="
              w-full text-left p-5 border-2 border-amber-200 rounded-2xl
              hover:border-amber-400 hover:bg-amber-50
              transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
              group shadow-lg hover:shadow-xl
            "
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-foreground group-hover:text-amber-700 transition-colors" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Talk to ARIA
                  </h3>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full shadow-sm">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Have a natural conversation about your custody arrangement. ARIA will ask questions and create your agreement.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    Conversational
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    Faster
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
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
            className="
              w-full text-left p-5 border-2 border-border rounded-2xl
              hover:border-[var(--portal-primary)]/50 hover:bg-[var(--portal-primary)]/5
              transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
              group shadow-lg hover:shadow-xl
            "
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] flex items-center justify-center text-white flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300">
                <FileText className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-[var(--portal-primary)] transition-colors mb-1" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Step-by-Step Wizard
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Fill out structured forms with clear sections for custody schedules, holidays, and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-1 bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] text-xs font-bold rounded-full">
                    Structured
                  </span>
                  <span className="px-2.5 py-1 bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] text-xs font-bold rounded-full">
                    Traditional
                  </span>
                  <span className="px-2.5 py-1 bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] text-xs font-bold rounded-full">
                    Detailed
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-border bg-muted rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="
              w-full px-4 py-3 bg-card border-2 border-border
              text-foreground rounded-xl font-bold
              hover:bg-muted hover:border-border transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed
            "
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
        router.push(`/agreements/${newAgreement.id}/builder-v2`);
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
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
              <FileSignature className="h-6 w-6 text-[var(--portal-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                Agreements
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Living documents that guide your co-parenting
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Family File Selection */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-5 sticky top-8">
              <h2 className="font-bold text-foreground mb-4 flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                <FolderOpen className="h-4 w-4 text-[var(--portal-primary)]" />
                Family Files
              </h2>

              {isLoadingFamilyFiles ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
                </div>
              ) : familyFiles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground font-medium mb-4">No family files</p>
                  <Link href="/family-files/new">
                    <button className="
                      inline-flex items-center gap-2 px-4 py-2 text-sm
                      bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white
                      rounded-xl font-bold shadow-md hover:shadow-lg
                      transition-all duration-300
                    ">
                      <Plus className="h-4 w-4" />
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
              <div className="bg-card rounded-2xl border-2 border-border shadow-lg">
                <div className="text-center py-16 px-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center shadow-md">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Select a Family File
                  </h3>
                  <p className="text-muted-foreground font-medium">
                    Choose a family file from the sidebar to view and manage agreements
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Court Case Notice */}
                {selectedFamilyFile.has_court_case && (
                  <div className="bg-card rounded-2xl border-2 border-amber-200 shadow-lg p-5 bg-gradient-to-r from-amber-50 to-transparent">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Scale className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Court Custody Case Active</h3>
                        <p className="text-sm text-muted-foreground font-medium mt-1 leading-relaxed">
                          This family file has an active Court Custody Case. New SharedCare Agreements cannot be created. Use QuickAccords for situational agreements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Family File Header */}
                <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                        {selectedFamilyFile.title}
                      </h2>
                      <p className="text-sm text-muted-foreground font-medium">
                        SharedCare Agreements
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBuilderChoice(true)}
                      disabled={isCreatingAgreement || !canCreateAgreement}
                      className={`
                        inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold
                        transition-all duration-300
                        ${!canCreateAgreement || isCreatingAgreement
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white shadow-md hover:shadow-lg'
                        }
                      `}
                    >
                      {isCreatingAgreement ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : !canCreateAgreement ? (
                        <>
                          <Lock className="h-4 w-4" />
                          Locked
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
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
                      <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
                      <p className="mt-4 text-muted-foreground font-medium">Loading agreements...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-card rounded-2xl border-2 border-red-200 shadow-lg p-5 bg-gradient-to-r from-red-50 to-transparent">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl shadow-md">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-red-900" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Failed to load agreements</p>
                        <p className="text-sm text-red-700 font-medium mt-1">{error}</p>
                        <button
                          onClick={() => loadAgreements(selectedFamilyFile.id)}
                          className="mt-3 px-4 py-2 bg-card border-2 border-red-300 text-red-700 rounded-xl text-sm font-bold hover:bg-red-50 transition-all duration-300"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingAgreements &&
                  !error &&
                  (!selectedFamilyFile.agreements || selectedFamilyFile.agreements.length === 0) && (
                    <div className="bg-card rounded-2xl border-2 border-border shadow-lg">
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

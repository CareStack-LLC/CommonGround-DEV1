'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, FamilyFile, FamilyFileInvitation } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import {
  CGCard,
  CGCardHeader,
  CGCardTitle,
  CGCardDescription,
  CGCardContent,
  CGButton,
  CGBadge,
  CGPageHeader,
  CGEmptyState,
  CGAvatar,
} from '@/components/cg';
import {
  Plus,
  FolderHeart,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  FileText,
  Zap,
  Scale,
  ChevronRight,
  Sparkles,
  MapPin,
} from 'lucide-react';

/* =============================================================================
   Family Files List Page - "The Sanctuary of Truth"
   Dashboard showing all family files with invitations
   ============================================================================= */

function FamilyFilesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [invitations, setInvitations] = useState<FamilyFileInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [filesResponse, invitationsResponse] = await Promise.all([
        familyFilesAPI.list(),
        familyFilesAPI.getInvitations(),
      ]);
      setFamilyFiles(filesResponse.items);
      setInvitations(invitationsResponse.items);
    } catch (err: any) {
      console.error('Failed to load family files:', err);
      setError(err.message || 'Failed to load family files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (id: string) => {
    try {
      setIsAccepting(id);
      await familyFilesAPI.acceptInvitation(id);
      await loadData();
      router.push(`/family-files/${id}`);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(null);
    }
  };

  const getStatusBadge = (status: string, isComplete: boolean) => {
    if (status === 'court_linked') {
      return (
        <CGBadge variant="slate">
          <Scale className="h-3 w-3 mr-1" />
          Court Linked
        </CGBadge>
      );
    }
    if (!isComplete) {
      return (
        <CGBadge variant="amber">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </CGBadge>
      );
    }
    return (
      <CGBadge className="bg-[var(--portal-primary)]/10 text-[var(--portal-primary)] border-[var(--portal-primary)]/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </CGBadge>
    );
  };

  const getRoleName = (role: string | null) => {
    if (!role) return 'Parent';
    switch (role) {
      case 'mother': return 'Mother';
      case 'father': return 'Father';
      case 'parent_a': return 'Parent A';
      case 'parent_b': return 'Parent B';
      default: return role;
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
        <p className="mt-4 text-slate-600 font-medium">Loading your family files...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600 font-medium mb-1">{getGreeting()}</p>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Family Files</h1>
          <p className="text-slate-600 font-medium mt-1">
            Manage your co-parenting arrangements
          </p>
        </div>
        <button
          onClick={() => router.push('/family-files/new')}
          className="cg-btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          New Family File
        </button>
      </div>

      {/* Error */}
      {error && (
        <CGCard variant="default" className="border-cg-error/30 bg-cg-error-subtle">
          <CGCardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-cg-error" />
              <p className="text-cg-error font-medium">{error}</p>
            </div>
          </CGCardContent>
        </CGCard>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
              <Mail className="h-5 w-5 text-[var(--portal-primary)]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Pending Invitations</h2>
          </div>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-white border-2 border-[var(--portal-primary)]/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                      <FolderHeart className="h-6 w-6 text-[var(--portal-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{invitation.title}</h3>
                      <p className="text-sm text-slate-600 font-medium">
                        {invitation.family_file_number} - Invited as {getRoleName(invitation.your_role)}
                      </p>
                    </div>
                  </div>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={isAccepting === invitation.id}
                      className="cg-btn-primary flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {isAccepting === invitation.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Joining...
                        </>
                      ) : (
                        'Accept & Join'
                      )}
                    </button>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Family Files Grid */}
      {familyFiles.length === 0 && invitations.length === 0 ? (
        <CGCard variant="elevated" className="p-0">
          <CGEmptyState
            icon={<FolderHeart className="h-8 w-8" />}
            title="No Family Files Yet"
            description="Create your first Family File to start managing your co-parenting arrangement. You can invite your co-parent to join."
            action={{
              label: "Create Family File",
              onClick: () => router.push('/family-files/new'),
            }}
            size="lg"
          />
        </CGCard>
      ) : familyFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 flex items-center justify-center shadow-md">
              <FolderHeart className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Your Family Files</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {familyFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => router.push(`/family-files/${file.id}`)}
                className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg hover:shadow-xl hover:border-[var(--portal-primary)]/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer p-6"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-md">
                        <FolderHeart className="h-6 w-6 text-[var(--portal-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{file.title}</h3>
                        <p className="text-xs text-slate-600 font-medium">
                          {file.family_file_number}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(file.status, file.is_complete)}
                  </div>
                  <div className="space-y-3">
                    {/* Parents */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {getRoleName(file.parent_a_role)}
                        {file.parent_b_id && (
                          <span className="text-muted-foreground"> & {getRoleName(file.parent_b_role)}</span>
                        )}
                        {!file.parent_b_id && file.parent_b_email && (
                          <span className="text-cg-amber text-xs ml-1">(pending)</span>
                        )}
                      </span>
                    </div>

                    {/* Location */}
                    {file.state && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {file.county && `${file.county}, `}{file.state}
                        </span>
                      </div>
                    )}

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                      {file.has_court_case && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-50 text-purple-600 text-xs font-medium">
                          <Scale className="h-3 w-3" />
                          Court
                        </div>
                      )}
                      {file.can_create_shared_care_agreement && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cg-slate-subtle text-cg-slate text-xs font-medium">
                          <FileText className="h-3 w-3" />
                          SharedCare
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cg-amber-subtle text-cg-amber text-xs font-medium">
                        <Zap className="h-3 w-3" />
                        QuickAccord
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FamilyFilesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 lg:pb-0">
        <Navigation />
        <PageContainer background="transparent">
          <FamilyFilesContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  familyFilesAPI,
  quickAccordsAPI,
  agreementsAPI,
  getImageUrl,
  FamilyFileDetail,
  QuickAccord,
  Agreement,
  ProfessionalAccess,
  ProfessionalAccessRequest,
} from '@/lib/api';
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
  CGActionItem,
  CGAvatar,
  CGEmptyState,
} from '@/components/cg';
import {
  ArrowLeft,
  FolderHeart,
  Users,
  Baby,
  FileText,
  Zap,
  Scale,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Plus,
  Settings,
  MessageSquare,
  DollarSign,
  CalendarPlus,
  Send,
  Video,
  Heart,
  Sparkles,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomingCallBanner } from "@/components/kidcoms/incoming-call-banner";
import { cn } from '@/lib/utils';
import { useFeatureGate } from '@/hooks/use-feature-gate';
import { TierBadge } from '@/components/tier-badge';
import { Lock } from 'lucide-react';
import { Trash2, UserMinus, Pencil, Gavel, Briefcase, Building2, XCircle, CheckCircle2, ExternalLink } from 'lucide-react';

/* =============================================================================
   Family File Detail Page - "The Sanctuary of Truth"
   Clean, organized view of family file with quick actions
   ============================================================================= */

function FamilyFileDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Feature gates
  const kidcomsGate = useFeatureGate('kidcoms_access');
  const quickAccordsGate = useFeatureGate('quick_accords');

  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [quickAccords, setQuickAccords] = useState<QuickAccord[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Professional Access State
  const [professionals, setProfessionals] = useState<ProfessionalAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ProfessionalAccessRequest[]>([]);
  const [isInviteProfOpen, setIsInviteProfOpen] = useState(false);
  const [profEmail, setProfEmail] = useState('');
  const [isInvitingProf, setIsInvitingProf] = useState(false);
  const [profInviteError, setProfInviteError] = useState<string | null>(null);
  const [profInviteSuccess, setProfInviteSuccess] = useState<string | null>(null);
  const [isRevokingAccess, setIsRevokingAccess] = useState<string | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);

  // Invitation State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isRemovingParent, setIsRemovingParent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showRemoveProfConfirm, setShowRemoveProfConfirm] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fileData, accordsData, agreementsData] = await Promise.all([
        familyFilesAPI.get(id),
        quickAccordsAPI.list(id),
        agreementsAPI.listForFamilyFile(id),
      ]);
      setFamilyFile(fileData);
      setQuickAccords(accordsData.items);
      setAgreements(agreementsData.items || []);

      // Load professional access data (non-blocking)
      loadProfessionalAccess();
    } catch (err: any) {
      console.error('Failed to load family file:', err);
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load family file');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfessionalAccess = async () => {
    try {
      const data = await familyFilesAPI.getProfessionalAccess(id);
      setProfessionals(data.professionals || []);
      setPendingRequests(data.pending_requests || []);
    } catch (err) {
      // Silently fail - professional access is optional
      console.error('Failed to load professional access:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      setInviteError('Please enter an email address');
      return;
    }

    try {
      setIsInviting(true);
      setInviteError(null);
      setInviteSuccess(null);
      await familyFilesAPI.inviteParentB(id, inviteEmail);
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      await loadData();
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to invite parent:', err);
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) return;

    try {
      setIsSavingTitle(true);
      setSettingsError(null);
      await familyFilesAPI.update(id, { title: newTitle.trim() });
      await loadData();
      setIsEditingTitle(false);
    } catch (err: any) {
      console.error('Failed to update title:', err);
      setSettingsError(err.message || 'Failed to update title');
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleRemoveParentB = async () => {
    try {
      setIsRemovingParent(true);
      setSettingsError(null);
      await familyFilesAPI.removeParentB(id);
      await loadData();
      setShowRemoveConfirm(false);
    } catch (err: any) {
      console.error('Failed to remove co-parent:', err);
      setSettingsError(err.message || 'Failed to remove co-parent');
    } finally {
      setIsRemovingParent(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setSettingsError(null);
      await familyFilesAPI.delete(id);
      router.push('/family-files');
    } catch (err: any) {
      console.error('Failed to delete family file:', err);
      setSettingsError(err.message || 'Failed to delete family file');
      setIsDeleting(false);
    }
  };

  const handleOpenSettings = () => {
    setNewTitle(familyFile?.title || '');
    setSettingsError(null);
    setShowDeleteConfirm(false);
    setShowRemoveConfirm(false);
    setIsEditingTitle(false);
    setIsSettingsOpen(true);
  };

  // Professional Access Handlers
  const handleInviteProfessional = async () => {
    if (!profEmail) {
      setProfInviteError('Please enter an email address');
      return;
    }

    try {
      setIsInvitingProf(true);
      setProfInviteError(null);
      setProfInviteSuccess(null);
      await familyFilesAPI.inviteProfessional(id, { email: profEmail });
      setProfInviteSuccess(`Invitation sent to ${profEmail}`);
      setProfEmail('');
      loadProfessionalAccess();
      setTimeout(() => {
        setIsInviteProfOpen(false);
        setProfInviteSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to invite professional:', err);
      setProfInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsInvitingProf(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setIsProcessingRequest(requestId);
      await familyFilesAPI.approveProfessionalRequest(id, requestId);
      loadProfessionalAccess();
    } catch (err: any) {
      console.error('Failed to approve request:', err);
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      setIsProcessingRequest(requestId);
      await familyFilesAPI.declineProfessionalRequest(id, requestId);
      loadProfessionalAccess();
    } catch (err: any) {
      console.error('Failed to decline request:', err);
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRevokeProfessionalAccess = async (assignmentId: string) => {
    try {
      setIsRevokingAccess(assignmentId);
      await familyFilesAPI.revokeProfessionalAccess(id, assignmentId);
      loadProfessionalAccess();
    } catch (err: any) {
      console.error('Failed to revoke access:', err);
    } finally {
      setIsRevokingAccess(null);
    }
  };

  const getProfessionalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attorney: 'Attorney',
      paralegal: 'Paralegal',
      mediator: 'Mediator',
      parenting_coordinator: 'Parenting Coordinator',
      intake_coordinator: 'Intake Coordinator',
      practice_admin: 'Practice Admin',
    };
    return labels[type] || type;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <CGBadge variant="sage">Active</CGBadge>;
      case 'pending_approval':
        return <CGBadge variant="amber">Pending</CGBadge>;
      case 'completed':
        return <CGBadge variant="slate">Completed</CGBadge>;
      case 'draft':
        return <CGBadge variant="default">Draft</CGBadge>;
      case 'revoked':
        return <CGBadge variant="error">Revoked</CGBadge>;
      default:
        return <CGBadge variant="default">{status}</CGBadge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'travel': return '✈️';
      case 'schedule_swap': return '🔄';
      case 'special_event': return '🎉';
      case 'overnight': return '🌙';
      case 'expense': return '💰';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
        <p className="mt-4 text-slate-600 font-medium">Loading family file...</p>
      </div>
    );
  }

  if (error || !familyFile) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="bg-white border-2 border-red-200 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center shadow-md">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-red-600 font-bold">{error || 'Family File not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isParentA = familyFile.parent_a_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Incoming Call Banner */}
      <IncomingCallBanner familyFileId={id} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <CGButton variant="ghost" size="sm" onClick={() => router.push('/family-files')}>
            <ArrowLeft className="h-5 w-5" />
          </CGButton>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                <FolderHeart className="h-5 w-5 text-[var(--portal-primary)]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{familyFile.title}</h1>
              {familyFile.has_court_case && (
                <CGBadge variant="slate">
                  <Scale className="h-3 w-3 mr-1" />
                  Court Linked
                </CGBadge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 ml-14">{familyFile.family_file_number}</p>
          </div>
        </div>
        <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <SheetTrigger asChild>
            <CGButton variant="ghost" size="sm" onClick={handleOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </CGButton>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                  <Settings className="h-5 w-5 text-[var(--portal-primary)]" />
                </div>
                Family File Settings
              </SheetTitle>
              <SheetDescription className="text-slate-600 font-medium">
                Manage your family file settings and preferences
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Error Display */}
              {settingsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{settingsError}</AlertDescription>
                </Alert>
              )}

              {/* Edit Title Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-900">Family File Name</Label>
                {isEditingTitle ? (
                  <div className="space-y-3">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Enter family file name"
                      className="focus-visible:ring-[var(--portal-primary)] border-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveTitle}
                        disabled={isSavingTitle || !newTitle.trim()}
                        className="cg-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingTitle ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingTitle(false);
                          setNewTitle(familyFile?.title || '');
                        }}
                        className="cg-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <span className="text-slate-900 font-medium">{familyFile?.title}</span>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Send to Court Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-900">Court Filing</Label>
                <p className="text-sm text-slate-600 font-medium">
                  Start the FL-300/FL-311 process to submit your family file to the court.
                </p>
                <button
                  onClick={() => router.push(`/family-files/${id}/court-filing`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center shadow-md">
                    <Gavel className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-bold text-slate-900">Send Family File to Court</span>
                </button>
              </div>

              {/* Danger Zone - Only for Parent A */}
              {isParentA && (
                <>
                  <div className="border-t border-border" />

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-red-600">Danger Zone</Label>
                      <p className="text-sm text-slate-600 font-medium mt-1">
                        These actions cannot be undone.
                      </p>
                    </div>

                    {/* Remove Parent B */}
                    {(familyFile?.parent_b_id || familyFile?.parent_b_email) && !familyFile?.has_court_case && (
                      <div className="space-y-2">
                        {!showRemoveConfirm ? (
                          <button
                            onClick={() => setShowRemoveConfirm(true)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center shadow-md">
                              <UserMinus className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">Remove Co-Parent</div>
                              <div className="text-sm text-slate-600 font-medium">
                                Revoke their access to this family file
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                            <p className="text-sm text-slate-900 font-bold">
                              Are you sure you want to remove the co-parent?
                            </p>
                            <p className="text-sm text-slate-600 font-medium">
                              They will lose access to this family file and all shared data.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={handleRemoveParentB}
                                disabled={isRemovingParent}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isRemovingParent ? 'Removing...' : 'Yes, Remove'}
                              </button>
                              <button
                                onClick={() => setShowRemoveConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-medium hover:bg-slate-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Remove Legal Professional */}
                    {professionals.length > 0 && (
                      <div className="space-y-2">
                        {!showRemoveProfConfirm ? (
                          <button
                            onClick={() => setShowRemoveProfConfirm(true)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center shadow-md">
                              <Briefcase className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">Remove Legal Professional</div>
                              <div className="text-sm text-slate-600 font-medium">
                                Revoke access for {professionals[0]?.firm_name || professionals[0]?.professional_name || 'your legal professional'}
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                            <p className="text-sm text-slate-900 font-bold">
                              Remove legal professional access?
                            </p>
                            <p className="text-sm text-slate-600 font-medium">
                              {professionals[0]?.firm_name || professionals[0]?.professional_name} will lose access to this family file.
                              You can invite a new firm from the Professional Directory afterwards.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (professionals[0]?.assignment_id) {
                                    handleRevokeProfessionalAccess(professionals[0].assignment_id);
                                  }
                                  setShowRemoveProfConfirm(false);
                                }}
                                disabled={isRevokingAccess !== null}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isRevokingAccess ? 'Removing...' : 'Yes, Remove'}
                              </button>
                              <button
                                onClick={() => setShowRemoveProfConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-medium hover:bg-slate-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete Family File */}
                    {!familyFile?.has_court_case && (
                      <div className="space-y-2">
                        {!showDeleteConfirm ? (
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center shadow-md">
                              <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <div className="font-bold text-red-600">Delete Family File</div>
                              <div className="text-sm text-slate-600 font-medium">
                                Permanently delete this family file and all data
                              </div>
                            </div>
                          </button>
                        ) : (
                          <div className="p-4 rounded-xl border-2 border-red-300 bg-red-50 space-y-3">
                            <p className="text-sm text-slate-900 font-bold">
                              Are you absolutely sure?
                            </p>
                            <p className="text-sm text-slate-600 font-medium">
                              This will permanently delete the family file, all agreements, messages, and related data. This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 font-medium hover:bg-slate-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Court Case Warning */}
                    {familyFile?.has_court_case && (
                      <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center shadow-md flex-shrink-0">
                          <Scale className="h-5 w-5 text-purple-600" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">
                          Removal and deletion are disabled because this family file is linked to a court case.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Status Alert */}
      {!familyFile.is_complete && (
        <div className="bg-white border-2 border-[#F59E0B]/30 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B]/10 to-[#F59E0B]/5 flex items-center justify-center shadow-md">
              <Clock className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <p className="text-slate-900 font-medium">
              {familyFile.parent_b_email ? (
                <>Waiting for <span className="font-bold">{familyFile.parent_b_email}</span> to accept the invitation.</>
              ) : (
                <>Invite your co-parent to complete this Family File.</>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Quick Actions</h2>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push(`/payments/new?familyFileId=${id}`)}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">ClearFund Request</div>
                    <div className="text-sm text-slate-600 font-medium">
                      Request expense reimbursement
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/schedule?familyFileId=${id}&action=new-event`)}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <CalendarPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">New Event</div>
                    <div className="text-sm text-slate-600 font-medium">
                      Add to shared calendar
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/messages?familyFileId=${id}`)}
                  className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                    <MessageSquare className="h-5 w-5 text-[var(--portal-primary)]" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Messages</div>
                    <div className="text-sm text-slate-600 font-medium">
                      Chat with your co-parent
                    </div>
                  </div>
                </button>

                {kidcomsGate.hasAccess ? (
                  <button
                    onClick={() => router.push(`/family-files/${id}/kidcoms`)}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Video className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">KidComs</div>
                      <div className="text-sm text-slate-600 font-medium">
                        Video calls for kids
                      </div>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/settings/billing')}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left group opacity-75"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200/50 to-slate-300/30 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Video className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-500">KidComs</span>
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                        <TierBadge tier="complete" size="sm" />
                      </div>
                      <div className="text-sm text-slate-500 font-medium">
                        Video calls for kids
                      </div>
                    </div>
                  </button>
                )}

                {!familyFile.parent_b_id && (
                  <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-start gap-4 p-4 rounded-xl border-2 border-[var(--portal-primary)]/30 bg-[var(--portal-primary)]/5 hover:bg-[var(--portal-primary)]/10 hover:border-[var(--portal-primary)]/50 hover:shadow-md transition-all text-left group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Mail className="h-5 w-5 text-[var(--portal-primary)]" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">Invite Co-Parent</div>
                          <div className="text-sm text-slate-600 font-medium">
                            Send invitation email
                          </div>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Invite Co-Parent</DialogTitle>
                        <DialogDescription>
                          Send an email invitation to the other parent to join this Family File.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="focus-visible:ring-cg-sage"
                          />
                        </div>
                        {inviteError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{inviteError}</AlertDescription>
                          </Alert>
                        )}
                        {inviteSuccess && (
                          <Alert className="bg-cg-sage-subtle text-cg-sage border-cg-sage/30">
                            <CheckCircle className="h-4 w-4 text-cg-sage" />
                            <AlertDescription>{inviteSuccess}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <DialogFooter>
                        <CGButton variant="ghost" onClick={() => setIsInviteOpen(false)}>
                          Cancel
                        </CGButton>
                        <CGButton variant="primary" onClick={handleInvite} disabled={isInviting || !!inviteSuccess}>
                          {isInviting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Invite
                            </>
                          )}
                        </CGButton>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>

          {/* QuickAccords */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B]/10 to-[#F59E0B]/5 flex items-center justify-center shadow-md">
                    <Zap className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>QuickAccords</h2>
                    <p className="text-sm text-slate-600 font-medium">Situational agreements</p>
                  </div>
                </div>
              </div>
              {quickAccordsGate.hasAccess ? (
                <button
                  onClick={() => router.push(`/family-files/${id}/quick-accord/new`)}
                  className="cg-btn-primary flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              ) : (
                <button
                  onClick={() => router.push('/settings/billing')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <Lock className="h-4 w-4" />
                  New
                  <TierBadge tier="plus" size="sm" />
                </button>
              )}
            </div>
            <div>
              {quickAccords.length === 0 ? (
                <CGEmptyState
                  icon={<Zap className="h-6 w-6" />}
                  title="No QuickAccords yet"
                  description="Create one for schedule swaps, trips, or events"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {quickAccords.slice(0, 3).map((accord) => (
                    <button
                      key={accord.id}
                      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left"
                      onClick={() => router.push(`/family-files/${id}/quick-accord/${accord.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(accord.purpose_category)}</span>
                        <div>
                          <div className="font-medium text-foreground">{accord.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {accord.accord_number}
                            {accord.event_date && ` - ${new Date(accord.event_date).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(accord.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                  <button
                    className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 transition-colors"
                    onClick={() => router.push(`/family-files/${id}/quick-accords`)}
                  >
                    View All QuickAccords ({quickAccords.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SharedCare Agreements */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 flex items-center justify-center shadow-md">
                    <FileText className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>SharedCare Agreements</h2>
                    <p className="text-sm text-slate-600 font-medium">Comprehensive co-parenting agreements</p>
                  </div>
                </div>
              </div>
              {familyFile.can_create_shared_care_agreement && (
                <button
                  onClick={() => router.push(`/agreements/new?familyFileId=${id}`)}
                  className="cg-btn-secondary flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              )}
            </div>
            <div>
              {agreements.length === 0 ? (
                <CGEmptyState
                  icon={<FileText className="h-6 w-6" />}
                  title="No SharedCare Agreements yet"
                  description={
                    familyFile.can_create_shared_care_agreement
                      ? 'Create a comprehensive co-parenting agreement'
                      : 'New agreements require court approval when a Court Case is linked'
                  }
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {agreements.slice(0, 3).map((agreement) => (
                    <button
                      key={agreement.id}
                      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-[var(--portal-primary)]/30 hover:shadow-md transition-all text-left"
                      onClick={() => router.push(`/agreements/${agreement.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 flex items-center justify-center shadow-md">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{agreement.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(agreement.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(agreement.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                  <button
                    className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 transition-colors"
                    onClick={() => router.push(`/agreements?familyFileId=${id}`)}
                  >
                    View All Agreements ({agreements.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Parents */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                <Users className="h-5 w-5 text-[var(--portal-primary)]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Parents</h2>
            </div>
            <div className="space-y-4">
              {/* Parent A */}
              <div className="flex items-center gap-3">
                <CGAvatar name={getRoleName(familyFile.parent_a_role)} size="md" color="sage" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{getRoleName(familyFile.parent_a_role)}</div>
                  <div className="text-sm text-muted-foreground">
                    {isParentA ? 'You' : 'Co-parent'}
                  </div>
                </div>
                {isParentA && <CGBadge variant="sage">You</CGBadge>}
              </div>

              {/* Parent B */}
              <div className="flex items-center gap-3">
                {familyFile.parent_b_id ? (
                  <CGAvatar name={getRoleName(familyFile.parent_b_role)} size="md" color="slate" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {familyFile.parent_b_id
                      ? getRoleName(familyFile.parent_b_role)
                      : 'Pending Invitation'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {familyFile.parent_b_email || 'Not invited'}
                  </div>
                </div>
                {familyFile.parent_b_id && !isParentA && (
                  <CGBadge variant="slate">You</CGBadge>
                )}
              </div>
            </div>
          </div>

          {/* Children */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 flex items-center justify-center shadow-md">
                  <Baby className="h-5 w-5 text-[var(--portal-primary)]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Children</h2>
              </div>
              <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <Plus className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <div>
              {familyFile.children.length === 0 ? (
                <CGEmptyState
                  icon={<Baby className="h-6 w-6" />}
                  title="No children added"
                  size="sm"
                />
              ) : (
                <div className="space-y-2">
                  {familyFile.children.map((child) => (
                    <button
                      key={child.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                      onClick={() => router.push(`/family-files/${id}/children/${child.id}`)}
                    >
                      <CGAvatar
                        name={child.preferred_name || child.first_name}
                        src={child.photo_url ? getImageUrl(child.photo_url) ?? undefined : undefined}
                        size="sm"
                        color="sage"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {child.preferred_name || child.first_name} {child.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(child.date_of_birth).toLocaleDateString()}
                        </div>
                      </div>
                      {child.status !== 'active' && (
                        <CGBadge variant="default" className="flex-shrink-0">
                          {child.status}
                        </CGBadge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Details</h2>
            <div className="space-y-3 text-sm">
              {familyFile.state && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="text-foreground font-medium">
                    {familyFile.county && `${familyFile.county}, `}{familyFile.state}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ARIA</span>
                <CGBadge variant={familyFile.aria_enabled ? 'sage' : 'default'}>
                  {familyFile.aria_enabled ? 'Enabled' : 'Disabled'}
                </CGBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground font-medium">
                  {new Date(familyFile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Professional Access */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 flex items-center justify-center shadow-md">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Legal Team</h2>
              </div>
              <Dialog open={isInviteProfOpen} onOpenChange={setIsInviteProfOpen}>
                <DialogTrigger asChild>
                  <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-slate-600" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-emerald-600" />
                      Invite a Professional
                    </DialogTitle>
                    <DialogDescription>
                      Invite an attorney, mediator, or other legal professional to access your family file.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="prof-email">Professional's Email</Label>
                      <Input
                        id="prof-email"
                        placeholder="attorney@lawfirm.com"
                        type="email"
                        value={profEmail}
                        onChange={(e) => setProfEmail(e.target.value)}
                        className="focus-visible:ring-emerald-600"
                      />
                    </div>
                    <button
                      className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 flex items-center justify-center gap-2 transition-colors"
                      onClick={() => {
                        setIsInviteProfOpen(false);
                        router.push(`/find-professionals?familyFileId=${id}`);
                      }}
                    >
                      <Building2 className="h-4 w-4" />
                      Browse Firm Directory Instead
                    </button>
                    {profInviteError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{profInviteError}</AlertDescription>
                      </Alert>
                    )}
                    {profInviteSuccess && (
                      <Alert className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <AlertDescription>{profInviteSuccess}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <DialogFooter>
                    <CGButton variant="ghost" onClick={() => setIsInviteProfOpen(false)}>
                      Cancel
                    </CGButton>
                    <CGButton
                      variant="secondary"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={handleInviteProfessional}
                      disabled={isInvitingProf || !!profInviteSuccess}
                    >
                      {isInvitingProf ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Invite
                        </>
                      )}
                    </CGButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div>
              {/* Pending Access Requests */}
              {pendingRequests.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pending Requests
                  </div>
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">
                            {request.professional_name || request.professional_email}
                          </div>
                          {request.firm_name && (
                            <div className="text-xs text-muted-foreground">{request.firm_name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={isProcessingRequest === request.id}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Professionals */}
              {professionals.length === 0 && pendingRequests.length === 0 ? (
                <CGEmptyState
                  icon={<Briefcase className="h-6 w-6" />}
                  title="No professionals yet"
                  description="Invite your attorney or mediator"
                  size="sm"
                />
              ) : professionals.length > 0 ? (
                <div className="space-y-2">
                  {professionals.map((prof) => (
                    <div
                      key={prof.assignment_id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">
                            {prof.professional_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getProfessionalTypeLabel(prof.professional_type)}
                            {prof.firm_name && ` · ${prof.firm_name}`}
                          </div>
                        </div>
                      </div>
                      <button
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded disabled:opacity-50"
                        onClick={() => handleRevokeProfessionalAccess(prof.assignment_id)}
                        disabled={isRevokingAccess === prof.assignment_id}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Find Professionals Link */}
              <button
                className="w-full mt-3 text-slate-600 hover:text-slate-900 font-medium py-2 flex items-center justify-center gap-2 transition-colors"
                onClick={() => router.push(`/find-professionals?familyFileId=${id}`)}
              >
                <ExternalLink className="h-4 w-4" />
                Browse Firm Directory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FamilyFileDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 lg:pb-0">
        <Navigation />
        <PageContainer background="transparent">
          <FamilyFileDetailContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

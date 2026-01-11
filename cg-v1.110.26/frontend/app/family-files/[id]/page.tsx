'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, quickAccordsAPI, agreementsAPI, FamilyFileDetail, QuickAccord, Agreement } from '@/lib/api';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomingCallBanner } from "@/components/kidcoms/incoming-call-banner";
import { cn } from '@/lib/utils';

/* =============================================================================
   Family File Detail Page - "The Sanctuary of Truth"
   Clean, organized view of family file with quick actions
   ============================================================================= */

function FamilyFileDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [quickAccords, setQuickAccords] = useState<QuickAccord[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invitation State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

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
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-cg-sage animate-pulse" />
          </div>
        </div>
        <p className="mt-4 text-muted-foreground font-medium">Loading family file...</p>
      </div>
    );
  }

  if (error || !familyFile) {
    return (
      <div className="space-y-4">
        <CGButton variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </CGButton>
        <CGCard variant="default" className="border-cg-error/30 bg-cg-error-subtle">
          <CGCardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-cg-error" />
              <p className="text-cg-error font-medium">{error || 'Family File not found'}</p>
            </div>
          </CGCardContent>
        </CGCard>
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
              <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center">
                <FolderHeart className="h-5 w-5 text-cg-sage" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">{familyFile.title}</h1>
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
        <CGButton variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </CGButton>
      </div>

      {/* Status Alert */}
      {!familyFile.is_complete && (
        <CGCard variant="default" className="border-cg-amber/30 bg-cg-amber-subtle/50">
          <CGCardContent className="py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-cg-amber" />
              <p className="text-foreground">
                {familyFile.parent_b_email ? (
                  <>Waiting for <span className="font-medium">{familyFile.parent_b_email}</span> to accept the invitation.</>
                ) : (
                  <>Invite your co-parent to complete this Family File.</>
                )}
              </p>
            </div>
          </CGCardContent>
        </CGCard>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle>Quick Actions</CGCardTitle>
            </CGCardHeader>
            <CGCardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => router.push(`/payments/new?familyFileId=${id}`)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">ClearFund Request</div>
                    <div className="text-sm text-muted-foreground">
                      Request expense reimbursement
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/schedule?familyFileId=${id}&action=new-event`)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <CalendarPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">New Event</div>
                    <div className="text-sm text-muted-foreground">
                      Add to shared calendar
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/messages?familyFileId=${id}`)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="h-5 w-5 text-cg-sage" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Messages</div>
                    <div className="text-sm text-muted-foreground">
                      Chat with your co-parent
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push(`/family-files/${id}/kidcoms`)}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">KidComs</div>
                    <div className="text-sm text-muted-foreground">
                      Video calls for kids
                    </div>
                  </div>
                </button>

                {!familyFile.parent_b_id && (
                  <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-start gap-4 p-4 rounded-xl border border-cg-sage/30 bg-cg-sage-subtle/30 hover:bg-cg-sage-subtle/50 hover:border-cg-sage/50 transition-all text-left group">
                        <div className="w-10 h-10 rounded-xl bg-cg-sage-subtle flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <Mail className="h-5 w-5 text-cg-sage" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Invite Co-Parent</div>
                          <div className="text-sm text-muted-foreground">
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
            </CGCardContent>
          </CGCard>

          {/* QuickAccords */}
          <CGCard variant="elevated">
            <CGCardHeader className="flex flex-row items-center justify-between">
              <div>
                <CGCardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cg-amber" />
                  QuickAccords
                </CGCardTitle>
                <CGCardDescription>Situational agreements</CGCardDescription>
              </div>
              <CGButton
                size="sm"
                variant="primary"
                onClick={() => router.push(`/family-files/${id}/quick-accord/new`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </CGButton>
            </CGCardHeader>
            <CGCardContent>
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
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-left"
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
                  <CGButton
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/family-files/${id}/quick-accords`)}
                  >
                    View All QuickAccords ({quickAccords.length})
                  </CGButton>
                </div>
              )}
            </CGCardContent>
          </CGCard>

          {/* SharedCare Agreements */}
          <CGCard variant="elevated">
            <CGCardHeader className="flex flex-row items-center justify-between">
              <div>
                <CGCardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cg-slate" />
                  SharedCare Agreements
                </CGCardTitle>
                <CGCardDescription>Comprehensive co-parenting agreements</CGCardDescription>
              </div>
              {familyFile.can_create_shared_care_agreement && (
                <CGButton
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push(`/agreements/new?familyFileId=${id}`)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </CGButton>
              )}
            </CGCardHeader>
            <CGCardContent>
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
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-left"
                      onClick={() => router.push(`/agreements/${agreement.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cg-slate-subtle flex items-center justify-center">
                          <FileText className="h-5 w-5 text-cg-slate" />
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
                  <CGButton
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/agreements?familyFileId=${id}`)}
                  >
                    View All Agreements ({agreements.length})
                  </CGButton>
                </div>
              )}
            </CGCardContent>
          </CGCard>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Parents */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cg-sage" />
                Parents
              </CGCardTitle>
            </CGCardHeader>
            <CGCardContent className="space-y-4">
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
            </CGCardContent>
          </CGCard>

          {/* Children */}
          <CGCard variant="elevated">
            <CGCardHeader className="flex flex-row items-center justify-between">
              <CGCardTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-cg-sage" />
                Children
              </CGCardTitle>
              <CGButton variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
              </CGButton>
            </CGCardHeader>
            <CGCardContent>
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
            </CGCardContent>
          </CGCard>

          {/* Info */}
          <CGCard variant="default">
            <CGCardHeader>
              <CGCardTitle>Details</CGCardTitle>
            </CGCardHeader>
            <CGCardContent className="space-y-3 text-sm">
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
            </CGCardContent>
          </CGCard>
        </div>
      </div>
    </div>
  );
}

export default function FamilyFileDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer>
          <FamilyFileDetailContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

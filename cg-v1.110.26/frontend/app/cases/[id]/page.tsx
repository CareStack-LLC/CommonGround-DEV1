'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { casesAPI, agreementsAPI, courtAccessAPI, Case, Agreement, AgreementQuickSummary, CourtAccessGrant, CourtRole } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer, EmptyState } from '@/components/layout';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  RefreshCw,
  FileText,
  MessageSquare,
  CalendarDays,
  Download,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  ClipboardList,
  Scale,
  UserPlus,
  Shield,
  XCircle,
} from 'lucide-react';

function CaseDetailsContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [agreementSummary, setAgreementSummary] = useState<AgreementQuickSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAgreement, setIsLoadingAgreement] = useState(false);
  const [isCreatingAgreement, setIsCreatingAgreement] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invitation acceptance
  const [invitationToken, setInvitationToken] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Builder choice modal
  const [showBuilderChoice, setShowBuilderChoice] = useState(false);

  // Court access
  const [courtGrants, setCourtGrants] = useState<CourtAccessGrant[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<CourtRole>('gal');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    loadCase();
    loadAgreement();
    loadCourtGrants();
  }, [caseId]);

  const loadCourtGrants = async () => {
    try {
      setIsLoadingGrants(true);
      const grants = await courtAccessAPI.listGrants(caseId, false);
      setCourtGrants(grants);
    } catch (err) {
      console.error('Failed to load court grants:', err);
      // Silently fail - it's ok if no grants exist
    } finally {
      setIsLoadingGrants(false);
    }
  };

  const handleInviteProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);

    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Please fill in all required fields');
      return;
    }

    try {
      setIsInviting(true);
      await courtAccessAPI.inviteProfessional({
        case_id: caseId,
        professional_email: inviteEmail,
        professional_name: inviteName,
        role: inviteRole,
        authorization_type: 'parental_consent',
      });
      setInviteSuccess(true);
      setInviteEmail('');
      setInviteName('');
      setShowInviteForm(false);
      await loadCourtGrants();
    } catch (err: any) {
      console.error('Failed to invite professional:', err);
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke this access?')) return;

    try {
      await courtAccessAPI.revokeGrant(grantId, 'Revoked by parent');
      await loadCourtGrants();
    } catch (err: any) {
      console.error('Failed to revoke grant:', err);
      setError(err.message || 'Failed to revoke access');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      gal: 'Guardian ad Litem',
      attorney_petitioner: 'Attorney (Petitioner)',
      attorney_respondent: 'Attorney (Respondent)',
      mediator: 'Mediator',
      court_clerk: 'Court Clerk',
      judge: 'Judge',
    };
    return labels[role] || role;
  };

  const getGrantStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending_consent':
      case 'pending_verification':
        return 'warning';
      case 'expired':
      case 'revoked':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const loadCase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await casesAPI.get(caseId);
      setCaseData(data);
    } catch (err: any) {
      console.error('Failed to load case:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgreement = async () => {
    try {
      setIsLoadingAgreement(true);
      const agreements = await agreementsAPI.list(caseId);
      if (agreements.length > 0) {
        setAgreement(agreements[0]);
        // Try to get AI summary
        try {
          const summary = await agreementsAPI.getQuickSummary(agreements[0].id);
          setAgreementSummary(summary);
        } catch {
          // Summary may fail if AI is unavailable
        }
      }
    } catch (err: any) {
      console.error('Failed to load agreement:', err);
      // Silently fail - it's ok if no agreement exists
    } finally {
      setIsLoadingAgreement(false);
    }
  };

  const handleAgreementAction = async () => {
    if (agreement) {
      // Agreement exists - navigate to it
      router.push(`/agreements/${agreement.id}`);
    } else {
      // No agreement - show choice modal
      setShowBuilderChoice(true);
    }
  };

  const createAgreementWithBuilder = async (useAria: boolean) => {
    try {
      setIsCreatingAgreement(true);
      setShowBuilderChoice(false);
      const newAgreement = await agreementsAPI.create({
        case_id: caseId,
        title: `${caseData?.case_name} - Parenting Agreement`,
        agreement_type: 'parenting_plan',
      });

      // Navigate to chosen builder
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

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcceptError(null);

    if (!invitationToken.trim()) {
      setAcceptError('Please enter the invitation token');
      return;
    }

    try {
      setIsAccepting(true);
      await casesAPI.acceptInvitation(caseId, invitationToken);

      // Reload case data to show updated status
      await loadCase();
      setInvitationToken('');
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setAcceptError(err.message || 'Invalid invitation token');
    } finally {
      setIsAccepting(false);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'error' | 'secondary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'active':
        return 'This case is active and both parents have joined.';
      case 'pending':
        return 'Waiting for the other parent to accept the invitation.';
      case 'suspended':
        return 'This case has been temporarily suspended.';
      case 'closed':
        return 'This case has been closed.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <PageContainer>
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/cases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading case details...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadCase}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Case Details */}
        {!isLoading && !error && caseData && (
          <div className="space-y-6">
            {/* Case Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle className="text-2xl">{caseData.case_name}</CardTitle>
                      <Badge variant={getStatusVariant(caseData.status)}>
                        {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                      </Badge>
                    </div>
                    {caseData.case_number && (
                      <p className="text-sm text-muted-foreground">
                        Case Number: {caseData.case_number}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleAgreementAction}
                    disabled={isCreatingAgreement || isLoadingAgreement}
                  >
                    {isCreatingAgreement ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Creating...
                      </>
                    ) : isLoadingAgreement ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Loading...
                      </>
                    ) : agreement ? (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        View Agreement
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Build Agreement
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>State: {caseData.state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(caseData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  {caseData.updated_at !== caseData.created_at && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Updated: {new Date(caseData.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <Alert className="mt-4" variant={caseData.status === 'active' ? 'default' : caseData.status === 'pending' ? 'default' : 'destructive'}>
                  {caseData.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-cg-success" />
                  ) : caseData.status === 'pending' ? (
                    <Clock className="h-4 w-4 text-cg-warning" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{getStatusMessage(caseData.status)}</AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Agreement Glance (if exists) */}
            {agreement && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cg-primary" />
                      <CardTitle className="text-lg">{agreement.title}</CardTitle>
                    </div>
                    <Badge
                      variant={
                        agreement.status === 'approved'
                          ? 'success'
                          : agreement.status === 'pending_approval'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {agreement.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <CardDescription>
                    {agreement.status === 'draft' && 'Continue building your custody agreement'}
                    {agreement.status === 'pending_approval' && 'Waiting for both parents to approve'}
                    {agreement.status === 'approved' && 'Agreement is active and court-ready'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* AI Summary */}
                  {agreementSummary && (
                    <div className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-medium">{agreementSummary.completion_percentage}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cg-primary rounded-full transition-all duration-500"
                            style={{ width: `${agreementSummary.completion_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Summary Text */}
                      <p className="text-muted-foreground leading-relaxed">
                        {agreementSummary.summary}
                      </p>

                      {/* Key Points */}
                      {agreementSummary.key_points.length > 0 && (
                        <div className="pt-2">
                          <p className="text-sm font-medium mb-2">Key Points:</p>
                          <ul className="space-y-1.5">
                            {agreementSummary.key_points.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-cg-success mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* View Button */}
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => router.push(`/agreements/${agreement.id}`)}
                      >
                        View Full Agreement
                      </Button>
                    </div>
                  )}

                  {/* Fallback if no summary */}
                  {!agreementSummary && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/agreements/${agreement.id}`)}
                    >
                      {agreement.status === 'draft' ? 'Continue Building' : 'View Agreement'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invitation Acceptance (only for pending cases) */}
            {caseData.status === 'pending' && (
              <Card className="border-cg-warning/30 bg-cg-warning-subtle">
                <CardHeader>
                  <CardTitle>Accept Case Invitation</CardTitle>
                  <CardDescription>
                    Enter the invitation token you received via email to join this case
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAcceptInvitation} className="space-y-4">
                    <div>
                      <Label htmlFor="invitationToken">Invitation Token</Label>
                      <Input
                        id="invitationToken"
                        type="text"
                        placeholder="Enter token from email"
                        value={invitationToken}
                        onChange={(e) => setInvitationToken(e.target.value)}
                        className="mt-1"
                        disabled={isAccepting}
                      />
                    </div>

                    {acceptError && (
                      <div className="flex items-center gap-2 text-cg-error text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {acceptError}
                      </div>
                    )}

                    <Button type="submit" disabled={isAccepting}>
                      {isAccepting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Accepting...
                        </>
                      ) : (
                        'Accept Invitation'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions (for active cases) */}
            {caseData.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Manage your case and communicate with the other parent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2"
                      onClick={() => router.push(`/messages?case=${caseId}`)}
                    >
                      <MessageSquare className="h-8 w-8 text-cg-primary" />
                      <span className="font-medium">Send Message</span>
                      <span className="text-xs text-muted-foreground">ARIA-powered communication</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2"
                      onClick={() => router.push(`/schedule?case=${caseId}`)}
                    >
                      <CalendarDays className="h-8 w-8 text-purple-600" />
                      <span className="font-medium">View Schedule</span>
                      <span className="text-xs text-muted-foreground">Parenting time calendar</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2"
                      onClick={() => router.push(`/cases/${caseId}/children`)}
                    >
                      <Users className="h-8 w-8 text-green-600" />
                      <span className="font-medium">Children & Cubbies</span>
                      <span className="text-xs text-muted-foreground">Profiles, info & item tracking</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2"
                      onClick={() => router.push(`/cases/${caseId}/court-forms`)}
                    >
                      <Scale className="h-8 w-8 text-indigo-600" />
                      <span className="font-medium">Court Forms</span>
                      <span className="text-xs text-muted-foreground">FL-300, FL-311, FL-320</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-6 flex flex-col items-center gap-2"
                      onClick={() => router.push(`/cases/${caseId}/exports`)}
                    >
                      <Download className="h-8 w-8 text-cg-success" />
                      <span className="font-medium">Export Case</span>
                      <span className="text-xs text-muted-foreground">Court-ready documentation</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share with Court Section */}
            {caseData.status === 'active' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-indigo-600" />
                      <CardTitle>Court & Legal Access</CardTitle>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowInviteForm(!showInviteForm)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Professional
                    </Button>
                  </div>
                  <CardDescription>
                    Grant secure, time-limited access to legal professionals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Success message */}
                  {inviteSuccess && (
                    <Alert className="bg-cg-success/10 border-cg-success/20">
                      <CheckCircle className="h-4 w-4 text-cg-success" />
                      <AlertDescription className="text-cg-success">
                        Invitation sent successfully! The professional will receive access once verified.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Invite Form */}
                  {showInviteForm && (
                    <Card className="border-indigo-200 bg-indigo-50/50">
                      <CardContent className="pt-4">
                        <form onSubmit={handleInviteProfessional} className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="inviteName">Professional Name *</Label>
                              <Input
                                id="inviteName"
                                type="text"
                                placeholder="Jane Smith"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="inviteEmail">Email Address *</Label>
                              <Input
                                id="inviteEmail"
                                type="email"
                                placeholder="attorney@lawfirm.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="inviteRole">Role</Label>
                            <select
                              id="inviteRole"
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value as CourtRole)}
                              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="gal">Guardian ad Litem (GAL)</option>
                              <option value="attorney_petitioner">Attorney (Petitioner)</option>
                              <option value="attorney_respondent">Attorney (Respondent)</option>
                              <option value="mediator">Mediator</option>
                              <option value="court_clerk">Court Clerk</option>
                              <option value="judge">Judge</option>
                            </select>
                          </div>

                          {inviteError && (
                            <div className="flex items-center gap-2 text-cg-error text-sm">
                              <AlertCircle className="h-4 w-4" />
                              {inviteError}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowInviteForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isInviting}>
                              {isInviting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                  Sending...
                                </>
                              ) : (
                                'Send Invitation'
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Existing Grants */}
                  {isLoadingGrants ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading access grants...</p>
                    </div>
                  ) : courtGrants.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Current Access Grants</h4>
                      {courtGrants.map((grant) => (
                        <div
                          key={grant.id}
                          className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {getRoleLabel(grant.role)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {grant.is_active
                                  ? `${grant.days_remaining} days remaining`
                                  : grant.status.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getGrantStatusVariant(grant.status)}>
                              {grant.status.replace(/_/g, ' ')}
                            </Badge>
                            {grant.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeGrant(grant.id)}
                                className="text-cg-error hover:text-cg-error hover:bg-cg-error/10"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No court professionals have been granted access yet.</p>
                      <p className="text-xs mt-1">
                        Invite a GAL, attorney, or mediator to give them secure read-only access.
                      </p>
                    </div>
                  )}

                  {/* Info about court portal */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Court professionals can access the case through the{' '}
                      <Link href="/court-portal" className="text-indigo-600 hover:underline">
                        Court Portal
                      </Link>
                      . All access is time-limited, logged, and audited.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Children Section */}
            {caseData.children && caseData.children.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-cg-primary" />
                    <CardTitle>Children</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {caseData.children.map((child) => {
                      const age = Math.floor((new Date().getTime() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                      const initials = `${child.first_name.charAt(0)}${child.last_name.charAt(0)}`.toUpperCase();
                      return (
                        <div key={child.id} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
                          <div className="h-12 w-12 rounded-full bg-cg-primary-subtle flex items-center justify-center">
                            <span className="text-base font-semibold text-cg-primary">{initials}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {child.first_name} {child.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{age} years old</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Case Information */}
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Case ID</dt>
                    <dd className="mt-1 text-sm text-foreground font-mono">{caseData.id}</dd>
                  </div>

                  {caseData.case_number && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Court Case Number</dt>
                      <dd className="mt-1 text-sm text-foreground">{caseData.case_number}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Jurisdiction</dt>
                    <dd className="mt-1 text-sm text-foreground">{caseData.state}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                    <dd className="mt-1">
                      <Badge variant={getStatusVariant(caseData.status)}>
                        {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
                      </Badge>
                    </dd>
                  </div>
                </dl>

                {caseData.invitation_token && caseData.status === 'pending' && (
                  <div className="mt-6 p-4 bg-cg-primary-subtle border border-cg-primary/20 rounded-lg">
                    <p className="text-sm font-medium text-foreground mb-2">Invitation Token:</p>
                    <code className="block p-2 bg-card border border-border rounded text-sm font-mono text-foreground break-all">
                      {caseData.invitation_token}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this token with the other parent to allow them to join the case
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Builder Choice Modal */}
        {showBuilderChoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle>Choose How to Build Your Agreement</CardTitle>
                <CardDescription>
                  Pick the method that works best for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ARIA Option */}
                <button
                  onClick={() => createAgreementWithBuilder(true)}
                  disabled={isCreatingAgreement}
                  className="w-full p-6 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                        Talk to ARIA
                        <Badge variant="default" size="sm">Recommended</Badge>
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        Have a natural conversation about your custody arrangement. ARIA understands casual language and will guide you through everything.
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-purple-700 mb-1">Best for:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>People who prefer talking over forms</li>
                          <li>Complex or unique arrangements</li>
                          <li>Those who want conversational guidance</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Wizard Option */}
                <button
                  onClick={() => createAgreementWithBuilder(false)}
                  disabled={isCreatingAgreement}
                  className="w-full p-6 border-2 border-cg-primary/20 rounded-lg hover:border-cg-primary/50 hover:bg-cg-primary-subtle transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-cg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <ClipboardList className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Step-by-Step Wizard
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        Fill out structured forms with clear sections. Good for straightforward arrangements.
                      </p>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-cg-primary mb-1">Best for:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>People who prefer forms and structure</li>
                          <li>Standard custody arrangements</li>
                          <li>Those who like to see progress step-by-step</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Cancel */}
                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowBuilderChoice(false)}
                    disabled={isCreatingAgreement}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default function CaseDetailsPage() {
  return (
    <ProtectedRoute>
      <CaseDetailsContent />
    </ProtectedRoute>
  );
}

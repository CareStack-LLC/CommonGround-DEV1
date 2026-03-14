'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { quickAccordsAPI, familyFilesAPI, QuickAccord, FamilyFileDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import {
  ArrowLeft,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Car,
  FileText,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XOctagon,
} from 'lucide-react';

function QuickAccordDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const familyFileId = params.id as string;
  const accordId = params.accordId as string;

  const [quickAccord, setQuickAccord] = useState<QuickAccord | null>(null);
  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [accordId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [accordData, fileData] = await Promise.all([
        quickAccordsAPI.get(accordId),
        familyFilesAPI.get(familyFileId),
      ]);
      setQuickAccord(accordData);
      setFamilyFile(fileData);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login');
        return;
      }
      setError(err.message || 'Failed to load QuickAccord');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (err: any) => {
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    try {
      setIsActioning(true);
      const result = await quickAccordsAPI.submit(accordId);
      setQuickAccord(result);
      setActionMessage(result.message);
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to submit');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    try {
      setIsActioning(true);
      const result = await quickAccordsAPI.approve(accordId, approved);
      setQuickAccord(result);
      setActionMessage(result.message);
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to approve');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsActioning(true);
      const result = await quickAccordsAPI.complete(accordId);
      setQuickAccord(result);
      setActionMessage(result.message || 'QuickAccord marked as completed as agreed');
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to complete');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setIsActioning(true);
      const result = await quickAccordsAPI.revoke(accordId);
      setQuickAccord(result);
      setActionMessage(result.message || 'QuickAccord marked as not completed as agreed');
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to mark as not completed');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-cg-sage-subtle text-cg-sage border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge className="bg-cg-amber-subtle text-cg-amber border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-cg-sage-subtle text-cg-sage border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-cg-slate-subtle text-cg-slate border-0">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case 'revoked':
        return (
          <Badge className="bg-cg-error-subtle text-cg-error border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Not Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      travel: 'Travel',
      schedule_swap: 'Schedule Swap',
      special_event: 'Special Event',
      overnight: 'Overnight',
      expense: 'Expense',
      other: 'Other',
    };
    return labels[category] || category;
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cg-sage"></div>
      </div>
    );
  }

  if (error || !quickAccord || !familyFile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'QuickAccord not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isParentA = familyFile.parent_a_id === user?.id;
  const isInitiator = quickAccord.initiated_by === user?.id;
  const hasApproved = isParentA ? quickAccord.parent_a_approved : quickAccord.parent_b_approved;
  const awaitingMyApproval = quickAccord.status === 'pending_approval' && !hasApproved;

  // Get parent labels
  const getParentALabel = () => {
    if (familyFile.parent_a_role === 'mother') return 'Mother';
    if (familyFile.parent_a_role === 'father') return 'Father';
    return 'Parent A';
  };

  const getParentBLabel = () => {
    if (familyFile.parent_b_role === 'mother') return 'Mother';
    if (familyFile.parent_b_role === 'father') return 'Father';
    return 'Parent B';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="flex-shrink-0 -ml-2" onClick={() => router.push(`/family-files/${familyFileId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">{getCategoryIcon(quickAccord.purpose_category)}</span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{quickAccord.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {quickAccord.accord_number} - {getCategoryLabel(quickAccord.purpose_category)}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-10 sm:ml-0">
          {getStatusBadge(quickAccord.status)}
        </div>
      </div>

      {actionMessage && (
        <Alert className="bg-cg-sage-subtle border-cg-sage/20">
          <CheckCircle className="h-4 w-4 text-cg-sage" />
          <AlertDescription className="text-cg-sage">{actionMessage}</AlertDescription>
        </Alert>
      )}

      {/* Action Cards */}
      {quickAccord.status === 'draft' && isInitiator && (
        <Card className="border-cg-sage/20 bg-cg-sage-subtle/30">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">Ready to submit?</p>
                <p className="text-sm text-muted-foreground">
                  Send this QuickAccord to your co-parent for approval
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={isActioning} className="bg-cg-sage hover:bg-cg-sage/90 w-full sm:w-auto">
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {awaitingMyApproval && (
        <Card className="border-cg-amber/20 bg-cg-amber-subtle/30">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-medium text-foreground">Your approval is needed</p>
                <p className="text-sm text-muted-foreground">
                  Review this QuickAccord and approve or request changes
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleApprove(false)}
                  disabled={isActioning}
                  className="flex-1 sm:flex-none"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  onClick={() => handleApprove(true)}
                  disabled={isActioning}
                  className="flex-1 sm:flex-none bg-cg-sage hover:bg-cg-sage/90"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {quickAccord.status === 'active' && (
        <Card className="border-cg-sage/20 bg-cg-sage-subtle/30">
          <CardContent className="py-4">
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-medium text-foreground">QuickAccord is Active</p>
                <p className="text-sm text-muted-foreground">
                  After the agreed event/date, mark if this was completed as agreed
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleComplete}
                  disabled={isActioning}
                  className="flex-1 sm:flex-none bg-cg-sage hover:bg-cg-sage/90"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed as Agreed
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={isActioning}
                  className="flex-1 sm:flex-none border-cg-error/30 text-cg-error hover:bg-cg-error-subtle"
                >
                  <XOctagon className="h-4 w-4 mr-2" />
                  Not Completed as Agreed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed/Revoked Status Display */}
      {quickAccord.status === 'completed' && (
        <Card className="border-cg-sage/20 bg-cg-sage-subtle/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cg-sage-subtle flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-cg-sage" />
              </div>
              <div>
                <p className="font-medium text-foreground">Completed as Agreed</p>
                <p className="text-sm text-muted-foreground">
                  This QuickAccord was successfully completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {quickAccord.status === 'revoked' && (
        <Card className="border-cg-error/20 bg-cg-error-subtle/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cg-error-subtle flex items-center justify-center flex-shrink-0">
                <XOctagon className="h-5 w-5 text-cg-error" />
              </div>
              <div>
                <p className="font-medium text-foreground">Not Completed as Agreed</p>
                <p className="text-sm text-muted-foreground">
                  This QuickAccord was not fulfilled as agreed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickAccord.purpose_description && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <p className="text-sm">{quickAccord.purpose_description}</p>
              </div>
            )}

            {quickAccord.event_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="text-sm">{new Date(quickAccord.event_date).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {(quickAccord.start_date || quickAccord.end_date) && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Date Range</div>
                  <div className="text-sm">
                    {quickAccord.start_date && new Date(quickAccord.start_date).toLocaleDateString()}
                    {' - '}
                    {quickAccord.end_date && new Date(quickAccord.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {quickAccord.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Location</div>
                  <div className="text-sm">{quickAccord.location}</div>
                </div>
              </div>
            )}

            {quickAccord.child_ids.length > 0 && familyFile.children.length > 0 && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Children</div>
                  <div className="text-sm">
                    {familyFile.children
                      .filter((c) => quickAccord.child_ids.includes(c.id))
                      .map((c) => c.first_name)
                      .join(', ')}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickAccord.pickup_responsibility && (
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Pickup</div>
                  <div className="text-sm capitalize">{quickAccord.pickup_responsibility}</div>
                </div>
              </div>
            )}

            {quickAccord.dropoff_responsibility && (
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 text-cg-sage flex-shrink-0 rotate-180" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Drop-off</div>
                  <div className="text-sm capitalize">{quickAccord.dropoff_responsibility}</div>
                </div>
              </div>
            )}

            {quickAccord.transportation_notes && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Transportation Notes</div>
                <p className="text-sm">{quickAccord.transportation_notes}</p>
              </div>
            )}

            {quickAccord.has_shared_expense && (
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-cg-sage flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">Shared Expense</div>
                  <div className="text-sm">
                    ${quickAccord.estimated_amount || 'TBD'}
                    {quickAccord.expense_category && ` (${quickAccord.expense_category})`}
                  </div>
                </div>
              </div>
            )}

            {!quickAccord.pickup_responsibility && !quickAccord.dropoff_responsibility &&
             !quickAccord.transportation_notes && !quickAccord.has_shared_expense && (
              <p className="text-sm text-muted-foreground">No logistics specified</p>
            )}
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                quickAccord.parent_a_approved ? 'bg-cg-sage-subtle' : 'bg-muted'
              }`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  quickAccord.parent_a_approved ? 'bg-cg-sage/20' : 'bg-background'
                }`}>
                  {quickAccord.parent_a_approved ? (
                    <CheckCircle className="h-5 w-5 text-cg-sage" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">
                    {getParentALabel()}
                    {isParentA && <span className="text-muted-foreground font-normal"> (You)</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quickAccord.parent_a_approved
                      ? `Approved ${quickAccord.parent_a_approved_at ? new Date(quickAccord.parent_a_approved_at).toLocaleDateString() : ''}`
                      : 'Pending approval'}
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                quickAccord.parent_b_approved ? 'bg-cg-sage-subtle' : 'bg-muted'
              }`}>
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  quickAccord.parent_b_approved ? 'bg-cg-sage/20' : 'bg-background'
                }`}>
                  {quickAccord.parent_b_approved ? (
                    <CheckCircle className="h-5 w-5 text-cg-sage" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">
                    {getParentBLabel()}
                    {!isParentA && <span className="text-muted-foreground font-normal"> (You)</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quickAccord.parent_b_approved
                      ? `Approved ${quickAccord.parent_b_approved_at ? new Date(quickAccord.parent_b_approved_at).toLocaleDateString() : ''}`
                      : 'Pending approval'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Summary */}
        {quickAccord.ai_summary && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                <Zap className="h-5 w-5 text-cg-amber" />
                ARIA Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{quickAccord.ai_summary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function QuickAccordDetailPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Navigation />
        <PageContainer background="transparent" className="pb-32">
          <QuickAccordDetailContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

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
  RotateCcw,
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
      setActionMessage(result.message);
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
      setActionMessage(result.message);
    } catch (err: any) {
      if (!handleAuthError(err)) {
        setError(err.message || 'Failed to revoke');
      }
    } finally {
      setIsActioning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'draft':
        return (
          <Badge className="bg-gray-100 text-gray-700">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
      case 'revoked':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Revoked
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/family-files/${familyFileId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getCategoryIcon(quickAccord.purpose_category)}</span>
              <h1 className="text-2xl font-bold text-foreground">{quickAccord.title}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {quickAccord.accord_number} - {getCategoryLabel(quickAccord.purpose_category)}
            </p>
          </div>
        </div>
        {getStatusBadge(quickAccord.status)}
      </div>

      {actionMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      {quickAccord.status === 'draft' && isInitiator && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to submit?</p>
                <p className="text-sm text-muted-foreground">
                  Send this QuickAccord to your co-parent for approval
                </p>
              </div>
              <Button onClick={handleSubmit} disabled={isActioning}>
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {awaitingMyApproval && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-yellow-800">Your approval is needed</p>
                <p className="text-sm text-yellow-700">
                  Review this QuickAccord and approve or request changes
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleApprove(false)}
                  disabled={isActioning}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  onClick={() => handleApprove(true)}
                  disabled={isActioning}
                  className="bg-green-600 hover:bg-green-700"
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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-800">This QuickAccord is active</p>
                <p className="text-sm text-green-700">
                  Both parents have approved this agreement
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleComplete}
                  disabled={isActioning}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={isActioning}
                  className="text-red-600 hover:bg-red-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickAccord.purpose_description && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <p>{quickAccord.purpose_description}</p>
              </div>
            )}

            {quickAccord.event_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div>{new Date(quickAccord.event_date).toLocaleDateString()}</div>
                </div>
              </div>
            )}

            {(quickAccord.start_date || quickAccord.end_date) && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Date Range</div>
                  <div>
                    {quickAccord.start_date && new Date(quickAccord.start_date).toLocaleDateString()}
                    {' - '}
                    {quickAccord.end_date && new Date(quickAccord.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {quickAccord.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Location</div>
                  <div>{quickAccord.location}</div>
                </div>
              </div>
            )}

            {quickAccord.child_ids.length > 0 && familyFile.children.length > 0 && (
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Children</div>
                  <div>
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
          <CardHeader>
            <CardTitle className="text-lg">Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickAccord.pickup_responsibility && (
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Pickup</div>
                  <div className="capitalize">{quickAccord.pickup_responsibility}</div>
                </div>
              </div>
            )}

            {quickAccord.dropoff_responsibility && (
              <div className="flex items-center gap-3">
                <Car className="h-4 w-4 text-muted-foreground rotate-180" />
                <div>
                  <div className="text-sm text-muted-foreground">Drop-off</div>
                  <div className="capitalize">{quickAccord.dropoff_responsibility}</div>
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
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Shared Expense</div>
                  <div>
                    ${quickAccord.estimated_amount || 'TBD'}
                    {quickAccord.expense_category && ` (${quickAccord.expense_category})`}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  quickAccord.parent_a_approved ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {quickAccord.parent_a_approved ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {familyFile.parent_a_role === 'mother' ? 'Mother' :
                     familyFile.parent_a_role === 'father' ? 'Father' : 'Parent A'}
                    {isParentA && ' (You)'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quickAccord.parent_a_approved
                      ? `Approved ${quickAccord.parent_a_approved_at ? new Date(quickAccord.parent_a_approved_at).toLocaleDateString() : ''}`
                      : 'Pending'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  quickAccord.parent_b_approved ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {quickAccord.parent_b_approved ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {familyFile.parent_b_role === 'mother' ? 'Mother' :
                     familyFile.parent_b_role === 'father' ? 'Father' : 'Parent B'}
                    {!isParentA && ' (You)'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quickAccord.parent_b_approved
                      ? `Approved ${quickAccord.parent_b_approved_at ? new Date(quickAccord.parent_b_approved_at).toLocaleDateString() : ''}`
                      : 'Pending'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Summary */}
        {quickAccord.ai_summary && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                ARIA Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{quickAccord.ai_summary}</p>
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <PageContainer className="pb-32">
          <QuickAccordDetailContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

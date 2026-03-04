'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  casesAPI,
  courtFormsAPI,
  Case,
  CourtFormSubmission,
  CaseFormProgress,
  CourtFormType,
  CourtFormStatus,
} from '@/lib/api';
import {
  FileText,
  Plus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  FileCheck,
  Scale,
  Send,
  Eye,
  Edit,
  ChevronRight,
} from 'lucide-react';

const FORM_LABELS: Record<CourtFormType, { name: string; description: string; icon: typeof FileText }> = {
  'FL-300': {
    name: 'Request for Order',
    description: 'Initial request to the court for custody/visitation orders',
    icon: FileText,
  },
  'FL-311': {
    name: 'Child Custody Application',
    description: 'Detailed custody and visitation schedule proposal',
    icon: FileCheck,
  },
  'FL-320': {
    name: 'Responsive Declaration',
    description: 'Response to the other parent\'s request for order',
    icon: FileText,
  },
  'FL-340': {
    name: 'Findings and Order',
    description: 'Official court order after hearing',
    icon: Scale,
  },
  'FL-341': {
    name: 'Custody Order Attachment',
    description: 'Custody/visitation details attached to FL-340',
    icon: FileCheck,
  },
  'FL-342': {
    name: 'Child Support Attachment',
    description: 'Child support order attached to FL-340',
    icon: FileCheck,
  },
};

const STATUS_CONFIG: Record<
  CourtFormStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'secondary'; icon: typeof Clock }
> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit },
  pending_submission: { label: 'Ready to Submit', variant: 'warning', icon: Send },
  submitted: { label: 'Submitted', variant: 'default', icon: Clock },
  under_court_review: { label: 'Under Review', variant: 'warning', icon: Eye },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'error', icon: AlertCircle },
  resubmit_required: { label: 'Resubmission Required', variant: 'error', icon: AlertCircle },
  served: { label: 'Served', variant: 'success', icon: CheckCircle },
  entered: { label: 'Entered', variant: 'success', icon: Scale },
  withdrawn: { label: 'Withdrawn', variant: 'secondary', icon: AlertCircle },
};

function CourtFormsPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [forms, setForms] = useState<CourtFormSubmission[]>([]);
  const [progress, setProgress] = useState<CaseFormProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [caseResult, formsResult, progressResult] = await Promise.all([
        casesAPI.get(caseId),
        courtFormsAPI.listCaseForms(caseId),
        courtFormsAPI.getCaseProgress(caseId).catch(() => null),
      ]);

      setCaseData(caseResult);
      setForms(formsResult.forms);
      setProgress(progressResult);
    } catch (err: any) {
      console.error('Failed to load court forms:', err);
      setError(err.message || 'Failed to load court forms');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: CourtFormStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Card className="max-w-lg mx-auto bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-700">{error || 'Case not found'}</p>
            <Button variant="outline" onClick={() => router.push('/cases')} className="mt-4">
              Back to Cases
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/cases" className="hover:text-blue-600">
              Cases
            </Link>
            <span>/</span>
            <Link href={`/cases/${caseId}`} className="hover:text-blue-600">
              {caseData.case_name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Court Forms</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Court Form Workflow</h1>
              <p className="text-gray-500">
                California family court forms for {caseData.case_name}
              </p>
            </div>
            <Button onClick={() => router.push(`/cases/${caseId}/court-forms/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Overview */}
        {progress && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Scale className="h-5 w-5" />
                Case Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-600">
                    {progress.total_forms}
                  </p>
                  <p className="text-sm text-gray-600">Total Forms</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {progress.approved_forms}
                  </p>
                  <p className="text-sm text-gray-600">Approved</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {progress.pending_forms}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {progress.activation_status?.replace(/_/g, ' ') || 'Pending'}
                  </p>
                  <p className="text-sm text-gray-600">Status</p>
                </div>
              </div>

              {/* Next Steps */}
              {progress.next_action && (
                <Alert className="mt-4 bg-white/70">
                  <AlertCircle className="h-4 w-4 text-indigo-600" />
                  <AlertDescription className="text-indigo-800">
                    <strong>Next Step:</strong> {progress.next_action}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 mb-2">
              California Family Court Forms
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              This workflow guides you through the California family court process.
              Forms are submitted electronically and tracked throughout the hearing
              process.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-1">Petitioner Forms:</p>
                <ul className="space-y-1 ml-4">
                  <li>&#x2022; FL-300 - Request for Order</li>
                  <li>&#x2022; FL-311 - Custody Application</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Respondent Forms:</p>
                <ul className="space-y-1 ml-4">
                  <li>&#x2022; FL-320 - Responsive Declaration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Court Forms</CardTitle>
            <CardDescription>
              {forms.length > 0
                ? `${forms.length} form${forms.length > 1 ? 's' : ''} in this case`
                : 'No forms have been started yet'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">
                  No court forms have been started for this case.
                </p>
                <Button onClick={() => router.push(`/cases/${caseId}/court-forms/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Your First Form
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => {
                  const formInfo = FORM_LABELS[form.form_type];
                  const Icon = formInfo?.icon || FileText;
                  return (
                    <div
                      key={form.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/cases/${caseId}/court-forms/${form.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {form.form_type}
                            </p>
                            {getStatusBadge(form.status)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {formInfo?.name || form.form_type}
                          </p>
                          <p className="text-xs text-gray-400">
                            {form.submitted_at
                              ? `Submitted ${formatDate(form.submitted_at)}`
                              : `Created ${formatDate(form.created_at)}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="pt-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Case
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CourtFormsPage() {
  return (
    <ProtectedRoute>
      <CourtFormsPageContent />
    </ProtectedRoute>
  );
}

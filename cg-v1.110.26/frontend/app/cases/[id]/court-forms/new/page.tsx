'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { casesAPI, courtFormsAPI, Case, CaseFormProgress } from '@/lib/api';
import {
  FileText,
  ArrowLeft,
  AlertCircle,
  FileCheck,
  Scale,
  Sparkles,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';

interface FormOption {
  type: 'FL-300' | 'FL-311' | 'FL-320';
  name: string;
  description: string;
  role: 'petitioner' | 'respondent';
  icon: typeof FileText;
  requiresFL300?: boolean;
  subtitle?: string;
}

const FORM_OPTIONS: FormOption[] = [
  {
    type: 'FL-300',
    name: 'Request for Order (FL-300)',
    description: 'File a request to the court for custody, visitation, or other family law orders.',
    role: 'petitioner',
    icon: FileText,
    subtitle: 'For the parent initiating the court request',
  },
  {
    type: 'FL-311',
    name: 'Child Custody Application (FL-311)',
    description: 'Detailed application outlining your proposed custody and visitation schedule.',
    role: 'petitioner',
    icon: FileCheck,
    requiresFL300: true,
    subtitle: 'Attach to your FL-300 request',
  },
  {
    type: 'FL-320',
    name: 'Responsive Declaration (FL-320)',
    description: 'Respond to the other parent\'s FL-300 request. You can agree, disagree, or propose alternatives.',
    role: 'respondent',
    icon: FileText,
    requiresFL300: true,
    subtitle: 'For the parent responding to a court request',
  },
];

function NewCourtFormPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [progress, setProgress] = useState<CaseFormProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilderChoice, setShowBuilderChoice] = useState<'FL-300' | 'FL-311' | 'FL-320' | null>(null);

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [caseResult, progressResult] = await Promise.all([
        casesAPI.get(caseId),
        courtFormsAPI.getCaseProgress(caseId).catch(() => null),
      ]);

      setCaseData(caseResult);
      setProgress(progressResult);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load case');
    } finally {
      setIsLoading(false);
    }
  };

  const canStartForm = (formType: FormOption['type']): { allowed: boolean; reason?: string } => {
    // Check if FL-300 exists for forms that require it
    if (formType === 'FL-311' && !progress?.has_fl300) {
      return { allowed: false, reason: 'You must file an FL-300 before adding FL-311' };
    }
    if (formType === 'FL-320' && !progress?.has_fl300_approved) {
      return { allowed: false, reason: 'FL-320 is filed in response to an approved FL-300' };
    }
    return { allowed: true };
  };

  const handleSelectForm = (formType: FormOption['type']) => {
    const check = canStartForm(formType);
    if (!check.allowed) {
      setError(check.reason || 'Cannot start this form');
      return;
    }
    setShowBuilderChoice(formType);
  };

  const createForm = async (formType: 'FL-300' | 'FL-311' | 'FL-320', useAria: boolean) => {
    try {
      setIsCreating(true);
      setError(null);
      setShowBuilderChoice(null);

      let submission;
      if (formType === 'FL-300') {
        submission = await courtFormsAPI.startFL300(caseId, {
          aria_assisted: useAria,
        });
      } else if (formType === 'FL-311') {
        submission = await courtFormsAPI.startFL311(caseId, {
          aria_assisted: useAria,
        });
      } else {
        // FL-320 needs to link to the FL-300 it's responding to
        if (!progress?.fl300_id) {
          throw new Error('No FL-300 found to respond to');
        }
        submission = await courtFormsAPI.startFL320(caseId, {
          responds_to_form_id: progress.fl300_id,
          aria_assisted: useAria,
        });
      }

      // Navigate to the form editor
      router.push(`/cases/${caseId}/court-forms/${submission.id}`);
    } catch (err: any) {
      console.error('Failed to create form:', err);
      setError(err.message || 'Failed to create form');
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !caseData) {
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
              {caseData?.case_name}
            </Link>
            <span>/</span>
            <Link href={`/cases/${caseId}/court-forms`} className="hover:text-blue-600">
              Court Forms
            </Link>
            <span>/</span>
            <span className="text-gray-900">New Form</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Start a Court Form</h1>
          <p className="text-gray-500">
            Select the form you need to file
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Options */}
        <div className="space-y-4">
          {FORM_OPTIONS.map((option) => {
            const check = canStartForm(option.type);
            const Icon = option.icon;
            const isDisabled = !check.allowed;

            return (
              <Card
                key={option.type}
                className={`transition-all ${
                  isDisabled
                    ? 'opacity-50 bg-gray-50'
                    : 'hover:border-indigo-300 hover:shadow-md cursor-pointer'
                }`}
                onClick={() => !isDisabled && handleSelectForm(option.type)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-14 w-14 rounded-xl flex items-center justify-center ${
                        option.role === 'petitioner'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {option.name}
                          </h3>
                          <p className="text-sm text-gray-500">{option.subtitle}</p>
                        </div>
                        {!isDisabled && (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <p className="mt-2 text-gray-600">{option.description}</p>
                      {isDisabled && check.reason && (
                        <p className="mt-2 text-sm text-amber-600">
                          {check.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info about court orders (FL-340, FL-341, FL-342) */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Scale className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-700 mb-1">
                  About Court Orders (FL-340, FL-341, FL-342)
                </h3>
                <p className="text-sm text-gray-600">
                  These forms are completed by the court after your hearing. They contain
                  the judge's official orders and will be added to your case automatically
                  when entered by court staff.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="pt-4">
          <Link href={`/cases/${caseId}/court-forms`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Court Forms
            </Button>
          </Link>
        </div>
      </div>

      {/* Builder Choice Modal */}
      {showBuilderChoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Choose How to Fill Out Your {showBuilderChoice}</CardTitle>
              <CardDescription>
                Pick the method that works best for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ARIA Option */}
              <button
                onClick={() => createForm(showBuilderChoice, true)}
                disabled={isCreating}
                className="w-full p-6 border-2 border-purple-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      Talk to ARIA
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Recommended
                      </span>
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Have a natural conversation about your situation. ARIA will guide
                      you through the legal requirements in plain language.
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li>&#x2022; Explains legal terms as you go</li>
                      <li>&#x2022; Helps you understand your options</li>
                      <li>&#x2022; Ensures all required fields are completed</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Manual Form Option */}
              <button
                onClick={() => createForm(showBuilderChoice, false)}
                disabled={isCreating}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Fill Out Form Manually
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Complete the form fields directly if you're already familiar with
                      the California family court process.
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li>&#x2022; Direct control over all fields</li>
                      <li>&#x2022; Good if you have legal guidance</li>
                      <li>&#x2022; Faster if you know what to enter</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Cancel */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowBuilderChoice(null)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Creating Overlay */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <Card className="p-8">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              <p className="text-lg text-gray-700">Creating your form...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function NewCourtFormPage() {
  return (
    <ProtectedRoute>
      <NewCourtFormPageContent />
    </ProtectedRoute>
  );
}

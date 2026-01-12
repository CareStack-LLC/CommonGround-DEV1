'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, FamilyFileDetail } from '@/lib/api';
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
} from '@/components/cg';
import {
  ChevronLeft,
  Gavel,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Sparkles,
  Download,
  Send,
  Scale,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* =============================================================================
   Court Filing Page - FL-300/FL-311 Process
   Guide parents through submitting their family file to court
   ============================================================================= */

interface CourtFilingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  forms?: string[];
}

function CourtFilingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [familyFile, setFamilyFile] = useState<FamilyFileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps: CourtFilingStep[] = [
    {
      id: 'review',
      title: 'Review Your Family File',
      description: 'Ensure all information is accurate and complete before filing',
      status: 'in_progress',
    },
    {
      id: 'forms',
      title: 'Download Court Forms',
      description: 'Get the required FL-300 and FL-311 forms for your jurisdiction',
      status: 'pending',
      forms: ['FL-300 (Request for Order)', 'FL-311 (Child Custody and Visitation)'],
    },
    {
      id: 'fill',
      title: 'Complete the Forms',
      description: 'Use your CommonGround data to fill out the court forms',
      status: 'pending',
    },
    {
      id: 'submit',
      title: 'File with the Court',
      description: 'Submit your completed forms to the family court',
      status: 'pending',
    },
  ];

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fileData = await familyFilesAPI.get(id);
      setFamilyFile(fileData);

      // Pre-fill court info if available
      if (fileData.state) {
        // Could auto-suggest court based on county
      }
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

  const handleCreateCourtCase = async () => {
    if (!caseNumber.trim()) {
      setError('Please enter a case number');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create the court custody case link
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/family-files/${id}/court-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          case_number: caseNumber,
          case_type: 'custody',
          jurisdiction_state: familyFile?.state || 'CA',
          jurisdiction_county: familyFile?.county,
          court_name: courtName || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to link court case');
      }

      // Success - redirect back to family file
      router.push(`/family-files/${id}`);
    } catch (err: any) {
      console.error('Failed to create court case:', err);
      setError(err.message || 'Failed to link court case');
    } finally {
      setIsSubmitting(false);
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
        <p className="mt-4 text-muted-foreground font-medium">Loading...</p>
      </div>
    );
  }

  if (error && !familyFile) {
    return (
      <div className="space-y-4">
        <CGButton variant="ghost" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </CGButton>
        <CGCard variant="default" className="border-cg-error/30 bg-cg-error-subtle">
          <CGCardContent className="py-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-cg-error" />
              <p className="text-cg-error font-medium">{error}</p>
            </div>
          </CGCardContent>
        </CGCard>
      </div>
    );
  }

  // Already linked to court
  if (familyFile?.has_court_case) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <CGButton variant="ghost" size="sm" onClick={() => router.push(`/family-files/${id}`)}>
            <ChevronLeft className="h-5 w-5" />
          </CGButton>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Court Filing</h1>
            <p className="text-muted-foreground">{familyFile.title}</p>
          </div>
        </div>

        <CGCard variant="elevated">
          <CGCardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-cg-sage-subtle flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-cg-sage" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Already Linked to Court</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                This family file is already linked to a court case. You can view the court case details from the family file page.
              </p>
              <CGButton variant="primary" onClick={() => router.push(`/family-files/${id}`)}>
                Return to Family File
              </CGButton>
            </div>
          </CGCardContent>
        </CGCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <CGButton variant="ghost" size="sm" onClick={() => router.push(`/family-files/${id}`)}>
          <ChevronLeft className="h-5 w-5" />
        </CGButton>
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cg-slate-subtle flex items-center justify-center">
              <Gavel className="h-5 w-5 text-cg-slate" />
            </div>
            Court Filing
          </h1>
          <p className="text-muted-foreground mt-1">{familyFile?.title}</p>
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="border-cg-amber/30 bg-cg-amber-subtle/30">
        <Info className="h-4 w-4 text-cg-amber" />
        <AlertTitle className="text-foreground">California Family Court Forms</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          The FL-300 (Request for Order) and FL-311 (Child Custody and Visitation Application Attachment) are California judicial council forms. Requirements may vary by county.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Process Steps */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle>Filing Process</CGCardTitle>
              <CGCardDescription>
                Follow these steps to submit your family file to the court
              </CGCardDescription>
            </CGCardHeader>
            <CGCardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex gap-4 p-4 rounded-xl border ${
                      step.status === 'in_progress'
                        ? 'border-cg-sage/30 bg-cg-sage-subtle/30'
                        : 'border-border/50 bg-card'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-cg-sage text-white'
                        : step.status === 'in_progress'
                        ? 'bg-cg-sage-subtle text-cg-sage'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      {step.forms && (
                        <div className="mt-3 space-y-2">
                          {step.forms.map((form) => (
                            <a
                              key={form}
                              href="https://www.courts.ca.gov/forms.htm?filter=FL"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-cg-sage hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {form}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CGCardContent>
          </CGCard>

          {/* Link to Court */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-cg-slate" />
                Link to Existing Court Case
              </CGCardTitle>
              <CGCardDescription>
                If you already have a court case number, enter it here to link your family file
              </CGCardDescription>
            </CGCardHeader>
            <CGCardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">Case Number</Label>
                <Input
                  id="caseNumber"
                  placeholder="e.g., 23FL12345"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="focus-visible:ring-cg-sage"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your court case number exactly as it appears on your court documents
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtName">Court Name (Optional)</Label>
                <Input
                  id="courtName"
                  placeholder="e.g., Superior Court of California, County of Los Angeles"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  className="focus-visible:ring-cg-sage"
                />
              </div>

              <CGButton
                variant="primary"
                className="w-full"
                onClick={handleCreateCourtCase}
                disabled={isSubmitting || !caseNumber.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4 mr-2" />
                    Link Court Case
                  </>
                )}
              </CGButton>
            </CGCardContent>
          </CGCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <CGCard variant="elevated">
            <CGCardHeader>
              <CGCardTitle>Resources</CGCardTitle>
            </CGCardHeader>
            <CGCardContent className="space-y-3">
              <a
                href="https://www.courts.ca.gov/forms.htm?filter=FL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-border transition-all"
              >
                <FileText className="h-5 w-5 text-cg-sage" />
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm">CA Court Forms</div>
                  <div className="text-xs text-muted-foreground">courts.ca.gov</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href="https://www.courts.ca.gov/selfhelp-custody.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-border transition-all"
              >
                <Info className="h-5 w-5 text-cg-sage" />
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm">Custody Self-Help</div>
                  <div className="text-xs text-muted-foreground">Step-by-step guides</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </CGCardContent>
          </CGCard>

          {/* Your Data Summary */}
          <CGCard variant="default">
            <CGCardHeader>
              <CGCardTitle>Your Family File</CGCardTitle>
            </CGCardHeader>
            <CGCardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Number</span>
                <span className="text-foreground font-medium">{familyFile?.family_file_number}</span>
              </div>
              {familyFile?.state && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State</span>
                  <span className="text-foreground font-medium">{familyFile.state}</span>
                </div>
              )}
              {familyFile?.county && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">County</span>
                  <span className="text-foreground font-medium">{familyFile.county}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Children</span>
                <span className="text-foreground font-medium">{familyFile?.children?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Co-Parent</span>
                <CGBadge variant={familyFile?.is_complete ? 'sage' : 'amber'}>
                  {familyFile?.is_complete ? 'Joined' : 'Pending'}
                </CGBadge>
              </div>
            </CGCardContent>
          </CGCard>

          {/* Help */}
          <CGCard variant="default" className="border-cg-sage/20 bg-cg-sage-subtle/20">
            <CGCardContent className="py-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-cg-sage flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Need help?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Consider consulting with a family law attorney for guidance on court filings.
                  </p>
                </div>
              </div>
            </CGCardContent>
          </CGCard>
        </div>
      </div>
    </div>
  );
}

export default function CourtFilingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cg-background pb-20 lg:pb-0">
        <Navigation />
        <PageContainer>
          <CourtFilingContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

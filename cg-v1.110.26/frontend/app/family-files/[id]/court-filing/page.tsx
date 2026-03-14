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
        <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin" />
        <p className="mt-4 text-muted-foreground font-medium">Loading...</p>
      </div>
    );
  }

  if (error && !familyFile) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/family-files')}
          className="group flex items-center text-muted-foreground hover:text-[var(--portal-primary)] transition-all duration-300 font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-300" />
          Back to Family Files
        </button>
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Already linked to court
  if (familyFile?.has_court_case) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/family-files')}
          className="group flex items-center text-muted-foreground hover:text-[var(--portal-primary)] transition-all duration-300 font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-300" />
          Back to Family Files
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
            <Gavel className="h-6 w-6 text-[var(--portal-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Court Filing</h1>
            <p className="text-muted-foreground font-medium">{familyFile.title}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-8">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Already Linked to Court</h2>
            <p className="text-muted-foreground max-w-md mx-auto font-medium">
              This family file is already linked to a court case. You can view the court case details from the family file page.
            </p>
            <button
              onClick={() => router.push(`/family-files/${id}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              Return to Family File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/family-files')}
        className="group flex items-center text-muted-foreground hover:text-[var(--portal-primary)] transition-all duration-300 font-medium"
      >
        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-300" />
        Back to Family Files
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
          <Gavel className="h-6 w-6 text-[var(--portal-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            Court Filing
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">{familyFile?.title}</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>California Family Court Forms</p>
            <p className="text-sm text-amber-700 mt-1 font-medium">
              The FL-300 (Request for Order) and FL-311 (Child Custody and Visitation Application Attachment) are California judicial council forms. Requirements may vary by county.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Process Steps */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="p-6 border-b-2 border-slate-100">
              <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Filing Process</h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Follow these steps to submit your family file to the court
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                      step.status === 'in_progress'
                        ? 'border-[var(--portal-primary)]/30 bg-[var(--portal-primary)]/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      step.status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                        : step.status === 'in_progress'
                        ? 'bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 text-[var(--portal-primary)]'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 font-medium">{step.description}</p>
                      {step.forms && (
                        <div className="mt-3 space-y-2">
                          {step.forms.map((form) => (
                            <a
                              key={form}
                              href="https://www.courts.ca.gov/forms.htm?filter=FL"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-[var(--portal-primary)] hover:underline font-medium"
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
            </div>
          </div>

          {/* Link to Court */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="p-6 border-b-2 border-slate-100">
              <div className="flex items-center gap-3">
                <Scale className="h-5 w-5 text-[var(--portal-primary)]" />
                <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Link to Existing Court Case</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                If you already have a court case number, enter it here to link your family file
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="caseNumber" className="block text-sm font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Case Number</label>
                <input
                  id="caseNumber"
                  placeholder="e.g., 23FL12345"
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                />
                <p className="text-xs text-muted-foreground font-medium">
                  Enter your court case number exactly as it appears on your court documents
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="courtName" className="block text-sm font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Court Name (Optional)</label>
                <input
                  id="courtName"
                  placeholder="e.g., Superior Court of California, County of Los Angeles"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--portal-primary)]/20 focus:border-[var(--portal-primary)] transition-all duration-300"
                />
              </div>

              <button
                onClick={handleCreateCourtCase}
                disabled={isSubmitting || !caseNumber.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--portal-primary)] to-[#2D6A8F] text-white rounded-xl font-bold shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4" />
                    Link Court Case
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="p-4 border-b-2 border-slate-100">
              <h2 className="font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Resources</h2>
            </div>
            <div className="p-4 space-y-3">
              <a
                href="https://www.courts.ca.gov/forms.htm?filter=FL"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-5 w-5 text-[var(--portal-primary)]" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">CA Court Forms</div>
                  <div className="text-xs text-muted-foreground font-medium">courts.ca.gov</div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-[var(--portal-primary)] transition-colors" />
              </a>

              <a
                href="https://www.courts.ca.gov/selfhelp-custody.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Info className="h-5 w-5 text-[var(--portal-primary)]" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">Custody Self-Help</div>
                  <div className="text-xs text-muted-foreground font-medium">Step-by-step guides</div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-[var(--portal-primary)] transition-colors" />
              </a>
            </div>
          </div>

          {/* Your Data Summary */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="p-4 border-b-2 border-slate-100">
              <h2 className="font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Your Family File</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">File Number</span>
                <span className="text-foreground font-bold">{familyFile?.family_file_number}</span>
              </div>
              {familyFile?.state && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">State</span>
                  <span className="text-foreground font-bold">{familyFile.state}</span>
                </div>
              )}
              {familyFile?.county && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">County</span>
                  <span className="text-foreground font-bold">{familyFile.county}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Children</span>
                <span className="text-foreground font-bold">{familyFile?.children?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Co-Parent</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border-2 ${
                  familyFile?.is_complete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {familyFile?.is_complete ? 'Joined' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-[var(--portal-primary)]/5 rounded-2xl border-2 border-[var(--portal-primary)]/20 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-[var(--portal-primary)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Need help?</p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Consider consulting with a family law attorney for guidance on court filings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CourtFilingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 lg:pb-0">
        <Navigation />
        <PageContainer>
          <CourtFilingContent />
        </PageContainer>
      </div>
    </ProtectedRoute>
  );
}

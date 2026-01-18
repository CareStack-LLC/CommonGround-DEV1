'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { familyFilesAPI, exportsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Calendar,
  MessageSquare,
  DollarSign,
  Clock,
  Shield,
  Loader2,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Scale,
  FileCheck,
  Gavel,
  ClipboardList,
} from 'lucide-react';

/**
 * Parent Reports Settings Page
 *
 * Design: Two sections - Self-service reports and Professional investigation reports
 * Philosophy: "Give parents the documentation they need for their family's journey."
 */

interface FamilyFile {
  id: string;
  case_name: string;
}

// Self-service report types
const selfServiceReports = [
  {
    id: 'communication_summary',
    title: 'Communication Summary',
    description: 'Export of all messages exchanged, including ARIA intervention suggestions and response times.',
    icon: MessageSquare,
    sections: ['communication_compliance', 'intervention_log'],
  },
  {
    id: 'custody_time_report',
    title: 'Custody Time Report',
    description: 'Detailed breakdown of parenting time, exchange compliance, and custody statistics.',
    icon: Clock,
    sections: ['parenting_time', 'compliance_summary'],
  },
  {
    id: 'expense_summary',
    title: 'Expense Summary',
    description: 'Complete record of shared expenses, payment history, and financial compliance.',
    icon: DollarSign,
    sections: ['financial_compliance'],
  },
  {
    id: 'schedule_history',
    title: 'Schedule & Events History',
    description: 'Calendar events, custody exchanges, and schedule modifications.',
    icon: Calendar,
    sections: ['parenting_time', 'agreement_overview'],
  },
];

// Professional investigation reports
const professionalReports = [
  {
    id: 'court_investigation_package',
    title: 'Court Investigation Package',
    description: 'Comprehensive documentation package with all records, compliance metrics, and chain of custody verification. Court-ready format with SHA-256 integrity hashes.',
    price: 149,
    icon: Gavel,
    features: [
      'Complete message history with context',
      'Full custody exchange records with GPS',
      'Financial compliance documentation',
      'ARIA intervention analysis',
      'Notarized chain of custody certificate',
      'Expert summary and findings',
    ],
  },
  {
    id: 'communication_analysis',
    title: 'Communication Analysis Report',
    description: 'In-depth analysis of communication patterns, tone assessment, and ARIA intervention outcomes.',
    price: 79,
    icon: MessageSquare,
    features: [
      'Message sentiment analysis',
      'Response time patterns',
      'ARIA intervention breakdown',
      'Communication compliance score',
      'Recommendations summary',
    ],
  },
  {
    id: 'financial_compliance_report',
    title: 'Financial Compliance Report',
    description: 'Detailed expense tracking, payment history, and financial obligation compliance analysis.',
    price: 79,
    icon: DollarSign,
    features: [
      'Complete expense history',
      'Payment tracking with timestamps',
      'Outstanding balance analysis',
      'Compliance percentage calculations',
      'Supporting documentation',
    ],
  },
  {
    id: 'custody_compliance_report',
    title: 'Custody Compliance Report',
    description: 'Exchange-by-exchange analysis with GPS verification data and timeliness metrics.',
    price: 99,
    icon: ClipboardList,
    features: [
      'Exchange history with GPS coordinates',
      'Check-in/check-out timestamps',
      'Compliance scoring by parent',
      'Pattern analysis',
      'Visual timeline',
    ],
  },
];

export default function ReportsSettingsPage() {
  const { user } = useAuth();
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Professional report request state
  const [requestingReport, setRequestingReport] = useState<string | null>(null);
  const [requestFormData, setRequestFormData] = useState({
    description: '',
    urgency: 'standard',
    dateRangeStart: '',
    dateRangeEnd: '',
  });
  const [showRequestForm, setShowRequestForm] = useState<string | null>(null);

  // Load family files on mount
  useEffect(() => {
    const loadFamilyFiles = async () => {
      try {
        setIsLoading(true);
        const response = await familyFilesAPI.list();
        setFamilyFiles(response.items || []);
        if (response.items?.length > 0) {
          setSelectedFamilyFile(response.items[0].id);
        }
      } catch (err) {
        console.error('Failed to load family files:', err);
        setError('Failed to load your family files. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFamilyFiles();
  }, []);

  // Generate self-service report
  const handleGenerateReport = async (reportId: string, sections: string[]) => {
    if (!selectedFamilyFile) {
      setError('Please select a family file first.');
      return;
    }

    setGeneratingReport(reportId);
    setError(null);

    try {
      // Create export with selected sections
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const exportData = await exportsAPI.create({
        case_id: selectedFamilyFile,
        package_type: 'court',
        date_range_start: thirtyDaysAgo.toISOString().split('T')[0],
        date_range_end: new Date().toISOString().split('T')[0],
        sections_included: sections,
        redaction_level: 'standard',
      });

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await exportsAPI.get(exportData.id);
        if (status.status === 'completed') {
          // Download the PDF
          const blob = await exportsAPI.download(exportData.id);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `CommonGround-${reportId}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          setShowSuccess(reportId);
          setTimeout(() => setShowSuccess(null), 5000);
          break;
        } else if (status.status === 'failed') {
          throw new Error('Report generation failed');
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Report generation timed out');
      }
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(null);
    }
  };

  // Request professional report
  const handleRequestProfessionalReport = async (reportId: string, price: number) => {
    if (!selectedFamilyFile) {
      setError('Please select a family file first.');
      return;
    }

    setRequestingReport(reportId);
    setError(null);

    try {
      // Send request to backend (will email CommonGround and create Stripe checkout)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/reports/request-professional`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            family_file_id: selectedFamilyFile,
            report_type: reportId,
            description: requestFormData.description,
            urgency: requestFormData.urgency,
            date_range_start: requestFormData.dateRangeStart || undefined,
            date_range_end: requestFormData.dateRangeEnd || undefined,
            price_cents: price * 100,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit request');
      }

      const data = await response.json();

      // If there's a Stripe checkout URL, redirect
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setShowSuccess(reportId);
        setShowRequestForm(null);
        setRequestFormData({
          description: '',
          urgency: 'standard',
          dateRangeStart: '',
          dateRangeEnd: '',
        });
        setTimeout(() => setShowSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to request report:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setRequestingReport(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Reports & Documentation
        </h2>
        <p className="text-muted-foreground">
          Generate reports and request professional documentation for legal proceedings
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Family File Selector */}
      {familyFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              Select Family File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedFamilyFile}
              onChange={(e) => setSelectedFamilyFile(e.target.value)}
              className="flex h-10 w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {familyFiles.map((ff) => (
                <option key={ff.id} value={ff.id}>
                  {ff.case_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {familyFiles.length === 0 && (
        <Alert>
          <AlertDescription>
            You don't have any family files yet. Reports will be available once you create or join a family file.
          </AlertDescription>
        </Alert>
      )}

      {/* Self-Service Reports Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-cg-primary" />
          <h3 className="text-lg font-medium">Self-Service Reports</h3>
          <span className="text-xs bg-cg-success/10 text-cg-success px-2 py-0.5 rounded-full">
            Free
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Download PDF reports instantly. Data from the last 30 days.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {selfServiceReports.map((report) => {
            const Icon = report.icon;
            const isGenerating = generatingReport === report.id;
            const isSuccess = showSuccess === report.id;

            return (
              <Card key={report.id} className="relative">
                {isSuccess && (
                  <div className="absolute inset-0 bg-cg-success/10 rounded-lg flex items-center justify-center z-10">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-cg-success" />
                      <span className="font-medium text-cg-success">Downloaded!</span>
                    </div>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {report.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateReport(report.id, report.sections)}
                    disabled={isGenerating || !selectedFamilyFile}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-8" />

      {/* Professional Reports Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Scale className="h-5 w-5 text-cg-amber" />
          <h3 className="text-lg font-medium">Professional Investigation Reports</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Court-ready documentation prepared by our team. Includes expert analysis, chain of custody verification, and branded formatting.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Reports are typically delivered within 3-5 business days. Rush delivery available.
        </p>

        <div className="grid gap-4">
          {professionalReports.map((report) => {
            const Icon = report.icon;
            const isRequesting = requestingReport === report.id;
            const isSuccess = showSuccess === report.id;
            const showForm = showRequestForm === report.id;

            return (
              <Card key={report.id} className="relative">
                {isSuccess && (
                  <div className="absolute inset-0 bg-cg-success/10 rounded-lg flex items-center justify-center z-10">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-cg-success" />
                      <span className="font-medium text-cg-success">Request submitted!</span>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-cg-amber/10">
                        <Icon className="h-5 w-5 text-cg-amber" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{report.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-foreground">
                        ${report.price}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Includes:</p>
                    <ul className="grid gap-1 text-sm text-muted-foreground">
                      {report.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-cg-success flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Request Form */}
                  {showForm && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`description-${report.id}`}>
                          What do you need this report for?
                        </Label>
                        <Textarea
                          id={`description-${report.id}`}
                          placeholder="Describe your situation and what specific documentation you need..."
                          value={requestFormData.description}
                          onChange={(e) =>
                            setRequestFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`dateStart-${report.id}`}>
                            Date Range Start (optional)
                          </Label>
                          <Input
                            id={`dateStart-${report.id}`}
                            type="date"
                            value={requestFormData.dateRangeStart}
                            onChange={(e) =>
                              setRequestFormData((prev) => ({
                                ...prev,
                                dateRangeStart: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`dateEnd-${report.id}`}>
                            Date Range End (optional)
                          </Label>
                          <Input
                            id={`dateEnd-${report.id}`}
                            type="date"
                            value={requestFormData.dateRangeEnd}
                            onChange={(e) =>
                              setRequestFormData((prev) => ({
                                ...prev,
                                dateRangeEnd: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`urgency-${report.id}`}>Delivery Speed</Label>
                        <select
                          id={`urgency-${report.id}`}
                          value={requestFormData.urgency}
                          onChange={(e) =>
                            setRequestFormData((prev) => ({
                              ...prev,
                              urgency: e.target.value,
                            }))
                          }
                          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="standard">Standard (3-5 business days)</option>
                          <option value="rush">Rush (+$50, 1-2 business days)</option>
                          <option value="urgent">Urgent (+$100, 24 hours)</option>
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowRequestForm(null)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const extraCharge =
                              requestFormData.urgency === 'rush'
                                ? 50
                                : requestFormData.urgency === 'urgent'
                                  ? 100
                                  : 0;
                            handleRequestProfessionalReport(
                              report.id,
                              report.price + extraCharge
                            );
                          }}
                          disabled={isRequesting || !selectedFamilyFile}
                          className="flex-1 bg-cg-amber hover:bg-cg-amber/90"
                        >
                          {isRequesting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              Proceed to Payment
                              <ExternalLink className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                {!showForm && (
                  <CardFooter>
                    <Button
                      onClick={() => setShowRequestForm(report.id)}
                      disabled={!selectedFamilyFile}
                      className="w-full bg-cg-amber hover:bg-cg-amber/90"
                    >
                      Request Report
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            About Our Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Self-Service Reports</strong> are generated automatically from your CommonGround data.
            They're perfect for personal records, attorney meetings, or mediation sessions.
          </p>
          <p>
            <strong>Professional Investigation Reports</strong> are prepared by our documentation team.
            They include expert analysis, are formatted for court submission, and come with a
            chain of custody certificate verifying data integrity.
          </p>
          <p>
            All reports use SHA-256 cryptographic hashing to ensure document integrity.
            Professional reports can be independently verified using the export number at{' '}
            <a
              href="/verify"
              className="text-cg-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              commonground.app/verify
            </a>
          </p>
          <p className="text-xs">
            Questions? Contact us at{' '}
            <a
              href="mailto:reports@commonground.app"
              className="text-cg-primary hover:underline"
            >
              reports@commonground.app
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

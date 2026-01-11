'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  casesAPI,
  courtFormsAPI,
  Case,
  CourtFormSubmission,
  CourtFormType,
  CourtFormStatus,
} from '@/lib/api';
import {
  FileText,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Save,
  Edit,
  Scale,
  FileCheck,
  Eye,
  XCircle,
  Download,
  ExternalLink,
  Sparkles,
  Users,
  Calendar,
  Gavel,
  Home,
  BookOpen,
  Printer,
} from 'lucide-react';
import FL311Wizard from '@/components/court-forms/FL311Wizard';
import FL311Summary from '@/components/court-forms/FL311Summary';
import { generateFL311PDF } from '@/components/court-forms/FL311PDFGenerator';
import FL300Wizard from '@/components/court-forms/FL300Wizard';
import FL300Summary from '@/components/court-forms/FL300Summary';
import FL320Wizard from '@/components/court-forms/FL320Wizard';
import FL320Summary from '@/components/court-forms/FL320Summary';
import FL340Wizard from '@/components/court-forms/FL340Wizard';
import FL340Summary from '@/components/court-forms/FL340Summary';
import FL341Wizard from '@/components/court-forms/FL341Wizard';
import FL341Summary from '@/components/court-forms/FL341Summary';
import FL342Wizard from '@/components/court-forms/FL342Wizard';
import FL342Summary from '@/components/court-forms/FL342Summary';

// Form field definitions for each form type
const FL300_FIELDS = [
  { key: 'request_type', label: 'Type of Request', type: 'select', options: ['custody', 'visitation', 'support', 'other'] },
  { key: 'hearing_date_requested', label: 'Requested Hearing Date', type: 'date' },
  { key: 'facts_in_support', label: 'Facts in Support of Request', type: 'textarea', rows: 6 },
  { key: 'current_custody', label: 'Current Custody Arrangement', type: 'textarea', rows: 3 },
  { key: 'requested_orders', label: 'Orders Requested', type: 'textarea', rows: 4 },
  { key: 'emergency_reasons', label: 'Reasons for Emergency (if applicable)', type: 'textarea', rows: 3 },
];

const FL311_FIELDS = [
  { key: 'legal_custody_request', label: 'Legal Custody Request', type: 'select', options: ['sole_mother', 'sole_father', 'joint'] },
  { key: 'physical_custody_request', label: 'Physical Custody Request', type: 'select', options: ['sole_mother', 'sole_father', 'joint'] },
  { key: 'regular_schedule', label: 'Regular Parenting Schedule', type: 'textarea', rows: 6 },
  { key: 'holiday_schedule', label: 'Holiday Schedule', type: 'textarea', rows: 4 },
  { key: 'vacation_schedule', label: 'Vacation Schedule', type: 'textarea', rows: 3 },
  { key: 'transportation', label: 'Transportation Arrangements', type: 'textarea', rows: 3 },
  { key: 'special_provisions', label: 'Special Provisions', type: 'textarea', rows: 3 },
];

const FL320_FIELDS = [
  { key: 'response_type', label: 'Response Type', type: 'select', options: ['agree', 'partially_agree', 'disagree'] },
  { key: 'agrees_to_items', label: 'Items You Agree With', type: 'textarea', rows: 3 },
  { key: 'disagrees_with_items', label: 'Items You Disagree With', type: 'textarea', rows: 3 },
  { key: 'counter_proposal', label: 'Your Counter-Proposal', type: 'textarea', rows: 6 },
  { key: 'facts_in_support', label: 'Facts in Support', type: 'textarea', rows: 4 },
  { key: 'requested_orders', label: 'Orders You Request', type: 'textarea', rows: 4 },
];

const FORM_FIELDS: Record<CourtFormType, typeof FL300_FIELDS> = {
  'FL-300': FL300_FIELDS,
  'FL-311': FL311_FIELDS,
  'FL-320': FL320_FIELDS,
  'FL-340': [], // Court-entered
  'FL-341': [], // Court-entered
  'FL-342': [], // Court-entered
};

const FORM_LABELS: Record<CourtFormType, { name: string; description: string }> = {
  'FL-300': { name: 'Request for Order', description: 'Initial request to the court' },
  'FL-311': { name: 'Child Custody Application', description: 'Detailed custody proposal' },
  'FL-320': { name: 'Responsive Declaration', description: 'Response to FL-300' },
  'FL-340': { name: 'Findings and Order After Hearing', description: 'Court order' },
  'FL-341': { name: 'Custody Order Attachment', description: 'Custody details' },
  'FL-342': { name: 'Child Support Attachment', description: 'Support details' },
};

const STATUS_CONFIG: Record<
  CourtFormStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'secondary'; icon: typeof Clock; canEdit: boolean }
> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Edit, canEdit: true },
  pending_submission: { label: 'Ready to Submit', variant: 'warning', icon: Send, canEdit: true },
  submitted: { label: 'Submitted', variant: 'default', icon: Clock, canEdit: false },
  under_court_review: { label: 'Under Review', variant: 'warning', icon: Eye, canEdit: false },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle, canEdit: false },
  rejected: { label: 'Rejected', variant: 'error', icon: XCircle, canEdit: false },
  resubmit_required: { label: 'Resubmission Required', variant: 'error', icon: AlertCircle, canEdit: true },
  served: { label: 'Served', variant: 'success', icon: CheckCircle, canEdit: false },
  entered: { label: 'Entered', variant: 'success', icon: Scale, canEdit: false },
  withdrawn: { label: 'Withdrawn', variant: 'secondary', icon: XCircle, canEdit: false },
};

// Helper function to check if editing is allowed (either by status or by court permission)
function canEditForm(form: CourtFormSubmission): boolean {
  const statusConfig = STATUS_CONFIG[form.status];
  // Can edit if: status allows editing OR court has allowed edits
  return statusConfig.canEdit || form.edits_allowed === true;
}

// PDF Generation function - uses browser print functionality
function generateFormPDF(form: CourtFormSubmission, caseData: Case) {
  const formInfo = FORM_LABELS[form.form_type];
  const statusConfig = STATUS_CONFIG[form.status];

  // Format field label helper
  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Render value helper
  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return '<span class="text-gray">Not provided</span>';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="text-gray">None</span>';
      return '<ul>' + value.map((item) => `<li>${typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>`).join('') + '</ul>';
    }
    if (typeof value === 'object') {
      return '<div class="nested">' + Object.entries(value)
        .map(([k, v]) => `<div><strong>${formatLabel(k)}:</strong> ${renderValue(v)}</div>`)
        .join('') + '</div>';
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(value);
  };

  // Build form data HTML
  let formDataHtml = '';
  if (form.form_data && Object.keys(form.form_data).length > 0) {
    formDataHtml = Object.entries(form.form_data)
      .map(([key, value]) => `
        <div class="field">
          <div class="field-label">${formatLabel(key)}</div>
          <div class="field-value">${renderValue(value)}</div>
        </div>
      `).join('');
  }

  // Build the printable HTML
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${form.form_type} - ${caseData.case_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px 32px; margin: -40px -40px 32px -40px; }
        .header h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
        .header .subtitle { opacity: 0.9; font-size: 14px; }
        .header .form-type { float: right; font-size: 18px; font-weight: 600; margin-top: -36px; }
        .section { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
        .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .section-title::before { content: ''; width: 4px; height: 20px; background: #3b82f6; border-radius: 2px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .info-item { font-size: 14px; }
        .info-item label { color: #6b7280; display: block; margin-bottom: 2px; }
        .info-item span { color: #1f2937; font-weight: 500; }
        .field { border-bottom: 1px solid #e5e7eb; padding: 12px 0; }
        .field:last-child { border-bottom: none; }
        .field-label { font-weight: 600; color: #374151; margin-bottom: 4px; }
        .field-value { color: #4b5563; }
        .field-value ul { margin-left: 20px; margin-top: 4px; }
        .nested { margin-left: 16px; padding-left: 12px; border-left: 2px solid #e5e7eb; margin-top: 8px; }
        .text-gray { color: #9ca3af; font-style: italic; }
        .alert { padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .alert-indigo { background: #eef2ff; border: 1px solid #c7d2fe; }
        .alert-red { background: #fef2f2; border: 1px solid #fecaca; }
        .alert-title { font-weight: 600; margin-bottom: 8px; }
        .alert-indigo .alert-title { color: #3730a3; }
        .alert-red .alert-title { color: #991b1b; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
        .status-success { background: #dcfce7; color: #166534; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .status-error { background: #fee2e2; color: #991b1b; }
        .status-default { background: #e5e7eb; color: #374151; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; display: flex; justify-content: space-between; }
        @media print {
          body { padding: 20px; }
          .header { margin: -20px -20px 24px -20px; }
          @page { margin: 0.5in; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CommonGround</h1>
        <div class="subtitle">Court Form Report</div>
        <div class="form-type">${form.form_type} - ${formInfo?.name || 'Form'}</div>
      </div>

      <div class="section">
        <div class="section-title">Case Information</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Case Name</label>
            <span>${caseData.case_name}</span>
          </div>
          <div class="info-item">
            <label>Case Number</label>
            <span>${caseData.case_number || 'Not assigned'}</span>
          </div>
          <div class="info-item">
            <label>State</label>
            <span>${caseData.state}${(caseData as any).county ? `, ${(caseData as any).county} County` : ''}</span>
          </div>
          <div class="info-item">
            <label>Status</label>
            <span class="status-badge status-${statusConfig?.variant === 'success' ? 'success' : statusConfig?.variant === 'warning' ? 'warning' : statusConfig?.variant === 'error' ? 'error' : 'default'}">${statusConfig?.label || form.status}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Form Status</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Form Type</label>
            <span>${form.form_type}</span>
          </div>
          <div class="info-item">
            <label>Source</label>
            <span>${form.submission_source?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Platform'}${form.aria_assisted ? ' (ARIA Assisted)' : ''}</span>
          </div>
          <div class="info-item">
            <label>Created</label>
            <span>${new Date(form.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          ${form.submitted_at ? `
          <div class="info-item">
            <label>Submitted</label>
            <span>${new Date(form.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          ` : ''}
          ${form.approved_at ? `
          <div class="info-item">
            <label>Approved</label>
            <span>${new Date(form.approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          ` : ''}
        </div>
      </div>

      ${form.court_notes ? `
      <div class="alert alert-indigo">
        <div class="alert-title">Court Notes</div>
        <div>${form.court_notes}</div>
      </div>
      ` : ''}

      ${form.resubmission_issues && form.resubmission_issues.length > 0 ? `
      <div class="alert alert-red">
        <div class="alert-title">Issues to Address</div>
        <ul style="margin-left: 20px;">
          ${form.resubmission_issues.map((issue: string) => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      ${formDataHtml ? `
      <div class="section">
        <div class="section-title">Form Data</div>
        ${formDataHtml}
      </div>
      ` : ''}

      <div class="footer">
        <div>Generated by CommonGround on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <div>Form ID: ${form.id.slice(0, 8)}...</div>
      </div>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// Separate component for PDF display to avoid TypeScript issues with null
function PDFDocumentCard({ pdfUrl, formType, formId }: { pdfUrl: string; formType: string; formId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Official Court Document
        </CardTitle>
        <CardDescription>
          View or download the official PDF filed with the court
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PDF Preview (iframe) */}
        <div className="border rounded-lg overflow-hidden bg-gray-100">
          <iframe
            src={pdfUrl}
            className="w-full h-[500px]"
            title="Court Order PDF"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = pdfUrl;
              link.download = `${formType}-${formId}.pdf`;
              link.click();
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying court-entered orders (FL-340, FL-341, FL-342)
function CourtOrderDisplay({ form }: { form: CourtFormSubmission }) {
  const data = form.form_data || {};

  // Generate AI-style summary from form data
  const generateSummary = () => {
    const parts: string[] = [];

    if (data.case_number) {
      parts.push(`This court order pertains to case **${data.case_number}**.`);
    }

    if (data.hearing_date) {
      parts.push(`Following a hearing on **${new Date(data.hearing_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}**${data.judge_name ? ` before the Honorable **${data.judge_name}**` : ''}, the court has issued the following findings and orders.`);
    }

    if (data.petitioner_present !== undefined || data.respondent_present !== undefined) {
      const attendance: string[] = [];
      if (data.petitioner_present) attendance.push('Petitioner was present');
      if (data.respondent_present) attendance.push('Respondent was present');
      if (attendance.length > 0) {
        parts.push(attendance.join(' and ') + ' at the hearing.');
      }
    }

    if (data.findings && data.findings.length > 0) {
      parts.push(`\n**Key Findings:**\n${data.findings.map((f: string) => `- ${f}`).join('\n')}`);
    }

    if (data.orders?.legal_custody) {
      parts.push(`\n**Legal Custody:** ${data.orders.legal_custody.replace(/_/g, ' ')}`);
    }

    if (data.orders?.physical_custody) {
      parts.push(`**Physical Custody:** ${data.orders.physical_custody.replace(/_/g, ' ')}`);
    }

    if (data.orders?.parenting_schedule) {
      parts.push(`**Parenting Schedule:** ${data.orders.parenting_schedule}`);
    }

    if (data.orders?.child_support) {
      parts.push(`**Child Support:** ${data.orders.child_support}`);
    }

    if (data.orders?.other_orders && data.orders.other_orders.length > 0) {
      parts.push(`\n**Additional Orders:**\n${data.orders.other_orders.map((o: string) => `- ${o}`).join('\n')}`);
    }

    if (data.effective_date) {
      parts.push(`\nThis order is effective as of **${new Date(data.effective_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}**.`);
    }

    return parts.join('\n\n') || 'No summary available for this court order.';
  };

  const summary = generateSummary();

  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Order Summary
          </CardTitle>
          <CardDescription>
            AI-generated summary of this court order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {summary.split('\n').map((line, idx) => {
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <h4 key={idx} className="font-semibold text-gray-900 mt-4 mb-2">
                    {line.replace(/\*\*/g, '')}
                  </h4>
                );
              }
              if (line.startsWith('- ')) {
                return (
                  <p key={idx} className="text-gray-700 ml-4 my-1">
                    {line}
                  </p>
                );
              }
              if (line.trim()) {
                // Parse bold text within the line
                const parts = line.split(/(\*\*[^*]+\*\*)/);
                return (
                  <p key={idx} className="text-gray-700 my-2">
                    {parts.map((part, i) =>
                      part.startsWith('**') && part.endsWith('**') ? (
                        <strong key={i} className="text-gray-900">
                          {part.replace(/\*\*/g, '')}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </CardContent>
      </Card>

      {/* PDF Document Card */}
      {form.pdf_url && (
        <PDFDocumentCard pdfUrl={form.pdf_url} formType={form.form_type} formId={form.id} />
      )}

      {/* Detailed Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-gray-600" />
            Order Details
          </CardTitle>
          <CardDescription>
            Detailed breakdown of the court&apos;s findings and orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Case Information */}
          {(data.case_number || data.hearing_date || data.judge_name) && (
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4" />
                Case Information
              </h4>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {data.case_number && (
                  <div>
                    <dt className="text-gray-500">Case Number</dt>
                    <dd className="font-medium text-gray-900">{data.case_number}</dd>
                  </div>
                )}
                {data.hearing_date && (
                  <div>
                    <dt className="text-gray-500">Hearing Date</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(data.hearing_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {data.judge_name && (
                  <div>
                    <dt className="text-gray-500">Judge</dt>
                    <dd className="font-medium text-gray-900">{data.judge_name}</dd>
                  </div>
                )}
                {data.order_date && (
                  <div>
                    <dt className="text-gray-500">Order Date</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(data.order_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Findings */}
          {data.findings && data.findings.length > 0 && (
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4" />
                Court Findings
              </h4>
              <ul className="space-y-2">
                {data.findings.map((finding: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Custody Orders */}
          {data.orders && (
            <div className="border-b pb-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                Custody Orders
              </h4>
              <dl className="space-y-3 text-sm">
                {data.orders.legal_custody && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-gray-600">Legal Custody</dt>
                    <dd className="font-medium text-gray-900 bg-blue-50 px-3 py-1 rounded">
                      {data.orders.legal_custody.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </dd>
                  </div>
                )}
                {data.orders.physical_custody && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-gray-600">Physical Custody</dt>
                    <dd className="font-medium text-gray-900 bg-blue-50 px-3 py-1 rounded">
                      {data.orders.physical_custody.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </dd>
                  </div>
                )}
                {data.orders.parenting_schedule && (
                  <div className="py-2">
                    <dt className="text-gray-600 mb-1">Parenting Schedule</dt>
                    <dd className="text-gray-900 bg-gray-50 p-3 rounded">
                      {data.orders.parenting_schedule}
                    </dd>
                  </div>
                )}
                {data.orders.child_support && (
                  <div className="py-2">
                    <dt className="text-gray-600 mb-1">Child Support</dt>
                    <dd className="text-gray-900 bg-gray-50 p-3 rounded">
                      {data.orders.child_support}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Additional Orders */}
          {data.orders?.other_orders && data.orders.other_orders.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <FileCheck className="h-4 w-4" />
                Additional Orders
              </h4>
              <ul className="space-y-2">
                {data.orders.other_orders.map((order: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    {order}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Effective Date */}
          {data.effective_date && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">
                  Effective Date: {new Date(data.effective_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Read-only view for submitted FL-311 forms
function FL311ReadOnlyView({ formData }: { formData: Record<string, any> }) {
  const formatLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">Not provided</span>;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-400 italic">None</span>;
      return (
        <ul className="list-disc list-inside ml-2">
          {value.map((item, idx) => (
            <li key={idx}>
              {typeof item === 'object' ? JSON.stringify(item) : String(item)}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k}>
              <span className="font-medium text-gray-700">{formatLabel(k)}:</span>{' '}
              {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return String(value);
  };

  // Group FL-311 sections for display
  const sections = [
    {
      title: 'Case Information',
      icon: FileText,
      fields: ['petitioner_name', 'respondent_name', 'other_parent_party_name', 'case_number', 'attachment_type'],
    },
    {
      title: 'Minor Children',
      icon: Users,
      fields: ['children'],
    },
    {
      title: 'Custody Request',
      icon: Scale,
      fields: ['physical_custody_to', 'legal_custody_to', 'has_abuse_allegations', 'other_custody_details'],
    },
    {
      title: 'Visitation Type',
      icon: Calendar,
      fields: ['visitation_type', 'visitation_attached_pages', 'visitation_attached_date'],
    },
    {
      title: 'Visitation Schedule',
      icon: Calendar,
      fields: ['schedule_for_party', 'alternate_weekends', 'alternate_weekends_start', 'weekdays_enabled', 'weekday_days', 'weekday_times', 'weekends_enabled', 'weekend_schedule', 'virtual_visitation_enabled', 'virtual_visitation_description', 'other_schedule_details'],
    },
    {
      title: 'Abuse/Substance Abuse',
      icon: AlertCircle,
      fields: ['abuse_alleged_against', 'substance_abuse_alleged_against', 'request_no_custody_due_to_allegations', 'custody_despite_allegations', 'custody_despite_allegations_reasons', 'request_supervised_visitation', 'request_unsupervised_despite_allegations', 'unsupervised_reasons'],
    },
    {
      title: 'Supervised Visitation',
      icon: Eye,
      fields: ['supervised_party', 'supervised_reasons', 'supervisor_name', 'supervisor_phone', 'supervisor_type', 'supervised_location', 'supervised_location_other', 'supervised_frequency', 'supervised_hours_per_visit'],
    },
    {
      title: 'Transportation',
      icon: Home,
      fields: ['transport_to_visits_by', 'transport_from_visits_by', 'exchange_point_start', 'exchange_point_end', 'curbside_exchange', 'other_transport_details'],
    },
    {
      title: 'Travel Restrictions',
      icon: FileCheck,
      fields: ['travel_restrictions_enabled', 'restrict_out_of_state', 'restrict_counties', 'allowed_counties', 'other_travel_restrictions', 'abduction_prevention_enabled'],
    },
    {
      title: 'Mediation',
      icon: Users,
      fields: ['mediation_requested', 'mediation_date', 'mediation_time', 'mediation_location'],
    },
    {
      title: 'Additional Items',
      icon: FileText,
      fields: ['holiday_schedule_enabled', 'holiday_schedule_in_form', 'holiday_schedule_on_fl341c', 'holiday_details', 'additional_provisions_enabled', 'additional_provisions', 'other_requests'],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const Icon = section.icon;
        const sectionData = section.fields
          .map((field) => ({ field, value: formData[field] }))
          .filter(({ value }) => value !== undefined && value !== null && value !== '' && value !== false);

        if (sectionData.length === 0) return null;

        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-blue-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sectionData.map(({ field, value }) => (
                <div key={field} className="border-b border-gray-100 pb-3 last:border-0">
                  <dt className="text-sm font-medium text-gray-600">{formatLabel(field)}</dt>
                  <dd className="mt-1 text-gray-900">{renderValue(value)}</dd>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CourtFormDetailContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const formId = params.formId as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [form, setForm] = useState<CourtFormSubmission | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // FL-311 Section editing mode: null = summary view, number = editing specific section
  const [editingSection, setEditingSection] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [caseId, formId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [caseResult, formResult] = await Promise.all([
        casesAPI.get(caseId),
        courtFormsAPI.getForm(formId),
      ]);

      setCaseData(caseResult);
      setForm(formResult);
      setFormData(formResult.form_data || {});
    } catch (err: any) {
      console.error('Failed to load form:', err);
      setError(err.message || 'Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const updated = await courtFormsAPI.updateForm(formId, formData);
      setForm(updated);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save form:', err);
      setError(err.message || 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit this form to the court? You will not be able to edit it after submission.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Save first
      await courtFormsAPI.updateForm(formId, formData);

      // Then submit
      const updated = await courtFormsAPI.submitForm(formId);
      setForm(updated);
    } catch (err: any) {
      console.error('Failed to submit form:', err);
      setError(err.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && (!form || !caseData)) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Card className="max-w-lg mx-auto bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-700">{error || 'Form not found'}</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/cases/${caseId}/court-forms`)}
              className="mt-4"
            >
              Back to Court Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form || !caseData) return null;

  const formInfo = FORM_LABELS[form.form_type];
  const statusConfig = STATUS_CONFIG[form.status];
  const StatusIcon = statusConfig.icon;
  const fields = FORM_FIELDS[form.form_type] || [];
  // Use helper function that also checks edits_allowed flag
  const canEdit = canEditForm(form);
  // Check if court allowed edits (for showing special indicator and resubmit button)
  const editsAllowedByCourt = form.edits_allowed === true;

  // Handle resubmit (when edits were allowed by court)
  const handleResubmit = async () => {
    if (!confirm('Are you sure you want to resubmit this form? The court will review your corrections.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Save first
      await courtFormsAPI.updateForm(formId, formData);

      // Then resubmit
      const updated = await courtFormsAPI.resubmitForm(formId);
      setForm(updated);
    } catch (err: any) {
      console.error('Failed to resubmit form:', err);
      setError(err.message || 'Failed to resubmit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/cases" className="hover:text-blue-600">Cases</Link>
            <span>/</span>
            <Link href={`/cases/${caseId}`} className="hover:text-blue-600">{caseData.case_name}</Link>
            <span>/</span>
            <Link href={`/cases/${caseId}/court-forms`} className="hover:text-blue-600">Court Forms</Link>
            <span>/</span>
            <span className="text-gray-900">{form.form_type}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{form.form_type}</h1>
                <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-gray-500">{formInfo.name} - {formInfo.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* PDF buttons - show official format for supported forms */}
              {form.form_type === 'FL-311' && (
                <Button
                  variant="default"
                  onClick={() => generateFL311PDF(formData, caseData)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Official FL-311 PDF
                </Button>
              )}
              {form.form_type === 'FL-300' && (
                <Button
                  variant="default"
                  onClick={() => generateFormPDF(form, caseData)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FL-300 Report
                </Button>
              )}
              {form.form_type === 'FL-320' && (
                <Button
                  variant="default"
                  onClick={() => generateFormPDF(form, caseData)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FL-320 Report
                </Button>
              )}
              {form.form_type === 'FL-340' && (
                <Button
                  variant="default"
                  onClick={() => generateFormPDF(form, caseData)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FL-340 Report
                </Button>
              )}
              {form.form_type === 'FL-341' && (
                <Button
                  variant="default"
                  onClick={() => generateFormPDF(form, caseData)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FL-341 Report
                </Button>
              )}
              {form.form_type === 'FL-342' && (
                <Button
                  variant="default"
                  onClick={() => generateFormPDF(form, caseData)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate FL-342 Report
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => generateFormPDF(form, caseData)}
              >
                <Printer className="h-4 w-4 mr-2" />
                {form.form_type === 'FL-311' ? 'Summary Report' : 'Generate PDF Report'}
              </Button>

              {/* For wizard-based forms, show edit/save/submit in section editing mode only */}
              {canEdit && (form.form_type === 'FL-311' || form.form_type === 'FL-300' || form.form_type === 'FL-320' || form.form_type === 'FL-340' || form.form_type === 'FL-341' || form.form_type === 'FL-342') && editingSection !== null && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              )}

              {/* For other forms (not wizard-based), show save/submit buttons */}
              {canEdit && form.form_type !== 'FL-311' && form.form_type !== 'FL-300' && form.form_type !== 'FL-320' && form.form_type !== 'FL-340' && form.form_type !== 'FL-341' && form.form_type !== 'FL-342' && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Draft
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit to Court
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Form saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Status Info */}
        {!canEdit && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <StatusIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900 mb-1">
                    This form cannot be edited
                  </h3>
                  <p className="text-sm text-amber-700">
                    {form.status === 'submitted' && 'This form has been submitted and is awaiting court review.'}
                    {form.status === 'under_court_review' && 'This form is currently under review by court staff.'}
                    {form.status === 'approved' && 'This form has been approved by the court.'}
                    {form.status === 'rejected' && 'This form was rejected. Please review the feedback below.'}
                    {form.status === 'served' && 'This form has been served to the other party.'}
                    {form.status === 'entered' && 'This is an official court order.'}
                    {form.status === 'withdrawn' && 'This form has been withdrawn.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Court Notes (if any) */}
        {form.court_notes && (
          <Card className="bg-indigo-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="text-indigo-900 flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Court Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-indigo-800">{form.court_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Resubmission Issues (if any) */}
        {form.status === 'resubmit_required' && form.resubmission_issues && form.resubmission_issues.length > 0 && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Issues to Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-red-800">
                {form.resubmission_issues.map((issue: string, idx: number) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Edits Allowed by Court - Parent can make corrections */}
        {editsAllowedByCourt && (
          <Card className="bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edits Requested by Court
              </CardTitle>
              <p className="text-sm text-amber-700 mt-1">
                The court has reviewed your form and requested corrections. You can now edit and resubmit.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.edits_allowed_notes && (
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-2">What needs to be corrected:</h4>
                  <p className="text-amber-800">{form.edits_allowed_notes}</p>
                </div>
              )}
              {form.edits_allowed_at && (
                <p className="text-sm text-amber-600">
                  Request received on {new Date(form.edits_allowed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setEditingSection(0)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Make Corrections
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResubmit}
                  disabled={isSubmitting}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent mr-2" />
                      Resubmitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Resubmit to Court
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Fields - Use specialized summary/wizard for FL-311 and FL-300 */}
        {form.form_type === 'FL-311' && canEdit ? (
          editingSection !== null ? (
            // Editing a specific section
            <FL311Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
                children: (caseData as any).children?.map((c: any) => ({
                  first_name: c.first_name,
                  last_name: c.last_name,
                  date_of_birth: c.date_of_birth,
                })),
              }}
              onSave={async (data) => {
                try {
                  setFormData(data as Record<string, any>);
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                } catch (err: any) {
                  console.error('Failed to save form:', err);
                  setError(err.message || 'Failed to save form. Please try again.');
                }
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to submit this FL-311 to the court? You will not be able to edit it after submission.')) {
                  return;
                }
                try {
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  const updated = await courtFormsAPI.submitForm(formId);
                  setForm(updated);
                } catch (err: any) {
                  console.error('Failed to submit form:', err);
                  setError(err.message || 'Failed to submit form. Please try again.');
                }
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // Summary view with section cards
            <>
              <FL311Summary
                formData={formData}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Full Form
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFL311PDF(formData, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview Official FL-311 PDF
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit to Court
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-311' && !canEdit ? (
          // Read-only FL-311 summary for submitted forms
          <FL311Summary
            formData={formData}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : form.form_type === 'FL-300' && canEdit ? (
          editingSection !== null ? (
            // Editing a specific section
            <FL300Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
                children: (caseData as any).children?.map((c: any) => ({
                  first_name: c.first_name,
                  last_name: c.last_name,
                  date_of_birth: c.date_of_birth,
                })),
              }}
              onSave={async (data) => {
                try {
                  setFormData(data as Record<string, any>);
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                } catch (err: any) {
                  console.error('Failed to save form:', err);
                  setError(err.message || 'Failed to save form. Please try again.');
                }
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to submit this FL-300 to the court? You will not be able to edit it after submission.')) {
                  return;
                }
                try {
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  const updated = await courtFormsAPI.submitForm(formId);
                  setForm(updated);
                } catch (err: any) {
                  console.error('Failed to submit form:', err);
                  setError(err.message || 'Failed to submit form. Please try again.');
                }
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // Summary view with section cards
            <>
              <FL300Summary
                formData={formData}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Full Form
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFormPDF(form, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview FL-300 Report
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit to Court
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-300' && !canEdit ? (
          // Read-only FL-300 summary for submitted forms
          <FL300Summary
            formData={formData}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : form.form_type === 'FL-320' && canEdit ? (
          editingSection !== null ? (
            // Editing a specific section
            <FL320Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
              }}
              fl300Data={(form as any).responds_to_form_data || {}}
              onSave={async (data) => {
                try {
                  setFormData(data as Record<string, any>);
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 3000);
                } catch (err: any) {
                  console.error('Failed to save form:', err);
                  setError(err.message || 'Failed to save form. Please try again.');
                }
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to submit this FL-320 to the court? You will not be able to edit it after submission.')) {
                  return;
                }
                try {
                  setError(null);
                  await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                  const updated = await courtFormsAPI.submitForm(formId);
                  setForm(updated);
                } catch (err: any) {
                  console.error('Failed to submit form:', err);
                  setError(err.message || 'Failed to submit form. Please try again.');
                }
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // Summary view with section cards
            <>
              <FL320Summary
                formData={formData}
                fl300Data={(form as any).responds_to_form_data || {}}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Full Form
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFormPDF(form, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview FL-320 Report
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit to Court
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-320' && !canEdit ? (
          // Read-only FL-320 summary for submitted forms
          <FL320Summary
            formData={formData}
            fl300Data={(form as any).responds_to_form_data || {}}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : form.form_type === 'FL-340' && canEdit ? (
          editingSection !== null ? (
            // Editing FL-340
            <FL340Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
              }}
              onSave={async (data) => {
                setFormData(data as Record<string, any>);
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to enter this FL-340 order? This will make it an official court order.')) {
                  return;
                }
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                const updated = await courtFormsAPI.submitForm(formId);
                setForm(updated);
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // FL-340 Summary view
            <>
              <FL340Summary
                formData={formData}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Court Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFormPDF(form, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview FL-340 Report
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Entering Order...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enter Court Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-340' && !canEdit ? (
          // Read-only FL-340 summary for entered orders
          <FL340Summary
            formData={formData}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : form.form_type === 'FL-341' && canEdit ? (
          editingSection !== null ? (
            // Editing FL-341
            <FL341Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
                children: (caseData as any).children?.map((c: any) => ({
                  first_name: c.first_name,
                  last_name: c.last_name,
                  date_of_birth: c.date_of_birth,
                })),
              }}
              onSave={async (data) => {
                setFormData(data as Record<string, any>);
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to enter this FL-341 custody order? This will attach it to the parent order.')) {
                  return;
                }
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                const updated = await courtFormsAPI.submitForm(formId);
                setForm(updated);
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // FL-341 Summary view
            <>
              <FL341Summary
                formData={formData}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Custody Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFormPDF(form, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview FL-341 Report
                  </Button>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Entering Custody Order...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enter Custody Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-341' && !canEdit ? (
          // Read-only FL-341 summary for entered orders
          <FL341Summary
            formData={formData}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : form.form_type === 'FL-342' && canEdit ? (
          editingSection !== null ? (
            // Editing FL-342
            <FL342Wizard
              key={`edit-section-${editingSection}`}
              initialData={formData}
              caseData={{
                petitioner_name: caseData.case_name.split(' v. ')[0] || '',
                respondent_name: caseData.case_name.split(' v. ')[1] || '',
                case_number: caseData.case_number || '',
                children: (caseData as any).children?.map((c: any) => ({
                  first_name: c.first_name,
                  last_name: c.last_name,
                  date_of_birth: c.date_of_birth,
                })),
              }}
              onSave={async (data) => {
                setFormData(data as Record<string, any>);
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
              onSubmit={async (data) => {
                if (!confirm('Are you sure you want to enter this FL-342 child support order? This will attach it to the parent order.')) {
                  return;
                }
                await courtFormsAPI.updateForm(formId, data as Record<string, any>);
                const updated = await courtFormsAPI.submitForm(formId);
                setForm(updated);
              }}
              isLoading={isSaving || isSubmitting}
              startSection={editingSection}
              onBack={() => setEditingSection(null)}
            />
          ) : (
            // FL-342 Summary view
            <>
              <FL342Summary
                formData={formData}
                canEdit={canEdit}
                onEditSection={(sectionIndex) => setEditingSection(sectionIndex)}
              />

              {/* Action Buttons */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => setEditingSection(0)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Support Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => generateFormPDF(form, caseData)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview FL-342 Report
                  </Button>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Entering Support Order...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enter Support Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )
        ) : form.form_type === 'FL-342' && !canEdit ? (
          // Read-only FL-342 summary for entered orders
          <FL342Summary
            formData={formData}
            canEdit={false}
            onEditSection={() => {}}
          />
        ) : fields.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>
                {canEdit
                  ? 'Fill out the fields below. Save your progress at any time.'
                  : 'View the submitted form details below.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.key}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      rows={field.rows || 4}
                      className="mt-1"
                      disabled={!canEdit}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      id={field.key}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                      disabled={!canEdit}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="mt-1"
                      disabled={!canEdit}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          /* Court-entered forms (FL-340, FL-341, FL-342) get special formatting */
          <CourtOrderDisplay form={form} />
        )}

        {/* Form Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Form Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Form ID</dt>
                <dd className="font-mono text-gray-900">{form.id}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Form Type</dt>
                <dd className="text-gray-900">{form.form_type}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="text-gray-900">
                  {form.submission_source?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Platform'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{formatDate(form.created_at)}</dd>
              </div>
              {form.submitted_at && (
                <div>
                  <dt className="text-gray-500">Submitted</dt>
                  <dd className="text-gray-900">{formatDate(form.submitted_at)}</dd>
                </div>
              )}
              {form.approved_at && (
                <div>
                  <dt className="text-gray-500">Approved</dt>
                  <dd className="text-gray-900">{formatDate(form.approved_at)}</dd>
                </div>
              )}
              {form.aria_assisted && (
                <div>
                  <dt className="text-gray-500">ARIA Assisted</dt>
                  <dd className="text-green-600">Yes</dd>
                </div>
              )}
            </dl>
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
    </div>
  );
}

export default function CourtFormDetailPage() {
  return (
    <ProtectedRoute>
      <CourtFormDetailContent />
    </ProtectedRoute>
  );
}

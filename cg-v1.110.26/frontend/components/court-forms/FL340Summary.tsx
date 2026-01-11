'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  DollarSign,
  Home,
  Gavel,
  Clock,
  CheckCircle,
  Pencil,
  Scale,
  Calendar,
  LucideIcon,
  XCircle,
  AlertCircle,
} from 'lucide-react';

// FL-340 Section definitions
interface FL340Section {
  id: string;
  title: string;
  icon: LucideIcon;
  formItems: string[];
  sectionIndex: number;
}

const FL340_SECTIONS: FL340Section[] = [
  { id: 'header', title: 'Case Information', icon: FileText, formItems: ['Header'], sectionIndex: 0 },
  { id: 'hearing', title: '1. Hearing Information', icon: Calendar, formItems: ['1'], sectionIndex: 1 },
  { id: 'attendance', title: 'Attendance', icon: Users, formItems: ['1a-c'], sectionIndex: 2 },
  { id: 'custody', title: '2. Custody & Visitation', icon: Users, formItems: ['2'], sectionIndex: 3 },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, formItems: ['3'], sectionIndex: 4 },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, formItems: ['4'], sectionIndex: 5 },
  { id: 'property', title: '5. Property Orders', icon: Home, formItems: ['5'], sectionIndex: 6 },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Scale, formItems: ['6'], sectionIndex: 7 },
  { id: 'other_orders', title: '7-8. Other Orders', icon: Gavel, formItems: ['7-8'], sectionIndex: 8 },
  { id: 'reschedule', title: '9. Rescheduled Hearing', icon: Clock, formItems: ['9'], sectionIndex: 9 },
  { id: 'signatures', title: 'Signatures', icon: FileText, formItems: ['Signatures'], sectionIndex: 10 },
];

interface FL340FormData {
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;
  court_county?: string;

  hearing_date?: string;
  hearing_time?: string;
  hearing_dept?: string;
  hearing_room?: string;
  judge_name?: string;
  is_temporary_judge?: boolean;
  motion_filed_date?: string;
  motion_filed_by?: string;

  petitioner_present?: boolean;
  petitioner_attorney_present?: boolean;
  petitioner_attorney_name?: string;
  respondent_present?: boolean;
  respondent_attorney_present?: boolean;
  respondent_attorney_name?: string;
  other_parent_present?: boolean;
  other_parent_attorney_present?: boolean;
  other_parent_attorney_name?: string;

  custody_as_attached?: boolean;
  custody_attachment_form?: string;
  custody_other?: boolean;
  custody_other_details?: string;
  custody_not_applicable?: boolean;

  child_support_as_attached?: boolean;
  child_support_attachment_form?: string;
  child_support_other?: boolean;
  child_support_other_details?: string;
  child_support_not_applicable?: boolean;

  spousal_support_as_attached?: boolean;
  spousal_support_attachment_form?: string;
  spousal_support_other?: boolean;
  spousal_support_other_details?: string;
  spousal_support_not_applicable?: boolean;

  property_as_attached?: boolean;
  property_attachment_form?: string;
  property_other?: boolean;
  property_other_details?: string;
  property_not_applicable?: boolean;

  attorney_fees_as_attached?: boolean;
  attorney_fees_attachment_form?: string;
  attorney_fees_other?: boolean;
  attorney_fees_other_details?: string;
  attorney_fees_not_applicable?: boolean;

  other_orders_as_attached?: boolean;
  other_orders_not_applicable?: boolean;
  other_orders_details?: string;

  all_other_issues_reserved?: boolean;

  rescheduled_hearing_enabled?: boolean;
  rescheduled_date?: string;
  rescheduled_time?: string;
  rescheduled_dept?: string;
  rescheduled_issues?: string;

  judicial_officer_date?: string;
  order_prepared_by?: string;
  order_approved_as_conforming?: boolean;
  attorney_signature_1_date?: string;
  attorney_signature_1_for?: string;
  attorney_signature_2_date?: string;
  attorney_signature_2_for?: string;
}

interface FL340SummaryProps {
  formData: FL340FormData;
  canEdit: boolean;
  onEditSection: (sectionIndex: number) => void;
}

// Get order status badge
function getOrderBadge(
  asAttached: boolean,
  other: boolean,
  notApplicable: boolean,
  attachmentForm?: string
): { label: string; color: string } {
  if (asAttached) {
    return { label: `Attached (${attachmentForm || 'form'})`, color: 'bg-green-100 text-green-700' };
  }
  if (other) {
    return { label: 'Other', color: 'bg-blue-100 text-blue-700' };
  }
  if (notApplicable) {
    return { label: 'N/A', color: 'bg-gray-100 text-gray-500' };
  }
  return { label: 'Not Set', color: 'bg-amber-100 text-amber-700' };
}

// Get section summary text
function getSectionSummary(sectionId: string, formData: FL340FormData): string | null {
  switch (sectionId) {
    case 'header': {
      const parts: string[] = [];
      if (formData.petitioner_name) parts.push(formData.petitioner_name);
      if (formData.respondent_name) parts.push(`vs. ${formData.respondent_name}`);
      if (formData.case_number) parts.push(`Case #${formData.case_number}`);
      if (formData.court_county) parts.push(`${formData.court_county} County`);
      return parts.length > 0 ? parts.join(' ') : null;
    }

    case 'hearing': {
      const parts: string[] = [];
      if (formData.hearing_date) {
        parts.push(`Date: ${new Date(formData.hearing_date).toLocaleDateString()}`);
      }
      if (formData.hearing_time) parts.push(`Time: ${formData.hearing_time}`);
      if (formData.hearing_dept) parts.push(`Dept: ${formData.hearing_dept}`);
      if (formData.judge_name) {
        parts.push(`Judge: ${formData.judge_name}${formData.is_temporary_judge ? ' (Temp)' : ''}`);
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    case 'attendance': {
      const parts: string[] = [];
      if (formData.petitioner_present) parts.push('Petitioner present');
      if (formData.respondent_present) parts.push('Respondent present');
      if (formData.other_parent_present) parts.push('Other parent present');
      if (parts.length === 0) {
        if (formData.petitioner_present === false && formData.respondent_present === false) {
          return 'No attendance recorded';
        }
        return null;
      }
      return parts.join(' • ');
    }

    case 'custody': {
      if (formData.custody_as_attached) {
        return `As attached on ${formData.custody_attachment_form || 'FL-341'}`;
      }
      if (formData.custody_other) {
        const detail = formData.custody_other_details?.substring(0, 50);
        return `Other: ${detail}${(formData.custody_other_details?.length || 0) > 50 ? '...' : ''}`;
      }
      if (formData.custody_not_applicable) {
        return 'Not applicable';
      }
      return null;
    }

    case 'child_support': {
      if (formData.child_support_as_attached) {
        return `As attached on ${formData.child_support_attachment_form || 'FL-342'}`;
      }
      if (formData.child_support_other) {
        const detail = formData.child_support_other_details?.substring(0, 50);
        return `Other: ${detail}${(formData.child_support_other_details?.length || 0) > 50 ? '...' : ''}`;
      }
      if (formData.child_support_not_applicable) {
        return 'Not applicable';
      }
      return null;
    }

    case 'spousal_support': {
      if (formData.spousal_support_as_attached) {
        return `As attached on ${formData.spousal_support_attachment_form || 'FL-343'}`;
      }
      if (formData.spousal_support_other) {
        const detail = formData.spousal_support_other_details?.substring(0, 50);
        return `Other: ${detail}${(formData.spousal_support_other_details?.length || 0) > 50 ? '...' : ''}`;
      }
      if (formData.spousal_support_not_applicable) {
        return 'Not applicable';
      }
      return null;
    }

    case 'property': {
      if (formData.property_as_attached) {
        return `As attached on ${formData.property_attachment_form || 'FL-344'}`;
      }
      if (formData.property_other) {
        const detail = formData.property_other_details?.substring(0, 50);
        return `Other: ${detail}${(formData.property_other_details?.length || 0) > 50 ? '...' : ''}`;
      }
      if (formData.property_not_applicable) {
        return 'Not applicable';
      }
      return null;
    }

    case 'attorney_fees': {
      if (formData.attorney_fees_as_attached) {
        return `As attached on ${formData.attorney_fees_attachment_form || 'FL-346'}`;
      }
      if (formData.attorney_fees_other) {
        const detail = formData.attorney_fees_other_details?.substring(0, 50);
        return `Other: ${detail}${(formData.attorney_fees_other_details?.length || 0) > 50 ? '...' : ''}`;
      }
      if (formData.attorney_fees_not_applicable) {
        return 'Not applicable';
      }
      return null;
    }

    case 'other_orders': {
      const parts: string[] = [];
      if (formData.other_orders_as_attached) {
        parts.push('Other orders as attached');
      }
      if (formData.other_orders_not_applicable) {
        parts.push('Other orders: N/A');
      }
      if (formData.all_other_issues_reserved) {
        parts.push('All other issues reserved');
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    case 'reschedule': {
      if (!formData.rescheduled_hearing_enabled) {
        return 'No rescheduled hearing';
      }
      const parts: string[] = [];
      if (formData.rescheduled_date) {
        parts.push(`Date: ${new Date(formData.rescheduled_date).toLocaleDateString()}`);
      }
      if (formData.rescheduled_time) parts.push(`Time: ${formData.rescheduled_time}`);
      if (formData.rescheduled_dept) parts.push(`Dept: ${formData.rescheduled_dept}`);
      return parts.length > 0 ? parts.join(' • ') : 'Rescheduled (details pending)';
    }

    case 'signatures': {
      const parts: string[] = [];
      if (formData.judicial_officer_date) {
        parts.push(`Signed: ${new Date(formData.judicial_officer_date).toLocaleDateString()}`);
      }
      if (formData.order_approved_as_conforming) {
        parts.push('Approved as conforming');
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    default:
      return null;
  }
}

// Check if section is complete
function isSectionComplete(sectionId: string, formData: FL340FormData): boolean {
  switch (sectionId) {
    case 'header':
      return Boolean(formData.petitioner_name && formData.respondent_name);

    case 'hearing':
      return Boolean(formData.hearing_date);

    case 'attendance':
      return formData.petitioner_present !== undefined || formData.respondent_present !== undefined;

    case 'custody':
      return Boolean(formData.custody_as_attached || formData.custody_other || formData.custody_not_applicable);

    case 'child_support':
      return Boolean(formData.child_support_as_attached || formData.child_support_other || formData.child_support_not_applicable);

    case 'spousal_support':
      return Boolean(formData.spousal_support_as_attached || formData.spousal_support_other || formData.spousal_support_not_applicable);

    case 'property':
      return Boolean(formData.property_as_attached || formData.property_other || formData.property_not_applicable);

    case 'attorney_fees':
      return Boolean(formData.attorney_fees_as_attached || formData.attorney_fees_other || formData.attorney_fees_not_applicable);

    case 'other_orders':
      return Boolean(formData.other_orders_as_attached || formData.other_orders_not_applicable || formData.all_other_issues_reserved);

    case 'reschedule':
      return true; // Optional section, always "complete"

    case 'signatures':
      return Boolean(formData.judicial_officer_date);

    default:
      return false;
  }
}

export default function FL340Summary({ formData, canEdit, onEditSection }: FL340SummaryProps) {
  const completedSections = FL340_SECTIONS.filter((s) => isSectionComplete(s.id, formData)).length;
  const totalSections = FL340_SECTIONS.length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);

  // Count order types
  const orderSections = ['custody', 'child_support', 'spousal_support', 'property', 'attorney_fees'];
  const orderStats = orderSections.reduce(
    (acc, prefix) => {
      const asAttached = formData[`${prefix}_as_attached` as keyof FL340FormData];
      const other = formData[`${prefix}_other` as keyof FL340FormData];
      const notApplicable = formData[`${prefix}_not_applicable` as keyof FL340FormData];
      if (asAttached) acc.attached++;
      if (other) acc.other++;
      if (notApplicable) acc.notApplicable++;
      return acc;
    },
    { attached: 0, other: 0, notApplicable: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">FL-340 Summary</CardTitle>
          </div>
          <CardDescription>Findings and Order After Hearing</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Completion</span>
              <span>
                {completedSections} of {totalSections} sections ({completionPercentage}%)
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Order Stats */}
          <div className="mb-4 p-3 bg-white rounded-lg border">
            <div className="text-sm font-medium text-gray-700 mb-2">Order Summary</div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Attached: {orderStats.attached}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Other: {orderStats.other}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-300" />
                <span>N/A: {orderStats.notApplicable}</span>
              </div>
            </div>
          </div>

          {/* Party Names */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Petitioner:</span>{' '}
              <span className="font-medium">{formData.petitioner_name || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Respondent:</span>{' '}
              <span className="font-medium">{formData.respondent_name || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Case:</span>{' '}
              <span className="font-medium">{formData.case_number || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">County:</span>{' '}
              <span className="font-medium">{formData.court_county || 'Not set'}</span>
            </div>
          </div>

          {/* Hearing Info */}
          {formData.hearing_date && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-2">Hearing Information</div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>{' '}
                  <span className="font-medium">{new Date(formData.hearing_date).toLocaleDateString()}</span>
                </div>
                {formData.hearing_time && (
                  <div>
                    <span className="text-gray-500">Time:</span>{' '}
                    <span className="font-medium">{formData.hearing_time}</span>
                  </div>
                )}
                {formData.judge_name && (
                  <div>
                    <span className="text-gray-500">Judge:</span>{' '}
                    <span className="font-medium">{formData.judge_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Form Sections</CardTitle>
          <CardDescription>
            {canEdit
              ? 'Click Edit to modify any section'
              : 'This order has been entered and cannot be edited'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FL340_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isComplete = isSectionComplete(section.id, formData);
              const summary = getSectionSummary(section.id, formData);

              // Get order badge for order sections
              let orderBadge = null;
              if (['custody', 'child_support', 'spousal_support', 'property', 'attorney_fees'].includes(section.id)) {
                const prefix = section.id;
                orderBadge = getOrderBadge(
                  Boolean(formData[`${prefix}_as_attached` as keyof FL340FormData]),
                  Boolean(formData[`${prefix}_other` as keyof FL340FormData]),
                  Boolean(formData[`${prefix}_not_applicable` as keyof FL340FormData]),
                  formData[`${prefix}_attachment_form` as keyof FL340FormData] as string | undefined
                );
              }

              return (
                <div
                  key={section.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isComplete
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900">{section.title}</h4>
                      </div>
                      {summary && (
                        <p className="text-sm text-gray-600 mt-2 ml-10 line-clamp-2">{summary}</p>
                      )}
                      {!summary && !isComplete && (
                        <p className="text-sm text-gray-400 mt-2 ml-10 italic">Not yet completed</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        Item {section.formItems.join(', ')}
                      </Badge>
                      {orderBadge && (
                        <Badge className={orderBadge.color}>
                          {orderBadge.label}
                        </Badge>
                      )}
                      {isComplete && !orderBadge && (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          Complete
                        </Badge>
                      )}
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditSection(section.sectionIndex)}
                          className="ml-2"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rescheduled Hearing Alert */}
      {formData.rescheduled_hearing_enabled && formData.rescheduled_date && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">
                  Matter Rescheduled
                </h3>
                <p className="text-sm text-blue-700">
                  This matter has been rescheduled for further hearing on{' '}
                  <strong>{new Date(formData.rescheduled_date).toLocaleDateString()}</strong>
                  {formData.rescheduled_time && ` at ${formData.rescheduled_time}`}
                  {formData.rescheduled_dept && ` in Dept. ${formData.rescheduled_dept}`}.
                </p>
                {formData.rescheduled_issues && (
                  <p className="text-sm text-blue-700 mt-2">
                    <strong>Issues:</strong> {formData.rescheduled_issues}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

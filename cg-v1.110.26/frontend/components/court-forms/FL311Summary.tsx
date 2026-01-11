'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Scale,
  Calendar,
  AlertTriangle,
  Shield,
  Car,
  Plane,
  MessageSquare,
  FileText,
  CheckCircle,
  Pencil,
  Sparkles,
  LucideIcon,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';

// FL-311 Section definitions matching the wizard
interface FL311Section {
  id: string;
  title: string;
  icon: LucideIcon;
  formItems: string[];  // Official form item numbers
  sectionIndex: number; // Index in wizard for editing
}

const FL311_SECTIONS: FL311Section[] = [
  { id: 'header', title: 'Case Information', icon: FileText, formItems: ['TO', 'Header'], sectionIndex: 0 },
  { id: 'children', title: '1. Minor Children', icon: Users, formItems: ['1'], sectionIndex: 1 },
  { id: 'custody', title: '2. Custody Request', icon: Scale, formItems: ['2'], sectionIndex: 2 },
  { id: 'visitation_type', title: '3. Visitation Type', icon: Calendar, formItems: ['3'], sectionIndex: 3 },
  { id: 'schedule', title: '4. Visitation Schedule', icon: Calendar, formItems: ['4'], sectionIndex: 4 },
  { id: 'abuse', title: '5. Abuse Allegations', icon: AlertTriangle, formItems: ['5'], sectionIndex: 5 },
  { id: 'supervised', title: '6. Supervised Visitation', icon: Shield, formItems: ['6'], sectionIndex: 6 },
  { id: 'transportation', title: '7. Transportation', icon: Car, formItems: ['7'], sectionIndex: 7 },
  { id: 'travel', title: '8-9. Travel & Abduction Prevention', icon: Plane, formItems: ['8', '9'], sectionIndex: 8 },
  { id: 'mediation', title: '10. Mediation', icon: MessageSquare, formItems: ['10'], sectionIndex: 9 },
  { id: 'additional', title: '11-13. Additional Provisions', icon: FileText, formItems: ['11', '12', '13'], sectionIndex: 10 },
];

interface FL311FormData {
  // Header
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;
  attachment_type?: string;

  // Children
  children?: Array<{ name: string; birthdate?: string; age?: number }>;

  // Custody
  physical_custody_to?: string;
  legal_custody_to?: string;
  has_abuse_allegations?: boolean;

  // Visitation Type
  visitation_type?: string;

  // Schedule
  schedule_for_party?: string;
  weekends_enabled?: boolean;
  weekend_schedules?: Array<{ weekend: string; enabled: boolean; from_day?: string; to_day?: string }>;
  weekdays_enabled?: boolean;
  weekday_days?: string[];
  alternate_weekends_enabled?: boolean;
  virtual_visitation_enabled?: boolean;

  // Abuse
  abuse_alleged_against?: string[];
  substance_abuse_alleged_against?: string[];

  // Supervised
  supervised_party?: string;
  supervisor_name?: string;
  supervisor_type?: string;

  // Transportation
  transport_to_visits_by?: string;
  transport_from_visits_by?: string;
  exchange_point_start?: string;
  curbside_exchange?: boolean;

  // Travel
  travel_restrictions_enabled?: boolean;
  restrict_out_of_state?: boolean;
  abduction_prevention_enabled?: boolean;

  // Mediation
  mediation_requested?: boolean;
  mediation_date?: string;

  // Additional
  holiday_schedule_enabled?: boolean;
  holiday_schedule_on_fl341c?: boolean;
  additional_provisions_enabled?: boolean;
  additional_provisions?: string[];
  other_requests?: string;
}

interface FL311SummaryProps {
  formData: FL311FormData;
  canEdit: boolean;
  onEditSection: (sectionIndex: number) => void;
}

// Helper to format custody type for display
function formatCustodyType(type: string | undefined): string {
  if (!type) return '';
  switch (type) {
    case 'petitioner':
      return 'Petitioner';
    case 'respondent':
      return 'Respondent';
    case 'joint':
      return 'Joint';
    case 'other_parent_party':
      return 'Other Parent/Party';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

// Get section summary text
function getSectionSummary(sectionId: string, formData: FL311FormData): string | null {
  switch (sectionId) {
    case 'header': {
      const parts: string[] = [];
      if (formData.petitioner_name) parts.push(formData.petitioner_name);
      if (formData.respondent_name) parts.push(`vs. ${formData.respondent_name}`);
      if (formData.case_number) parts.push(`Case #${formData.case_number}`);
      return parts.length > 0 ? parts.join(' ') : null;
    }

    case 'children': {
      const children = formData.children || [];
      if (children.length === 0) return null;
      const names = children.map((c) => {
        const age = c.age ? ` (${c.age})` : '';
        return `${c.name}${age}`;
      });
      return `${children.length} child${children.length > 1 ? 'ren' : ''}: ${names.join(', ')}`;
    }

    case 'custody': {
      const parts: string[] = [];
      if (formData.physical_custody_to) {
        parts.push(`Physical: ${formatCustodyType(formData.physical_custody_to)}`);
      }
      if (formData.legal_custody_to) {
        parts.push(`Legal: ${formatCustodyType(formData.legal_custody_to)}`);
      }
      if (formData.has_abuse_allegations) {
        parts.push('Abuse allegations noted');
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    case 'visitation_type': {
      if (!formData.visitation_type) return null;
      switch (formData.visitation_type) {
        case 'reasonable':
          return 'Reasonable visitation';
        case 'attached_document':
          return 'See attached document';
        case 'schedule_in_item_4':
          return 'Schedule detailed in Item 4';
        case 'supervised':
          return 'Supervised visitation only';
        case 'no_visitation':
          return 'No visitation';
        default:
          return formData.visitation_type;
      }
    }

    case 'schedule': {
      if (!formData.schedule_for_party) return null;
      const parts: string[] = [];
      parts.push(`Schedule for: ${formatCustodyType(formData.schedule_for_party)}`);

      // Count enabled weekends
      const enabledWeekends = formData.weekend_schedules?.filter((w) => w.enabled) || [];
      if (enabledWeekends.length > 0) {
        const weekendNames = enabledWeekends.map((w) => w.weekend).join(', ');
        parts.push(`${weekendNames} weekends`);
      }

      if (formData.alternate_weekends_enabled) {
        parts.push('Alternating weekends');
      }

      if (formData.weekdays_enabled && formData.weekday_days?.length) {
        parts.push(`${formData.weekday_days.join(', ')} visitation`);
      }

      if (formData.virtual_visitation_enabled) {
        parts.push('Virtual visitation');
      }

      return parts.length > 1 ? parts.join(' • ') : parts[0] || null;
    }

    case 'abuse': {
      const hasAbuse =
        (formData.abuse_alleged_against?.length || 0) > 0 ||
        (formData.substance_abuse_alleged_against?.length || 0) > 0;

      if (!hasAbuse) return 'No allegations';

      const parts: string[] = [];
      if (formData.abuse_alleged_against?.length) {
        parts.push(`Abuse allegations: ${formData.abuse_alleged_against.length}`);
      }
      if (formData.substance_abuse_alleged_against?.length) {
        parts.push(`Substance abuse allegations: ${formData.substance_abuse_alleged_against.length}`);
      }
      return parts.join(' • ');
    }

    case 'supervised': {
      if (!formData.supervised_party) return 'Not applicable';
      const parts: string[] = [];
      parts.push(`${formatCustodyType(formData.supervised_party)}'s visits supervised`);
      if (formData.supervisor_name) {
        parts.push(`by ${formData.supervisor_name}`);
      }
      if (formData.supervisor_type) {
        parts.push(`(${formData.supervisor_type})`);
      }
      return parts.join(' ');
    }

    case 'transportation': {
      const parts: string[] = [];
      if (formData.transport_to_visits_by) {
        parts.push(`To: ${formData.transport_to_visits_by}`);
      }
      if (formData.transport_from_visits_by) {
        parts.push(`From: ${formData.transport_from_visits_by}`);
      }
      if (formData.exchange_point_start) {
        parts.push(`at ${formData.exchange_point_start}`);
      }
      if (formData.curbside_exchange) {
        parts.push('Curbside exchange');
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    case 'travel': {
      const parts: string[] = [];
      if (formData.travel_restrictions_enabled) {
        parts.push('Travel restrictions apply');
        if (formData.restrict_out_of_state) {
          parts.push('No out-of-state travel');
        }
      }
      if (formData.abduction_prevention_enabled) {
        parts.push('Abduction prevention orders requested');
      }
      return parts.length > 0 ? parts.join(' • ') : 'No restrictions';
    }

    case 'mediation': {
      if (formData.mediation_requested) {
        if (formData.mediation_date) {
          return `Mediation scheduled: ${new Date(formData.mediation_date).toLocaleDateString()}`;
        }
        return 'Mediation requested';
      }
      return 'Mediation not requested';
    }

    case 'additional': {
      const parts: string[] = [];
      if (formData.holiday_schedule_enabled) {
        if (formData.holiday_schedule_on_fl341c) {
          parts.push('Holiday schedule on FL-341(C)');
        } else {
          parts.push('Holiday schedule included');
        }
      }
      if (formData.additional_provisions_enabled && formData.additional_provisions?.length) {
        parts.push(`${formData.additional_provisions.length} additional provisions`);
      }
      if (formData.other_requests) {
        parts.push('Other requests included');
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    default:
      return null;
  }
}

// Check if section is complete
function isSectionComplete(sectionId: string, formData: FL311FormData): boolean {
  switch (sectionId) {
    case 'header':
      return Boolean(formData.petitioner_name && formData.respondent_name);
    case 'children':
      return Boolean(formData.children?.length && formData.children.length > 0);
    case 'custody':
      return Boolean(formData.physical_custody_to && formData.legal_custody_to);
    case 'visitation_type':
      return Boolean(formData.visitation_type);
    case 'schedule':
      // Complete if schedule_for_party is set and at least one schedule type is enabled
      return Boolean(
        formData.schedule_for_party &&
          (formData.weekends_enabled ||
            formData.alternate_weekends_enabled ||
            formData.weekdays_enabled ||
            formData.virtual_visitation_enabled)
      );
    case 'abuse':
      // Always "complete" - just viewing what's there
      return true;
    case 'supervised':
      // Complete if no supervised party needed OR supervised details filled
      return Boolean(!formData.supervised_party || formData.supervisor_type);
    case 'transportation':
      // Complete if exchange details provided
      return Boolean(formData.exchange_point_start || formData.curbside_exchange);
    case 'travel':
      // Always "complete" - optional section
      return true;
    case 'mediation':
      // Always "complete" - optional section
      return true;
    case 'additional':
      // Always "complete" - optional section
      return true;
    default:
      return false;
  }
}

// Get detailed section data for viewing
function getSectionDetails(sectionId: string, formData: FL311FormData): React.ReactNode {
  const DataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium text-right max-w-[60%]">{value || <span className="text-gray-400 italic">Not provided</span>}</span>
    </div>
  );

  switch (sectionId) {
    case 'header':
      return (
        <div className="space-y-1">
          <DataRow label="Petitioner" value={formData.petitioner_name} />
          <DataRow label="Respondent" value={formData.respondent_name} />
          {formData.other_parent_party_name && (
            <DataRow label="Other Party" value={formData.other_parent_party_name} />
          )}
          <DataRow label="Case Number" value={formData.case_number} />
          <DataRow label="Attachment Type" value={formData.attachment_type} />
        </div>
      );

    case 'children':
      return (
        <div className="space-y-2">
          {formData.children && formData.children.length > 0 ? (
            <>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Children ({formData.children.length}):</span>
              {formData.children.map((child, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                  <div className="font-medium">{child.name}</div>
                  {child.birthdate && <div className="text-gray-500">DOB: {child.birthdate}</div>}
                  {child.age && <div className="text-gray-500">Age: {child.age}</div>}
                </div>
              ))}
            </>
          ) : (
            <p className="text-gray-400 italic text-sm">No children listed</p>
          )}
        </div>
      );

    case 'custody':
      return (
        <div className="space-y-1">
          <DataRow label="Physical Custody To" value={formatCustodyType(formData.physical_custody_to)} />
          <DataRow label="Legal Custody To" value={formatCustodyType(formData.legal_custody_to)} />
          <DataRow label="Abuse Allegations" value={formData.has_abuse_allegations ? 'Yes' : 'No'} />
        </div>
      );

    case 'visitation_type':
      return (
        <div className="space-y-1">
          <DataRow label="Visitation Type" value={formData.visitation_type ? getSectionSummary('visitation_type', formData) : null} />
        </div>
      );

    case 'schedule':
      return (
        <div className="space-y-2">
          <DataRow label="Schedule For" value={formatCustodyType(formData.schedule_for_party)} />
          <DataRow label="Weekends Enabled" value={formData.weekends_enabled ? 'Yes' : 'No'} />
          {formData.weekend_schedules && formData.weekend_schedules.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Weekend Schedules:</span>
              {formData.weekend_schedules.filter(w => w.enabled).map((weekend, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded mb-2 text-sm">
                  <div className="font-medium">{weekend.weekend}</div>
                  {weekend.from_day && weekend.to_day && (
                    <div className="text-gray-500">From {weekend.from_day} to {weekend.to_day}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <DataRow label="Alternate Weekends" value={formData.alternate_weekends_enabled ? 'Yes' : 'No'} />
          <DataRow label="Weekdays Enabled" value={formData.weekdays_enabled ? 'Yes' : 'No'} />
          {formData.weekday_days && formData.weekday_days.length > 0 && (
            <DataRow label="Weekday Days" value={formData.weekday_days.join(', ')} />
          )}
          <DataRow label="Virtual Visitation" value={formData.virtual_visitation_enabled ? 'Yes' : 'No'} />
        </div>
      );

    case 'abuse':
      return (
        <div className="space-y-1">
          <DataRow label="Abuse Allegations Against" value={formData.abuse_alleged_against?.join(', ') || 'None'} />
          <DataRow label="Substance Abuse Allegations Against" value={formData.substance_abuse_alleged_against?.join(', ') || 'None'} />
        </div>
      );

    case 'supervised':
      return (
        <div className="space-y-1">
          <DataRow label="Supervised Party" value={formatCustodyType(formData.supervised_party) || 'None'} />
          <DataRow label="Supervisor Name" value={formData.supervisor_name} />
          <DataRow label="Supervisor Type" value={formData.supervisor_type} />
        </div>
      );

    case 'transportation':
      return (
        <div className="space-y-1">
          <DataRow label="Transport To Visits By" value={formData.transport_to_visits_by} />
          <DataRow label="Transport From Visits By" value={formData.transport_from_visits_by} />
          <DataRow label="Exchange Point" value={formData.exchange_point_start} />
          <DataRow label="Curbside Exchange" value={formData.curbside_exchange ? 'Yes' : 'No'} />
        </div>
      );

    case 'travel':
      return (
        <div className="space-y-1">
          <DataRow label="Travel Restrictions" value={formData.travel_restrictions_enabled ? 'Yes' : 'No'} />
          <DataRow label="Restrict Out of State" value={formData.restrict_out_of_state ? 'Yes' : 'No'} />
          <DataRow label="Abduction Prevention" value={formData.abduction_prevention_enabled ? 'Yes' : 'No'} />
        </div>
      );

    case 'mediation':
      return (
        <div className="space-y-1">
          <DataRow label="Mediation Requested" value={formData.mediation_requested ? 'Yes' : 'No'} />
          <DataRow label="Mediation Date" value={formData.mediation_date ? new Date(formData.mediation_date).toLocaleDateString() : null} />
        </div>
      );

    case 'additional':
      return (
        <div className="space-y-2">
          <DataRow label="Holiday Schedule Enabled" value={formData.holiday_schedule_enabled ? 'Yes' : 'No'} />
          <DataRow label="Holiday Schedule on FL-341(C)" value={formData.holiday_schedule_on_fl341c ? 'Yes' : 'No'} />
          <DataRow label="Additional Provisions Enabled" value={formData.additional_provisions_enabled ? 'Yes' : 'No'} />
          {formData.additional_provisions && formData.additional_provisions.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Additional Provisions:</span>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {formData.additional_provisions.map((prov, idx) => (
                  <li key={idx}>{prov}</li>
                ))}
              </ul>
            </div>
          )}
          {formData.other_requests && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Other Requests:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.other_requests}</p>
            </div>
          )}
        </div>
      );

    default:
      return <p className="text-gray-500 text-sm">No details available</p>;
  }
}

export default function FL311Summary({ formData, canEdit, onEditSection }: FL311SummaryProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const completedSections = FL311_SECTIONS.filter((s) => isSectionComplete(s.id, formData)).length;
  const totalSections = FL311_SECTIONS.length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">FL-311 Summary</CardTitle>
          </div>
          <CardDescription>
            Child Custody and Visitation Application Attachment
          </CardDescription>
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
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
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
          </div>
        </CardContent>
      </Card>

      {/* Section Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Form Sections</CardTitle>
          <CardDescription>
            {canEdit
              ? 'Click Edit to modify any section'
              : 'Click on a section to view details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FL311_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isComplete = isSectionComplete(section.id, formData);
              const summary = getSectionSummary(section.id, formData);
              const isExpanded = expandedSection === section.id;

              return (
                <div
                  key={section.id}
                  className={`rounded-lg border transition-colors ${
                    isComplete
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  {/* Section Header - Clickable to expand */}
                  <div
                    className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-gray-50/50"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900">{section.title}</h4>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 ml-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 ml-1" />
                        )}
                      </div>
                      {!isExpanded && summary && (
                        <p className="text-sm text-gray-600 mt-2 ml-10 line-clamp-2">{summary}</p>
                      )}
                      {!isExpanded && !summary && !isComplete && (
                        <p className="text-sm text-gray-400 mt-2 ml-10 italic">Not yet completed</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        Items {section.formItems.join(', ')}
                      </Badge>
                      {isComplete && (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          Complete
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.id);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {isExpanded ? 'Hide' : 'View'}
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSection(section.sectionIndex);
                          }}
                          className="ml-1"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Section Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                      <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Section Details
                        </h5>
                        {getSectionDetails(section.id, formData)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

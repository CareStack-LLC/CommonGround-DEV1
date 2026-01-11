'use client';

import { useState } from 'react';
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
  Sparkles,
  Shield,
  MessageSquare,
  LucideIcon,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';

// FL-320 Section definitions matching the wizard
interface FL320Section {
  id: string;
  title: string;
  icon: LucideIcon;
  formItems: string[];
  sectionIndex: number;
}

const FL320_SECTIONS: FL320Section[] = [
  { id: 'header', title: 'Case Information', icon: FileText, formItems: ['Header'], sectionIndex: 0 },
  { id: 'restraining', title: '1. Restraining Orders', icon: Shield, formItems: ['1'], sectionIndex: 1 },
  { id: 'custody', title: '2. Child Custody/Visitation', icon: Users, formItems: ['2'], sectionIndex: 2 },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, formItems: ['3'], sectionIndex: 3 },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, formItems: ['4'], sectionIndex: 4 },
  { id: 'property', title: '5. Property Control', icon: Home, formItems: ['5'], sectionIndex: 5 },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Gavel, formItems: ['6'], sectionIndex: 6 },
  { id: 'other_orders', title: '7. Other Orders', icon: FileText, formItems: ['7'], sectionIndex: 7 },
  { id: 'time_service', title: '8. Time for Service', icon: Clock, formItems: ['8'], sectionIndex: 8 },
  { id: 'facts', title: '9. Facts to Support', icon: MessageSquare, formItems: ['9'], sectionIndex: 9 },
];

interface FL320FormData {
  filing_party?: string;
  party_name?: string;
  petitioner_name?: string;
  respondent_name?: string;
  case_number?: string;
  court_county?: string;
  hearing_date?: string;
  hearing_time?: string;
  hearing_dept_room?: string;

  restraining_no_orders_in_effect?: boolean;
  restraining_orders_in_effect?: boolean;

  custody_enabled?: boolean;
  custody_consent_legal_physical?: boolean;
  custody_consent_visitation?: boolean;
  custody_do_not_consent?: boolean;
  custody_counter_proposal?: string;

  child_support_enabled?: boolean;
  child_support_income_declaration_filed?: boolean;
  child_support_consent?: boolean;
  child_support_consent_guideline?: boolean;
  child_support_do_not_consent?: boolean;
  child_support_counter_proposal?: string;

  spousal_support_enabled?: boolean;
  spousal_support_income_declaration_filed?: boolean;
  spousal_support_consent?: boolean;
  spousal_support_do_not_consent?: boolean;
  spousal_support_counter_proposal?: string;

  property_control_enabled?: boolean;
  property_control_consent?: boolean;
  property_control_do_not_consent?: boolean;
  property_control_counter_proposal?: string;

  attorney_fees_enabled?: boolean;
  attorney_fees_income_declaration_filed?: boolean;
  attorney_fees_consent?: boolean;
  attorney_fees_do_not_consent?: boolean;
  attorney_fees_counter_proposal?: string;

  other_orders_enabled?: boolean;
  other_orders_consent?: boolean;
  other_orders_do_not_consent?: boolean;
  other_orders_counter_proposal?: string;

  time_service_enabled?: boolean;
  time_service_consent?: boolean;
  time_service_do_not_consent?: boolean;
  time_service_counter_proposal?: string;

  facts_to_support?: string;
  signature_date?: string;
  signatory_name?: string;
}

interface FL300RequestedData {
  request_child_custody?: boolean;
  request_child_visitation?: boolean;
  request_child_support?: boolean;
  request_spousal_support?: boolean;
  request_property_control?: boolean;
  request_attorney_fees?: boolean;
  request_other?: boolean;
  urgency_enabled?: boolean;
}

interface FL320SummaryProps {
  formData: FL320FormData;
  fl300Data?: FL300RequestedData;
  canEdit: boolean;
  onEditSection: (sectionIndex: number) => void;
}

// Helper to format party names
function formatParty(party: string | undefined): string {
  if (!party) return '';
  return party.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Get response type badge
function getResponseBadge(consented: boolean, doNotConsent: boolean): { label: string; color: string } {
  if (consented) {
    return { label: 'Consented', color: 'bg-green-100 text-green-700' };
  }
  if (doNotConsent) {
    return { label: 'Counter-Proposed', color: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Pending', color: 'bg-gray-100 text-gray-500' };
}

// Get section summary text
function getSectionSummary(sectionId: string, formData: FL320FormData, fl300Data?: FL300RequestedData): string | null {
  switch (sectionId) {
    case 'header': {
      const parts: string[] = [];
      if (formData.petitioner_name) parts.push(formData.petitioner_name);
      if (formData.respondent_name) parts.push(`vs. ${formData.respondent_name}`);
      if (formData.case_number) parts.push(`Case #${formData.case_number}`);
      if (formData.hearing_date) {
        parts.push(`Hearing: ${new Date(formData.hearing_date).toLocaleDateString()}`);
      }
      return parts.length > 0 ? parts.join(' ') : null;
    }

    case 'restraining': {
      if (formData.restraining_no_orders_in_effect) {
        return 'No restraining orders in effect';
      }
      if (formData.restraining_orders_in_effect) {
        return 'Agrees restraining orders are in effect';
      }
      return null;
    }

    case 'custody': {
      if (!fl300Data?.request_child_custody && !fl300Data?.request_child_visitation) {
        return 'Not requested in FL-300';
      }
      if (!formData.custody_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.custody_consent_legal_physical) {
        parts.push('Consents to custody');
      }
      if (formData.custody_consent_visitation) {
        parts.push('Consents to visitation');
      }
      if (formData.custody_do_not_consent) {
        parts.push('Does not consent');
        if (formData.custody_counter_proposal) {
          const preview = formData.custody_counter_proposal.length > 50
            ? formData.custody_counter_proposal.substring(0, 50) + '...'
            : formData.custody_counter_proposal;
          parts.push(`Counter: "${preview}"`);
        }
      }
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'child_support': {
      if (!fl300Data?.request_child_support) return 'Not requested in FL-300';
      if (!formData.child_support_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.child_support_consent) parts.push('Consents');
      if (formData.child_support_consent_guideline) parts.push('Consents to guideline');
      if (formData.child_support_do_not_consent) {
        parts.push('Does not consent');
      }
      if (formData.child_support_income_declaration_filed) parts.push('FL-150 filed');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'spousal_support': {
      if (!fl300Data?.request_spousal_support) return 'Not requested in FL-300';
      if (!formData.spousal_support_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.spousal_support_consent) parts.push('Consents');
      if (formData.spousal_support_do_not_consent) parts.push('Does not consent');
      if (formData.spousal_support_income_declaration_filed) parts.push('FL-150 filed');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'property': {
      if (!fl300Data?.request_property_control) return 'Not requested in FL-300';
      if (!formData.property_control_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.property_control_consent) parts.push('Consents');
      if (formData.property_control_do_not_consent) parts.push('Does not consent');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'attorney_fees': {
      if (!fl300Data?.request_attorney_fees) return 'Not requested in FL-300';
      if (!formData.attorney_fees_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.attorney_fees_consent) parts.push('Consents');
      if (formData.attorney_fees_do_not_consent) parts.push('Does not consent');
      if (formData.attorney_fees_income_declaration_filed) parts.push('FL-150 filed');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'other_orders': {
      if (!fl300Data?.request_other) return 'Not requested in FL-300';
      if (!formData.other_orders_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.other_orders_consent) parts.push('Consents');
      if (formData.other_orders_do_not_consent) parts.push('Does not consent');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'time_service': {
      if (!fl300Data?.urgency_enabled) return 'Not requested in FL-300';
      if (!formData.time_service_enabled) return 'Not addressed';

      const parts: string[] = [];
      if (formData.time_service_consent) parts.push('Consents to shortened time');
      if (formData.time_service_do_not_consent) parts.push('Does not consent');
      return parts.length > 0 ? parts.join(' • ') : 'Response pending';
    }

    case 'facts': {
      const parts: string[] = [];
      if (formData.facts_to_support) {
        const wordCount = formData.facts_to_support.split(/\s+/).length;
        parts.push(`${wordCount} words`);
      }
      if (formData.signature_date) {
        parts.push(`Dated: ${new Date(formData.signature_date).toLocaleDateString()}`);
      }
      if (formData.signatory_name) {
        parts.push(`Signed: ${formData.signatory_name}`);
      }
      return parts.length > 0 ? parts.join(' • ') : null;
    }

    default:
      return null;
  }
}

// Check if section is complete
function isSectionComplete(sectionId: string, formData: FL320FormData, fl300Data?: FL300RequestedData): boolean {
  switch (sectionId) {
    case 'header':
      return Boolean(formData.petitioner_name && formData.respondent_name);

    case 'restraining':
      return Boolean(formData.restraining_no_orders_in_effect || formData.restraining_orders_in_effect);

    case 'custody':
      if (!fl300Data?.request_child_custody && !fl300Data?.request_child_visitation) return true;
      if (!formData.custody_enabled) return true;
      return Boolean(
        formData.custody_consent_legal_physical ||
        formData.custody_consent_visitation ||
        formData.custody_do_not_consent
      );

    case 'child_support':
      if (!fl300Data?.request_child_support) return true;
      if (!formData.child_support_enabled) return true;
      return Boolean(
        formData.child_support_consent ||
        formData.child_support_consent_guideline ||
        formData.child_support_do_not_consent
      );

    case 'spousal_support':
      if (!fl300Data?.request_spousal_support) return true;
      if (!formData.spousal_support_enabled) return true;
      return Boolean(formData.spousal_support_consent || formData.spousal_support_do_not_consent);

    case 'property':
      if (!fl300Data?.request_property_control) return true;
      if (!formData.property_control_enabled) return true;
      return Boolean(formData.property_control_consent || formData.property_control_do_not_consent);

    case 'attorney_fees':
      if (!fl300Data?.request_attorney_fees) return true;
      if (!formData.attorney_fees_enabled) return true;
      return Boolean(formData.attorney_fees_consent || formData.attorney_fees_do_not_consent);

    case 'other_orders':
      if (!fl300Data?.request_other) return true;
      if (!formData.other_orders_enabled) return true;
      return Boolean(formData.other_orders_consent || formData.other_orders_do_not_consent);

    case 'time_service':
      if (!fl300Data?.urgency_enabled) return true;
      if (!formData.time_service_enabled) return true;
      return Boolean(formData.time_service_consent || formData.time_service_do_not_consent);

    case 'facts':
      return Boolean(formData.facts_to_support && formData.signature_date);

    default:
      return false;
  }
}

// Check if section is applicable based on FL-300
function isSectionApplicable(sectionId: string, fl300Data?: FL300RequestedData): boolean {
  switch (sectionId) {
    case 'custody':
      return Boolean(fl300Data?.request_child_custody || fl300Data?.request_child_visitation);
    case 'child_support':
      return Boolean(fl300Data?.request_child_support);
    case 'spousal_support':
      return Boolean(fl300Data?.request_spousal_support);
    case 'property':
      return Boolean(fl300Data?.request_property_control);
    case 'attorney_fees':
      return Boolean(fl300Data?.request_attorney_fees);
    case 'other_orders':
      return Boolean(fl300Data?.request_other);
    case 'time_service':
      return Boolean(fl300Data?.urgency_enabled);
    default:
      return true;
  }
}

// Get consent status for a section
function getSectionConsentStatus(
  sectionId: string,
  formData: FL320FormData
): { consented: boolean; doNotConsent: boolean } {
  switch (sectionId) {
    case 'custody':
      return {
        consented: Boolean(formData.custody_consent_legal_physical || formData.custody_consent_visitation),
        doNotConsent: Boolean(formData.custody_do_not_consent),
      };
    case 'child_support':
      return {
        consented: Boolean(formData.child_support_consent || formData.child_support_consent_guideline),
        doNotConsent: Boolean(formData.child_support_do_not_consent),
      };
    case 'spousal_support':
      return {
        consented: Boolean(formData.spousal_support_consent),
        doNotConsent: Boolean(formData.spousal_support_do_not_consent),
      };
    case 'property':
      return {
        consented: Boolean(formData.property_control_consent),
        doNotConsent: Boolean(formData.property_control_do_not_consent),
      };
    case 'attorney_fees':
      return {
        consented: Boolean(formData.attorney_fees_consent),
        doNotConsent: Boolean(formData.attorney_fees_do_not_consent),
      };
    case 'other_orders':
      return {
        consented: Boolean(formData.other_orders_consent),
        doNotConsent: Boolean(formData.other_orders_do_not_consent),
      };
    case 'time_service':
      return {
        consented: Boolean(formData.time_service_consent),
        doNotConsent: Boolean(formData.time_service_do_not_consent),
      };
    default:
      return { consented: false, doNotConsent: false };
  }
}

// Get detailed section data for viewing
function getSectionDetails(sectionId: string, formData: FL320FormData): React.ReactNode {
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
          <DataRow label="Filing Party" value={formatParty(formData.filing_party)} />
          <DataRow label="Petitioner" value={formData.petitioner_name} />
          <DataRow label="Respondent" value={formData.respondent_name} />
          <DataRow label="Case Number" value={formData.case_number} />
          <DataRow label="Court County" value={formData.court_county} />
          <DataRow label="Hearing Date" value={formData.hearing_date ? new Date(formData.hearing_date).toLocaleDateString() : null} />
          <DataRow label="Hearing Time" value={formData.hearing_time} />
          <DataRow label="Hearing Dept/Room" value={formData.hearing_dept_room} />
        </div>
      );

    case 'restraining':
      return (
        <div className="space-y-1">
          <DataRow label="No Orders in Effect" value={formData.restraining_no_orders_in_effect ? 'Yes' : 'No'} />
          <DataRow label="Orders in Effect" value={formData.restraining_orders_in_effect ? 'Yes' : 'No'} />
        </div>
      );

    case 'custody':
      return (
        <div className="space-y-1">
          <DataRow label="Custody Response Enabled" value={formData.custody_enabled ? 'Yes' : 'No'} />
          <DataRow label="Consent to Legal/Physical Custody" value={formData.custody_consent_legal_physical ? 'Yes' : 'No'} />
          <DataRow label="Consent to Visitation" value={formData.custody_consent_visitation ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.custody_do_not_consent ? 'Yes' : 'No'} />
          {formData.custody_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.custody_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'child_support':
      return (
        <div className="space-y-1">
          <DataRow label="Child Support Response Enabled" value={formData.child_support_enabled ? 'Yes' : 'No'} />
          <DataRow label="Income Declaration Filed" value={formData.child_support_income_declaration_filed ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.child_support_consent ? 'Yes' : 'No'} />
          <DataRow label="Consent to Guideline" value={formData.child_support_consent_guideline ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.child_support_do_not_consent ? 'Yes' : 'No'} />
          {formData.child_support_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.child_support_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'spousal_support':
      return (
        <div className="space-y-1">
          <DataRow label="Spousal Support Response Enabled" value={formData.spousal_support_enabled ? 'Yes' : 'No'} />
          <DataRow label="Income Declaration Filed" value={formData.spousal_support_income_declaration_filed ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.spousal_support_consent ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.spousal_support_do_not_consent ? 'Yes' : 'No'} />
          {formData.spousal_support_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.spousal_support_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'property':
      return (
        <div className="space-y-1">
          <DataRow label="Property Control Response Enabled" value={formData.property_control_enabled ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.property_control_consent ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.property_control_do_not_consent ? 'Yes' : 'No'} />
          {formData.property_control_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.property_control_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'attorney_fees':
      return (
        <div className="space-y-1">
          <DataRow label="Attorney Fees Response Enabled" value={formData.attorney_fees_enabled ? 'Yes' : 'No'} />
          <DataRow label="Income Declaration Filed" value={formData.attorney_fees_income_declaration_filed ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.attorney_fees_consent ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.attorney_fees_do_not_consent ? 'Yes' : 'No'} />
          {formData.attorney_fees_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.attorney_fees_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'other_orders':
      return (
        <div className="space-y-1">
          <DataRow label="Other Orders Response Enabled" value={formData.other_orders_enabled ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.other_orders_consent ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.other_orders_do_not_consent ? 'Yes' : 'No'} />
          {formData.other_orders_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.other_orders_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'time_service':
      return (
        <div className="space-y-1">
          <DataRow label="Time for Service Response Enabled" value={formData.time_service_enabled ? 'Yes' : 'No'} />
          <DataRow label="Consent" value={formData.time_service_consent ? 'Yes' : 'No'} />
          <DataRow label="Do Not Consent" value={formData.time_service_do_not_consent ? 'Yes' : 'No'} />
          {formData.time_service_counter_proposal && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Counter Proposal:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{formData.time_service_counter_proposal}</p>
            </div>
          )}
        </div>
      );

    case 'facts':
      return (
        <div className="space-y-1">
          <DataRow label="Signature Date" value={formData.signature_date ? new Date(formData.signature_date).toLocaleDateString() : null} />
          <DataRow label="Signatory" value={formData.signatory_name} />
          {formData.facts_to_support && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Facts to Support Response:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">{formData.facts_to_support}</p>
            </div>
          )}
        </div>
      );

    default:
      return <p className="text-gray-500 text-sm">No details available</p>;
  }
}

export default function FL320Summary({ formData, fl300Data, canEdit, onEditSection }: FL320SummaryProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const applicableSections = FL320_SECTIONS.filter((s) => isSectionApplicable(s.id, fl300Data));
  const completedSections = applicableSections.filter((s) => isSectionComplete(s.id, formData, fl300Data)).length;
  const totalSections = applicableSections.length;
  const completionPercentage = Math.round((completedSections / totalSections) * 100);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Count consent stats
  const consentableSections = ['custody', 'child_support', 'spousal_support', 'property', 'attorney_fees', 'other_orders', 'time_service'];
  const consentStats = consentableSections.reduce(
    (acc, sectionId) => {
      if (!isSectionApplicable(sectionId, fl300Data)) return acc;
      const status = getSectionConsentStatus(sectionId, formData);
      if (status.consented) acc.consented++;
      if (status.doNotConsent) acc.counterProposed++;
      acc.total++;
      return acc;
    },
    { consented: 0, counterProposed: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">FL-320 Summary</CardTitle>
          </div>
          <CardDescription>Responsive Declaration to Request for Order</CardDescription>
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
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Consent Summary */}
          {consentStats.total > 0 && (
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-2">Response Summary</div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Consented: {consentStats.consented}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>Counter-Proposed: {consentStats.counterProposed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-300" />
                  <span>Pending: {consentStats.total - consentStats.consented - consentStats.counterProposed}</span>
                </div>
              </div>
            </div>
          )}

          {/* Party Names */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Filed by:</span>{' '}
              <span className="font-medium">{formatParty(formData.filing_party) || 'Respondent'}</span>
            </div>
            <div>
              <span className="text-gray-500">Case:</span>{' '}
              <span className="font-medium">{formData.case_number || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Petitioner:</span>{' '}
              <span className="font-medium">{formData.petitioner_name || 'Not set'}</span>
            </div>
            <div>
              <span className="text-gray-500">Respondent:</span>{' '}
              <span className="font-medium">{formData.respondent_name || 'Not set'}</span>
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
                {formData.hearing_dept_room && (
                  <div>
                    <span className="text-gray-500">Dept:</span>{' '}
                    <span className="font-medium">{formData.hearing_dept_room}</span>
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
              : 'Click on a section to view details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FL320_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isApplicable = isSectionApplicable(section.id, fl300Data);
              const isComplete = isSectionComplete(section.id, formData, fl300Data);
              const summary = getSectionSummary(section.id, formData, fl300Data);
              const consentStatus = getSectionConsentStatus(section.id, formData);
              const responseBadge = getResponseBadge(consentStatus.consented, consentStatus.doNotConsent);
              const isExpanded = expandedSection === section.id;

              return (
                <div
                  key={section.id}
                  className={`rounded-lg border transition-colors ${
                    !isApplicable
                      ? 'bg-gray-50/30 border-gray-100 opacity-60'
                      : isComplete
                      ? 'bg-green-50/50 border-green-200'
                      : 'bg-gray-50/50 border-gray-200'
                  }`}
                >
                  {/* Section Header - Clickable to expand */}
                  <div
                    className={`p-4 flex items-start justify-between gap-4 ${isApplicable ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
                    onClick={() => isApplicable && toggleSection(section.id)}
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
                        {isApplicable && (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 ml-1" />
                          )
                        )}
                      </div>
                      {!isExpanded && summary && (
                        <p className="text-sm text-gray-600 mt-2 ml-10 line-clamp-2">{summary}</p>
                      )}
                      {!isExpanded && !summary && !isComplete && isApplicable && (
                        <p className="text-sm text-gray-400 mt-2 ml-10 italic">Not yet completed</p>
                      )}
                      {!isApplicable && (
                        <p className="text-sm text-gray-400 mt-2 ml-10 italic">Not requested in FL-300</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        Item {section.formItems.join(', ')}
                      </Badge>
                      {isApplicable && isComplete && ['custody', 'child_support', 'spousal_support', 'property', 'attorney_fees', 'other_orders', 'time_service'].includes(section.id) && (
                        <Badge className={responseBadge.color}>
                          {responseBadge.label}
                        </Badge>
                      )}
                      {isComplete && isApplicable && !['custody', 'child_support', 'spousal_support', 'property', 'attorney_fees', 'other_orders', 'time_service'].includes(section.id) && (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          Complete
                        </Badge>
                      )}
                      {!isApplicable && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-400">
                          N/A
                        </Badge>
                      )}
                      {isApplicable && (
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
                      )}
                      {canEdit && isApplicable && (
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
                  {isExpanded && isApplicable && (
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

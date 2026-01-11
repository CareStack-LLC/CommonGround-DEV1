'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Scale,
  DollarSign,
  Home,
  Gavel,
  AlertTriangle,
  Clock,
  CheckCircle,
  Pencil,
  Sparkles,
  Shield,
  HelpCircle,
  LucideIcon,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react';

// FL-300 Section definitions matching the wizard
interface FL300Section {
  id: string;
  title: string;
  icon: LucideIcon;
  formItems: string[];
  sectionIndex: number;
}

const FL300_SECTIONS: FL300Section[] = [
  { id: 'header', title: 'Case Information', icon: FileText, formItems: ['Header'], sectionIndex: 0 },
  { id: 'request_type', title: 'Request Type', icon: HelpCircle, formItems: ['Request Type'], sectionIndex: 1 },
  { id: 'restraining', title: '1. Restraining Orders', icon: Shield, formItems: ['1'], sectionIndex: 2 },
  { id: 'custody', title: '2. Child Custody/Visitation', icon: Users, formItems: ['2'], sectionIndex: 3 },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, formItems: ['3'], sectionIndex: 4 },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, formItems: ['4'], sectionIndex: 5 },
  { id: 'property', title: '5. Property Control', icon: Home, formItems: ['5'], sectionIndex: 6 },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Gavel, formItems: ['6'], sectionIndex: 7 },
  { id: 'other_orders', title: '7. Other Orders', icon: FileText, formItems: ['7'], sectionIndex: 8 },
  { id: 'urgency', title: '8. Time for Service', icon: Clock, formItems: ['8'], sectionIndex: 9 },
  { id: 'facts', title: '9. Facts to Support', icon: AlertTriangle, formItems: ['9'], sectionIndex: 10 },
];

interface FL300Child {
  name: string;
  date_of_birth?: string;
  age?: number;
  physical_custody_to?: string;
  legal_custody_to?: string;
}

interface FL300ChildSupportRequest {
  child_name: string;
  child_age?: number;
  use_guideline: boolean;
  monthly_amount_requested?: number;
}

interface FL300DebtPayment {
  pay_to: string;
  for_description: string;
  amount: number;
  due_date?: string;
}

interface FL300FormData {
  filing_party?: string;
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;
  court_county?: string;

  is_request_for_order?: boolean;
  is_change_request?: boolean;
  is_temporary_emergency?: boolean;
  request_child_custody?: boolean;
  request_child_visitation?: boolean;
  request_child_support?: boolean;
  request_spousal_support?: boolean;
  request_property_control?: boolean;
  request_attorney_fees?: boolean;
  request_other?: boolean;
  request_other_specify?: string;

  restraining_order_info?: {
    has_existing_orders: boolean;
    between_parties: string[];
  };

  custody_visitation_enabled?: boolean;
  custody_request_temporary_emergency?: boolean;
  children?: FL300Child[];
  custody_orders_for?: string;
  custody_best_interest_reasons?: string;
  custody_is_change?: boolean;

  child_support_enabled?: boolean;
  child_support_requests?: FL300ChildSupportRequest[];
  child_support_is_change?: boolean;
  child_support_income_declaration_filed?: boolean;

  spousal_support_enabled?: boolean;
  spousal_support_amount_monthly?: number;
  spousal_support_change?: boolean;
  spousal_support_end?: boolean;
  spousal_support_income_declaration_filed?: boolean;

  property_control_enabled?: boolean;
  property_request_temporary_emergency?: boolean;
  property_exclusive_use_party?: string;
  property_type?: string;
  property_description?: string;
  property_debt_payments?: FL300DebtPayment[];
  property_is_change?: boolean;

  attorney_fees_enabled?: boolean;
  attorney_fees_amount?: number;
  attorney_fees_income_declaration_filed?: boolean;

  other_orders_enabled?: boolean;
  other_orders_specify?: string;

  urgency_enabled?: boolean;
  urgency_service_days?: number;
  urgency_hearing_sooner?: boolean;
  urgency_reasons?: string;

  facts_to_support?: string;
  signature_date?: string;
  signatory_name?: string;
}

interface FL300SummaryProps {
  formData: FL300FormData;
  canEdit: boolean;
  onEditSection: (sectionIndex: number) => void;
}

// Helper to format party names
function formatParty(party: string | undefined): string {
  if (!party) return '';
  return party.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

// Get section summary text
function getSectionSummary(sectionId: string, formData: FL300FormData): string | null {
  switch (sectionId) {
    case 'header': {
      const parts: string[] = [];
      if (formData.petitioner_name) parts.push(formData.petitioner_name);
      if (formData.respondent_name) parts.push(`vs. ${formData.respondent_name}`);
      if (formData.case_number) parts.push(`Case #${formData.case_number}`);
      if (formData.court_county) parts.push(formData.court_county);
      return parts.length > 0 ? parts.join(' ') : null;
    }

    case 'request_type': {
      const requests: string[] = [];
      if (formData.request_child_custody) requests.push('Child Custody');
      if (formData.request_child_visitation) requests.push('Visitation');
      if (formData.request_child_support) requests.push('Child Support');
      if (formData.request_spousal_support) requests.push('Spousal Support');
      if (formData.request_property_control) requests.push('Property');
      if (formData.request_attorney_fees) requests.push('Attorney Fees');
      if (formData.request_other) requests.push('Other');

      const type: string[] = [];
      if (formData.is_request_for_order) type.push('Request for Order');
      if (formData.is_change_request) type.push('Change Request');
      if (formData.is_temporary_emergency) type.push('Emergency');

      return requests.length > 0 ? `${type.join(', ')}: ${requests.join(', ')}` : null;
    }

    case 'restraining': {
      const info = formData.restraining_order_info;
      if (!info?.has_existing_orders) return 'No existing restraining orders';
      return `Existing orders between: ${info.between_parties.map(formatParty).join(', ')}`;
    }

    case 'custody': {
      if (!formData.request_child_custody && !formData.request_child_visitation) {
        return 'Not requested';
      }
      const parts: string[] = [];
      const children = formData.children || [];
      if (children.length > 0) {
        parts.push(`${children.length} child${children.length > 1 ? 'ren' : ''}`);
      }
      if (formData.custody_orders_for) {
        parts.push(`Orders for: ${formData.custody_orders_for}`);
      }
      if (formData.custody_request_temporary_emergency) {
        parts.push('Emergency orders requested');
      }
      if (formData.custody_is_change) {
        parts.push('Modifying existing order');
      }
      return parts.length > 0 ? parts.join(' • ') : 'Custody/visitation requested';
    }

    case 'child_support': {
      if (!formData.request_child_support) return 'Not requested';
      const parts: string[] = [];
      const requests = formData.child_support_requests || [];
      if (requests.length > 0) {
        parts.push(`${requests.length} child${requests.length > 1 ? 'ren' : ''}`);
        const totalAmount = requests.reduce((sum, r) => sum + (r.monthly_amount_requested || 0), 0);
        if (totalAmount > 0) {
          parts.push(`$${totalAmount.toLocaleString()}/month requested`);
        }
        const guidelineCount = requests.filter((r) => r.use_guideline).length;
        if (guidelineCount > 0) {
          parts.push(`${guidelineCount} using guideline`);
        }
      }
      if (formData.child_support_is_change) {
        parts.push('Modifying existing order');
      }
      return parts.length > 0 ? parts.join(' • ') : 'Child support requested';
    }

    case 'spousal_support': {
      if (!formData.request_spousal_support) return 'Not requested';
      const parts: string[] = [];
      if (formData.spousal_support_amount_monthly) {
        parts.push(`$${formData.spousal_support_amount_monthly.toLocaleString()}/month`);
      }
      if (formData.spousal_support_change) parts.push('Change request');
      if (formData.spousal_support_end) parts.push('Termination request');
      return parts.length > 0 ? parts.join(' • ') : 'Spousal support requested';
    }

    case 'property': {
      if (!formData.request_property_control) return 'Not requested';
      const parts: string[] = [];
      if (formData.property_exclusive_use_party) {
        parts.push(`Exclusive use to ${formatParty(formData.property_exclusive_use_party)}`);
      }
      if (formData.property_type) {
        parts.push(formData.property_type === 'own_buying' ? 'Owned property' : 'Rented property');
      }
      const debts = formData.property_debt_payments || [];
      if (debts.length > 0) {
        parts.push(`${debts.length} debt payment${debts.length > 1 ? 's' : ''}`);
      }
      if (formData.property_request_temporary_emergency) {
        parts.push('Emergency');
      }
      return parts.length > 0 ? parts.join(' • ') : 'Property control requested';
    }

    case 'attorney_fees': {
      if (!formData.request_attorney_fees) return 'Not requested';
      const parts: string[] = [];
      if (formData.attorney_fees_amount) {
        parts.push(`$${formData.attorney_fees_amount.toLocaleString()} requested`);
      }
      if (formData.attorney_fees_income_declaration_filed) {
        parts.push('FL-150 filed');
      }
      return parts.length > 0 ? parts.join(' • ') : 'Attorney fees requested';
    }

    case 'other_orders': {
      if (!formData.other_orders_enabled) return 'None';
      if (formData.other_orders_specify) {
        return formData.other_orders_specify.length > 100
          ? formData.other_orders_specify.substring(0, 100) + '...'
          : formData.other_orders_specify;
      }
      return 'Other orders requested';
    }

    case 'urgency': {
      if (!formData.urgency_enabled) return 'Standard time for service';
      const parts: string[] = [];
      if (formData.urgency_service_days) {
        parts.push(`${formData.urgency_service_days} days service`);
      }
      if (formData.urgency_hearing_sooner) {
        parts.push('Earlier hearing requested');
      }
      return parts.length > 0 ? parts.join(' • ') : 'Shortened time requested';
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
function isSectionComplete(sectionId: string, formData: FL300FormData): boolean {
  switch (sectionId) {
    case 'header':
      return Boolean(formData.petitioner_name && formData.respondent_name);

    case 'request_type':
      return Boolean(
        formData.request_child_custody ||
          formData.request_child_visitation ||
          formData.request_child_support ||
          formData.request_spousal_support ||
          formData.request_property_control ||
          formData.request_attorney_fees ||
          formData.request_other
      );

    case 'restraining':
      // Always complete - either has orders or doesn't
      return true;

    case 'custody':
      if (!formData.request_child_custody && !formData.request_child_visitation) {
        return true; // Not applicable
      }
      return Boolean(formData.children && formData.children.length > 0);

    case 'child_support':
      if (!formData.request_child_support) return true; // Not applicable
      return Boolean(formData.child_support_requests && formData.child_support_requests.length > 0);

    case 'spousal_support':
      if (!formData.request_spousal_support) return true; // Not applicable
      return Boolean(formData.spousal_support_amount_monthly || formData.spousal_support_change || formData.spousal_support_end);

    case 'property':
      if (!formData.request_property_control) return true; // Not applicable
      return Boolean(formData.property_exclusive_use_party || (formData.property_debt_payments && formData.property_debt_payments.length > 0));

    case 'attorney_fees':
      if (!formData.request_attorney_fees) return true; // Not applicable
      return Boolean(formData.attorney_fees_amount);

    case 'other_orders':
      // Always complete - either has others or doesn't
      return true;

    case 'urgency':
      // Always complete - either urgent or not
      return true;

    case 'facts':
      return Boolean(formData.facts_to_support && formData.signature_date);

    default:
      return false;
  }
}

// Check if section is applicable
function isSectionApplicable(sectionId: string, formData: FL300FormData): boolean {
  switch (sectionId) {
    case 'custody':
      return Boolean(formData.request_child_custody || formData.request_child_visitation);
    case 'child_support':
      return Boolean(formData.request_child_support);
    case 'spousal_support':
      return Boolean(formData.request_spousal_support);
    case 'property':
      return Boolean(formData.request_property_control);
    case 'attorney_fees':
      return Boolean(formData.request_attorney_fees);
    default:
      return true;
  }
}

// Get detailed section data for viewing
function getSectionDetails(sectionId: string, formData: FL300FormData): React.ReactNode {
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
          {formData.other_parent_party_name && (
            <DataRow label="Other Party" value={formData.other_parent_party_name} />
          )}
          <DataRow label="Case Number" value={formData.case_number} />
          <DataRow label="Court County" value={formData.court_county} />
        </div>
      );

    case 'request_type':
      return (
        <div className="space-y-1">
          <DataRow label="Request for Order" value={formData.is_request_for_order ? 'Yes' : 'No'} />
          <DataRow label="Change Request" value={formData.is_change_request ? 'Yes' : 'No'} />
          <DataRow label="Temporary Emergency" value={formData.is_temporary_emergency ? 'Yes' : 'No'} />
          <div className="pt-2 mt-2 border-t">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Requested Orders:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {formData.request_child_custody && <Badge variant="secondary">Child Custody</Badge>}
              {formData.request_child_visitation && <Badge variant="secondary">Visitation</Badge>}
              {formData.request_child_support && <Badge variant="secondary">Child Support</Badge>}
              {formData.request_spousal_support && <Badge variant="secondary">Spousal Support</Badge>}
              {formData.request_property_control && <Badge variant="secondary">Property</Badge>}
              {formData.request_attorney_fees && <Badge variant="secondary">Attorney Fees</Badge>}
              {formData.request_other && <Badge variant="secondary">Other</Badge>}
            </div>
          </div>
          {formData.request_other && formData.request_other_specify && (
            <DataRow label="Other Specify" value={formData.request_other_specify} />
          )}
        </div>
      );

    case 'restraining':
      const info = formData.restraining_order_info;
      return (
        <div className="space-y-1">
          <DataRow label="Existing Orders" value={info?.has_existing_orders ? 'Yes' : 'No'} />
          {info?.has_existing_orders && info.between_parties?.length > 0 && (
            <DataRow label="Between Parties" value={info.between_parties.map(formatParty).join(', ')} />
          )}
        </div>
      );

    case 'custody':
      return (
        <div className="space-y-2">
          <DataRow label="Emergency Request" value={formData.custody_request_temporary_emergency ? 'Yes' : 'No'} />
          <DataRow label="Orders For" value={formData.custody_orders_for} />
          <DataRow label="Modifying Existing Order" value={formData.custody_is_change ? 'Yes' : 'No'} />
          {formData.children && formData.children.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Children ({formData.children.length}):</span>
              {formData.children.map((child, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded mb-2 text-sm">
                  <div className="font-medium">{child.name}</div>
                  {child.date_of_birth && <div className="text-gray-500">DOB: {child.date_of_birth}</div>}
                  {child.age && <div className="text-gray-500">Age: {child.age}</div>}
                  {child.physical_custody_to && <div className="text-gray-500">Physical Custody: {formatParty(child.physical_custody_to)}</div>}
                  {child.legal_custody_to && <div className="text-gray-500">Legal Custody: {formatParty(child.legal_custody_to)}</div>}
                </div>
              ))}
            </div>
          )}
          {formData.custody_best_interest_reasons && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Best Interest Reasons:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.custody_best_interest_reasons}</p>
            </div>
          )}
        </div>
      );

    case 'child_support':
      return (
        <div className="space-y-2">
          <DataRow label="Modifying Existing Order" value={formData.child_support_is_change ? 'Yes' : 'No'} />
          <DataRow label="Income Declaration Filed" value={formData.child_support_income_declaration_filed ? 'Yes' : 'No'} />
          {formData.child_support_requests && formData.child_support_requests.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Support Requests ({formData.child_support_requests.length}):</span>
              {formData.child_support_requests.map((req, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded mb-2 text-sm">
                  <div className="font-medium">{req.child_name}</div>
                  {req.child_age && <div className="text-gray-500">Age: {req.child_age}</div>}
                  <div className="text-gray-500">Use Guideline: {req.use_guideline ? 'Yes' : 'No'}</div>
                  {req.monthly_amount_requested && (
                    <div className="text-gray-500">Amount: ${req.monthly_amount_requested.toLocaleString()}/month</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'spousal_support':
      return (
        <div className="space-y-1">
          <DataRow label="Monthly Amount" value={formData.spousal_support_amount_monthly ? `$${formData.spousal_support_amount_monthly.toLocaleString()}` : null} />
          <DataRow label="Change Existing Order" value={formData.spousal_support_change ? 'Yes' : 'No'} />
          <DataRow label="End Support" value={formData.spousal_support_end ? 'Yes' : 'No'} />
          <DataRow label="Income Declaration Filed" value={formData.spousal_support_income_declaration_filed ? 'Yes' : 'No'} />
        </div>
      );

    case 'property':
      return (
        <div className="space-y-2">
          <DataRow label="Emergency Request" value={formData.property_request_temporary_emergency ? 'Yes' : 'No'} />
          <DataRow label="Exclusive Use To" value={formatParty(formData.property_exclusive_use_party)} />
          <DataRow label="Property Type" value={formData.property_type === 'own_buying' ? 'Owned/Buying' : formData.property_type === 'lease_rent' ? 'Lease/Rent' : null} />
          <DataRow label="Property Description" value={formData.property_description} />
          <DataRow label="Modifying Existing Order" value={formData.property_is_change ? 'Yes' : 'No'} />
          {formData.property_debt_payments && formData.property_debt_payments.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Debt Payments ({formData.property_debt_payments.length}):</span>
              {formData.property_debt_payments.map((debt, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded mb-2 text-sm">
                  <div className="font-medium">Pay to: {debt.pay_to}</div>
                  <div className="text-gray-500">For: {debt.for_description}</div>
                  <div className="text-gray-500">Amount: ${debt.amount.toLocaleString()}</div>
                  {debt.due_date && <div className="text-gray-500">Due: {debt.due_date}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'attorney_fees':
      return (
        <div className="space-y-1">
          <DataRow label="Amount Requested" value={formData.attorney_fees_amount ? `$${formData.attorney_fees_amount.toLocaleString()}` : null} />
          <DataRow label="Income Declaration Filed" value={formData.attorney_fees_income_declaration_filed ? 'Yes' : 'No'} />
        </div>
      );

    case 'other_orders':
      return (
        <div className="space-y-1">
          <DataRow label="Other Orders Requested" value={formData.other_orders_enabled ? 'Yes' : 'No'} />
          {formData.other_orders_specify && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Details:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.other_orders_specify}</p>
            </div>
          )}
        </div>
      );

    case 'urgency':
      return (
        <div className="space-y-1">
          <DataRow label="Shortened Time Requested" value={formData.urgency_enabled ? 'Yes' : 'No'} />
          <DataRow label="Service Days" value={formData.urgency_service_days} />
          <DataRow label="Earlier Hearing" value={formData.urgency_hearing_sooner ? 'Yes' : 'No'} />
          {formData.urgency_reasons && (
            <div className="pt-2 mt-2 border-t">
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Reasons:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{formData.urgency_reasons}</p>
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
              <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Facts to Support Request:</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">{formData.facts_to_support}</p>
            </div>
          )}
        </div>
      );

    default:
      return <p className="text-gray-500 text-sm">No details available</p>;
  }
}

export default function FL300Summary({ formData, canEdit, onEditSection }: FL300SummaryProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const applicableSections = FL300_SECTIONS.filter((s) => isSectionApplicable(s.id, formData));
  const completedSections = applicableSections.filter((s) => isSectionComplete(s.id, formData)).length;
  const totalSections = applicableSections.length;
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
            <CardTitle className="text-lg">FL-300 Summary</CardTitle>
          </div>
          <CardDescription>Request for Order - California Family Court</CardDescription>
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
              <span className="text-gray-500">Filed by:</span>{' '}
              <span className="font-medium">{formatParty(formData.filing_party) || 'Not set'}</span>
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
        </CardContent>
      </Card>

      {/* Section Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Form Sections</CardTitle>
          <CardDescription>
            {canEdit
              ? 'Click Edit to modify any section'
              : 'This form has been submitted and cannot be edited'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FL300_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isApplicable = isSectionApplicable(section.id, formData);
              const isComplete = isSectionComplete(section.id, formData);
              const summary = getSectionSummary(section.id, formData);
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
                        <p className="text-sm text-gray-400 mt-2 ml-10 italic">Not applicable (not requested)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        Item {section.formItems.join(', ')}
                      </Badge>
                      {isComplete && isApplicable && (
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

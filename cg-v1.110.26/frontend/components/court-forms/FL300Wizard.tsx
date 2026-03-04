'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ChevronRight,
  ChevronLeft,
  Save,
  Check,
  ArrowLeft,
  Shield,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

// Types matching official FL-300 form (CA Judicial Council, Rev. July 1, 2025)
interface FL300Child {
  name: string;
  date_of_birth?: string;
  age?: number;
  physical_custody_to?: string;
  legal_custody_to?: string;
}

interface FL300RestrainingOrderInfo {
  has_existing_orders: boolean;
  between_parties: string[];
  criminal_order?: { county_state?: string; case_number?: string };
  family_order?: { county_state?: string; case_number?: string };
  juvenile_order?: { county_state?: string; case_number?: string };
  other_order?: { county_state?: string; case_number?: string };
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
  // Header Section
  filing_party: 'petitioner' | 'respondent' | 'other_parent_party';
  party_name?: string;
  firm_name?: string;
  street_address?: string;
  city?: string;
  state: string;
  zip_code?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  attorney_for?: string;
  state_bar_number?: string;

  // Court Information
  court_county?: string;
  court_street_address?: string;
  court_mailing_address?: string;
  court_city_zip?: string;
  court_branch_name?: string;

  // Case Parties
  petitioner_name: string;
  respondent_name: string;
  other_parent_party_name?: string;
  case_number?: string;

  // Request Type Checkboxes
  is_request_for_order: boolean;
  is_change_request: boolean;
  is_temporary_emergency: boolean;
  request_child_custody: boolean;
  request_child_visitation: boolean;
  request_child_support: boolean;
  request_spousal_support: boolean;
  request_property_control: boolean;
  request_attorney_fees: boolean;
  request_other: boolean;
  request_other_specify?: string;

  // Notice of Hearing
  notice_to_name?: string;
  notice_to_party?: string;
  notice_to_other_specify?: string;
  hearing_date?: string;
  hearing_time?: string;
  hearing_dept?: string;
  hearing_room?: string;
  hearing_address_same: boolean;
  hearing_address_other?: string;

  // Item 1: Restraining Order Information
  restraining_order_info?: FL300RestrainingOrderInfo;

  // Item 2: Child Custody/Visitation
  custody_visitation_enabled: boolean;
  custody_request_temporary_emergency: boolean;
  children: FL300Child[];
  custody_orders_for?: string;
  custody_orders_in_attached_forms: boolean;
  custody_attached_forms: string[];
  custody_orders_as_follows: boolean;
  custody_orders_specify?: string;
  custody_attachment_2b: boolean;
  custody_best_interest_reasons?: string;
  custody_attachment_2c: boolean;
  custody_is_change: boolean;
  custody_change_custody_date?: string;
  custody_change_custody_ordered?: string;
  custody_change_visitation_date?: string;
  custody_change_visitation_ordered?: string;
  custody_attachment_2d: boolean;

  // Item 3: Child Support
  child_support_enabled: boolean;
  child_support_requests: FL300ChildSupportRequest[];
  child_support_attachment_3a: boolean;
  child_support_is_change: boolean;
  child_support_change_date?: string;
  child_support_change_ordered?: string;
  child_support_income_declaration_filed: boolean;
  child_support_financial_statement_filed: boolean;
  child_support_reasons?: string;
  child_support_attachment_3d: boolean;

  // Item 4: Spousal Support
  spousal_support_enabled: boolean;
  spousal_support_amount_monthly?: number;
  spousal_support_change: boolean;
  spousal_support_end: boolean;
  spousal_support_order_date?: string;
  spousal_support_current_amount?: number;
  spousal_support_post_judgment: boolean;
  spousal_support_fl157_attached: boolean;
  spousal_support_income_declaration_filed: boolean;
  spousal_support_reasons?: string;
  spousal_support_attachment_4e: boolean;

  // Item 5: Property Control
  property_control_enabled: boolean;
  property_request_temporary_emergency: boolean;
  property_exclusive_use_party?: string;
  property_type?: string;
  property_description?: string;
  property_debt_payments: FL300DebtPayment[];
  property_is_change: boolean;
  property_change_date?: string;
  property_reasons?: string;
  property_attachment_5d: boolean;

  // Item 6: Attorney's Fees
  attorney_fees_enabled: boolean;
  attorney_fees_amount?: number;
  attorney_fees_income_declaration_filed: boolean;
  attorney_fees_fl319_attached: boolean;
  attorney_fees_fl158_attached: boolean;

  // Item 7: Other Orders
  other_orders_enabled: boolean;
  other_orders_specify?: string;
  other_orders_attachment_7: boolean;

  // Item 8: Urgency
  urgency_enabled: boolean;
  urgency_service_days?: number;
  urgency_hearing_sooner: boolean;
  urgency_reasons?: string;
  urgency_attachment_8: boolean;

  // Item 9: Facts to Support
  facts_to_support?: string;
  facts_attachment_9: boolean;

  // Signature
  signature_date?: string;
  signatory_name?: string;
}

interface FL300WizardProps {
  initialData?: Partial<FL300FormData>;
  caseData: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
    children?: { first_name: string; last_name: string; date_of_birth: string }[];
  };
  onSave: (data: FL300FormData) => Promise<void>;
  onSubmit: (data: FL300FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number;
  onBack?: () => void;
}

interface WizardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: string[];
}

const WIZARD_SECTIONS: WizardSection[] = [
  { id: 'header', title: 'Case Information', icon: FileText, items: ['Header'] },
  { id: 'request_type', title: 'Request Type', icon: HelpCircle, items: ['Request Type'] },
  { id: 'restraining', title: '1. Restraining Orders', icon: Shield, items: ['1'] },
  { id: 'custody', title: '2. Child Custody/Visitation', icon: Users, items: ['2'] },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, items: ['3'] },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, items: ['4'] },
  { id: 'property', title: '5. Property Control', icon: Home, items: ['5'] },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Gavel, items: ['6'] },
  { id: 'other_orders', title: '7. Other Orders', icon: FileText, items: ['7'] },
  { id: 'urgency', title: '8. Time for Service', icon: Clock, items: ['8'] },
  { id: 'facts', title: '9. Facts to Support', icon: AlertTriangle, items: ['9'] },
];

function calculateAge(birthdate: string): number {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function FL300Wizard({
  initialData,
  caseData,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL300WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);
  const [formData, setFormData] = useState<FL300FormData>({
    filing_party: 'petitioner',
    state: 'CA',
    petitioner_name: caseData.petitioner_name || '',
    respondent_name: caseData.respondent_name || '',
    case_number: caseData.case_number || '',

    is_request_for_order: true,
    is_change_request: false,
    is_temporary_emergency: false,
    request_child_custody: false,
    request_child_visitation: false,
    request_child_support: false,
    request_spousal_support: false,
    request_property_control: false,
    request_attorney_fees: false,
    request_other: false,

    hearing_address_same: true,

    custody_visitation_enabled: false,
    custody_request_temporary_emergency: false,
    children: caseData.children?.map((c) => ({
      name: `${c.first_name} ${c.last_name}`,
      date_of_birth: c.date_of_birth,
      age: calculateAge(c.date_of_birth),
    })) || [],
    custody_orders_in_attached_forms: false,
    custody_attached_forms: [],
    custody_orders_as_follows: false,
    custody_attachment_2b: false,
    custody_attachment_2c: false,
    custody_is_change: false,
    custody_attachment_2d: false,

    child_support_enabled: false,
    child_support_requests: [],
    child_support_attachment_3a: false,
    child_support_is_change: false,
    child_support_income_declaration_filed: false,
    child_support_financial_statement_filed: false,
    child_support_attachment_3d: false,

    spousal_support_enabled: false,
    spousal_support_change: false,
    spousal_support_end: false,
    spousal_support_post_judgment: false,
    spousal_support_fl157_attached: false,
    spousal_support_income_declaration_filed: false,
    spousal_support_attachment_4e: false,

    property_control_enabled: false,
    property_request_temporary_emergency: false,
    property_debt_payments: [],
    property_is_change: false,
    property_attachment_5d: false,

    attorney_fees_enabled: false,
    attorney_fees_income_declaration_filed: false,
    attorney_fees_fl319_attached: false,
    attorney_fees_fl158_attached: false,

    other_orders_enabled: false,
    other_orders_attachment_7: false,

    urgency_enabled: false,
    urgency_hearing_sooner: false,
    urgency_attachment_8: false,

    facts_attachment_9: false,

    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSave();
    if (currentSection < WIZARD_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const renderSection = () => {
    switch (WIZARD_SECTIONS[currentSection].id) {
      case 'header':
        return <HeaderSection formData={formData} updateField={updateField} />;
      case 'request_type':
        return <RequestTypeSection formData={formData} updateField={updateField} />;
      case 'restraining':
        return <RestrainingSection formData={formData} updateField={updateField} />;
      case 'custody':
        return <CustodySection formData={formData} updateField={updateField} />;
      case 'child_support':
        return <ChildSupportSection formData={formData} updateField={updateField} />;
      case 'spousal_support':
        return <SpousalSupportSection formData={formData} updateField={updateField} />;
      case 'property':
        return <PropertySection formData={formData} updateField={updateField} />;
      case 'attorney_fees':
        return <AttorneyFeesSection formData={formData} updateField={updateField} />;
      case 'other_orders':
        return <OtherOrdersSection formData={formData} updateField={updateField} />;
      case 'urgency':
        return <UrgencySection formData={formData} updateField={updateField} />;
      case 'facts':
        return <FactsSection formData={formData} updateField={updateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">FL-300 - Request for Order</h2>
          <Badge variant="secondary">
            Section {currentSection + 1} of {WIZARD_SECTIONS.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          {WIZARD_SECTIONS.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(idx)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                idx === currentSection
                  ? 'bg-blue-600'
                  : idx < currentSection
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`}
              title={section.title}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Header</span>
          <span>{WIZARD_SECTIONS[currentSection].title}</span>
          <span>Review</span>
        </div>
      </div>

      {/* Section Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = WIZARD_SECTIONS[currentSection].icon;
              return <Icon className="h-6 w-6 text-blue-600" />;
            })()}
            <div>
              <CardTitle>{WIZARD_SECTIONS[currentSection].title}</CardTitle>
              <CardDescription>
                Official FL-300 Items: {WIZARD_SECTIONS[currentSection].items.join(', ')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderSection()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              onClick={async () => {
                await handleSave();
                onBack();
              }}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summary
            </Button>
          )}
          {!onBack && (
            <Button variant="outline" onClick={handlePrevious} disabled={currentSection === 0 || isLoading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={handleSave} disabled={isSaving || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Progress'}
        </Button>

        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              onClick={async () => {
                await handleSave();
                onBack();
              }}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Save & Return
            </Button>
          ) : currentSection === WIZARD_SECTIONS.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Check className="h-4 w-4 mr-2" />
              Review & Submit
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Section Components

function HeaderSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          FL-300 is used to request court orders for child custody, visitation, support, and other family law matters.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-medium">Who is filing this Request for Order?</Label>
        <div className="mt-3 space-y-2">
          {[
            { value: 'petitioner', label: 'Petitioner' },
            { value: 'respondent', label: 'Respondent' },
            { value: 'other_parent_party', label: 'Other Parent/Party' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="filing_party"
                value={option.value}
                checked={formData.filing_party === option.value}
                onChange={(e) => updateField('filing_party', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="petitioner_name">Petitioner Name</Label>
          <Input
            id="petitioner_name"
            value={formData.petitioner_name}
            onChange={(e) => updateField('petitioner_name', e.target.value)}
            placeholder="Enter petitioner name"
          />
        </div>
        <div>
          <Label htmlFor="respondent_name">Respondent Name</Label>
          <Input
            id="respondent_name"
            value={formData.respondent_name}
            onChange={(e) => updateField('respondent_name', e.target.value)}
            placeholder="Enter respondent name"
          />
        </div>
        <div>
          <Label htmlFor="case_number">Case Number</Label>
          <Input
            id="case_number"
            value={formData.case_number || ''}
            onChange={(e) => updateField('case_number', e.target.value)}
            placeholder="Enter case number"
          />
        </div>
        <div>
          <Label htmlFor="other_parent">Other Parent/Party (if applicable)</Label>
          <Input
            id="other_parent"
            value={formData.other_parent_party_name || ''}
            onChange={(e) => updateField('other_parent_party_name', e.target.value)}
            placeholder="Enter name if applicable"
          />
        </div>
      </div>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Court Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>County</Label>
            <Input
              value={formData.court_county || ''}
              onChange={(e) => updateField('court_county', e.target.value)}
              placeholder="e.g., Los Angeles"
            />
          </div>
          <div>
            <Label>Branch Name</Label>
            <Input
              value={formData.court_branch_name || ''}
              onChange={(e) => updateField('court_branch_name', e.target.value)}
              placeholder="e.g., Stanley Mosk Courthouse"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Court Street Address</Label>
            <Input
              value={formData.court_street_address || ''}
              onChange={(e) => updateField('court_street_address', e.target.value)}
              placeholder="Court address"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestTypeSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertDescription>
          Select all the types of orders you are requesting from the court.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label className="text-base font-medium">This is a:</Label>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_request_for_order}
                onChange={(e) => updateField('is_request_for_order', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Request for Order</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_change_request}
                onChange={(e) => updateField('is_change_request', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Request to change current court order</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_temporary_emergency}
                onChange={(e) => updateField('is_temporary_emergency', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Request for Temporary Emergency Orders</span>
            </label>
          </div>
        </div>

        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">I am requesting the following orders:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_child_custody}
                onChange={(e) => updateField('request_child_custody', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Child Custody</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_child_visitation}
                onChange={(e) => updateField('request_child_visitation', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Child Visitation (Parenting Time)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_child_support}
                onChange={(e) => updateField('request_child_support', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Child Support</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_spousal_support}
                onChange={(e) => updateField('request_spousal_support', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Spousal or Domestic Partner Support</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_property_control}
                onChange={(e) => updateField('request_property_control', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Property Control</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.request_attorney_fees}
                onChange={(e) => updateField('request_attorney_fees', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span>Attorney's Fees and Costs</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={formData.request_other}
                onChange={(e) => updateField('request_other', e.target.checked)}
                className="h-4 w-4 mt-1 text-blue-600"
              />
              <div className="flex-1">
                <span>Other</span>
                {formData.request_other && (
                  <Input
                    className="mt-2"
                    value={formData.request_other_specify || ''}
                    onChange={(e) => updateField('request_other_specify', e.target.value)}
                    placeholder="Specify other orders requested"
                  />
                )}
              </div>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RestrainingSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  const restrainingInfo = formData.restraining_order_info || {
    has_existing_orders: false,
    between_parties: [],
  };

  const updateRestrainingInfo = (update: Partial<FL300RestrainingOrderInfo>) => {
    updateField('restraining_order_info', { ...restrainingInfo, ...update });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 1:</strong> Restraining Order Information. The court will want to know about any existing restraining orders.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={restrainingInfo.has_existing_orders}
          onChange={(e) => updateRestrainingInfo({ has_existing_orders: e.target.checked })}
          className="h-4 w-4 text-blue-600"
        />
        <span className="font-medium">There are existing restraining orders in effect</span>
      </label>

      {restrainingInfo.has_existing_orders && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Restraining orders are between (check all that apply):</Label>
              <div className="mt-2 space-y-2">
                {['petitioner', 'respondent', 'other_parent_party'].map((party) => (
                  <label key={party} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={restrainingInfo.between_parties.includes(party)}
                      onChange={(e) => {
                        const current = restrainingInfo.between_parties;
                        if (e.target.checked) {
                          updateRestrainingInfo({ between_parties: [...current, party] });
                        } else {
                          updateRestrainingInfo({ between_parties: current.filter((p) => p !== party) });
                        }
                      }}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="capitalize">{party.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label>Criminal Protective Order</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    placeholder="County/State"
                    value={restrainingInfo.criminal_order?.county_state || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        criminal_order: { ...restrainingInfo.criminal_order, county_state: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="Case Number"
                    value={restrainingInfo.criminal_order?.case_number || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        criminal_order: { ...restrainingInfo.criminal_order, case_number: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Family Law Restraining Order</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    placeholder="County/State"
                    value={restrainingInfo.family_order?.county_state || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        family_order: { ...restrainingInfo.family_order, county_state: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="Case Number"
                    value={restrainingInfo.family_order?.case_number || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        family_order: { ...restrainingInfo.family_order, case_number: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Juvenile Protective Order</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    placeholder="County/State"
                    value={restrainingInfo.juvenile_order?.county_state || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        juvenile_order: { ...restrainingInfo.juvenile_order, county_state: e.target.value },
                      })
                    }
                  />
                  <Input
                    placeholder="Case Number"
                    value={restrainingInfo.juvenile_order?.case_number || ''}
                    onChange={(e) =>
                      updateRestrainingInfo({
                        juvenile_order: { ...restrainingInfo.juvenile_order, case_number: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!restrainingInfo.has_existing_orders && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            No restraining orders indicated. You may proceed to the next section.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function CustodySection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  if (!formData.request_child_custody && !formData.request_child_visitation) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          You did not request child custody or visitation orders. This section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const addChild = () => {
    updateField('children', [...formData.children, { name: '' }]);
  };

  const updateChild = (index: number, field: keyof FL300Child, value: any) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    if (field === 'date_of_birth' && value) {
      newChildren[index].age = calculateAge(value);
    }
    updateField('children', newChildren);
  };

  const removeChild = (index: number) => {
    updateField('children', formData.children.filter((_, i) => i !== index));
  };

  const partyOptions = [
    { value: 'petitioner', label: 'Petitioner' },
    { value: 'respondent', label: 'Respondent' },
    { value: 'joint', label: 'Joint' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 2:</strong> Child Custody and Visitation (Parenting Time). Specify the children and custody arrangements requested.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.custody_request_temporary_emergency}
          onChange={(e) => updateField('custody_request_temporary_emergency', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span className="font-medium">Request temporary emergency orders</span>
      </label>

      {/* Children */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2a. Children for whom orders are requested</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.children.map((child, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-medium">Child {index + 1}</span>
                  {formData.children.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => removeChild(index)}>
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <Label>Child's Full Name</Label>
                    <Input
                      value={child.name}
                      onChange={(e) => updateChild(index, 'name', e.target.value)}
                      placeholder="Full legal name"
                    />
                  </div>
                  <div>
                    <Label>Birthdate</Label>
                    <Input
                      type="date"
                      value={child.date_of_birth || ''}
                      onChange={(e) => updateChild(index, 'date_of_birth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input value={child.age?.toString() || ''} disabled placeholder="Auto" />
                  </div>
                  <div>
                    <Label>Physical Custody to</Label>
                    <select
                      value={child.physical_custody_to || ''}
                      onChange={(e) => updateChild(index, 'physical_custody_to', e.target.value)}
                      className="w-full h-9 rounded-md border px-3"
                    >
                      <option value="">Select...</option>
                      {partyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Legal Custody to</Label>
                    <select
                      value={child.legal_custody_to || ''}
                      onChange={(e) => updateChild(index, 'legal_custody_to', e.target.value)}
                      className="w-full h-9 rounded-md border px-3"
                    >
                      <option value="">Select...</option>
                      {partyOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addChild}>
            + Add Child
          </Button>
        </CardContent>
      </Card>

      {/* Orders Requested */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2b. Orders requested</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Orders are requested for:</Label>
            <div className="mt-2 space-y-2">
              {['child_custody', 'visitation', 'both'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="custody_orders_for"
                    value={type}
                    checked={formData.custody_orders_for === type}
                    onChange={(e) => updateField('custody_orders_for', e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.custody_orders_in_attached_forms}
              onChange={(e) => updateField('custody_orders_in_attached_forms', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span>Orders are in attached forms</span>
          </label>

          {formData.custody_orders_in_attached_forms && (
            <div className="pl-6 space-y-2">
              {['FL-305', 'FL-311', 'FL-312', 'FL-341(C)', 'FL-341(D)', 'FL-341(E)'].map((form) => (
                <label key={form} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.custody_attached_forms.includes(form)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField('custody_attached_forms', [...formData.custody_attached_forms, form]);
                      } else {
                        updateField('custody_attached_forms', formData.custody_attached_forms.filter((f) => f !== form));
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span>{form}</span>
                </label>
              ))}
            </div>
          )}

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={formData.custody_orders_as_follows}
              onChange={(e) => updateField('custody_orders_as_follows', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <div className="flex-1">
              <span>Orders are as follows:</span>
              {formData.custody_orders_as_follows && (
                <Textarea
                  className="mt-2"
                  value={formData.custody_orders_specify || ''}
                  onChange={(e) => updateField('custody_orders_specify', e.target.value)}
                  placeholder="Describe the custody/visitation orders you are requesting..."
                  rows={4}
                />
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Best Interest Reasons */}
      <div>
        <Label>2c. The orders requested are in the best interest of the children because:</Label>
        <Textarea
          value={formData.custody_best_interest_reasons || ''}
          onChange={(e) => updateField('custody_best_interest_reasons', e.target.value)}
          placeholder="Explain why the requested orders are in the children's best interest..."
          rows={4}
          className="mt-2"
        />
      </div>

      {/* Change from Current Order */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={formData.custody_is_change}
          onChange={(e) => updateField('custody_is_change', e.target.checked)}
          className="h-4 w-4 mt-1 text-blue-600"
        />
        <div className="flex-1">
          <span className="font-medium">2d. This is a request to change a current custody/visitation order</span>
          {formData.custody_is_change && (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <Label>Current custody order date</Label>
                <Input
                  type="date"
                  value={formData.custody_change_custody_date || ''}
                  onChange={(e) => updateField('custody_change_custody_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Current visitation order date</Label>
                <Input
                  type="date"
                  value={formData.custody_change_visitation_date || ''}
                  onChange={(e) => updateField('custody_change_visitation_date', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

function ChildSupportSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  if (!formData.request_child_support) {
    return (
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          You did not request child support orders. This section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const addSupportRequest = () => {
    updateField('child_support_requests', [
      ...formData.child_support_requests,
      { child_name: '', use_guideline: true },
    ]);
  };

  const updateSupportRequest = (index: number, field: keyof FL300ChildSupportRequest, value: any) => {
    const newRequests = [...formData.child_support_requests];
    newRequests[index] = { ...newRequests[index], [field]: value };
    updateField('child_support_requests', newRequests);
  };

  const removeSupportRequest = (index: number) => {
    updateField('child_support_requests', formData.child_support_requests.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 3:</strong> Child Support. Specify support amounts for each child.
        </AlertDescription>
      </Alert>

      {/* Support Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3a. Child support for:</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.child_support_requests.map((request, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-medium">Child {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeSupportRequest(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Child's Name</Label>
                    <Input
                      value={request.child_name}
                      onChange={(e) => updateSupportRequest(index, 'child_name', e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={request.child_age || ''}
                      onChange={(e) => updateSupportRequest(index, 'child_age', parseInt(e.target.value) || undefined)}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <Label>Monthly Amount</Label>
                    <Input
                      type="number"
                      value={request.monthly_amount_requested || ''}
                      onChange={(e) =>
                        updateSupportRequest(index, 'monthly_amount_requested', parseFloat(e.target.value) || undefined)
                      }
                      placeholder="$ per month"
                      disabled={request.use_guideline}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={request.use_guideline}
                    onChange={(e) => updateSupportRequest(index, 'use_guideline', e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm">Use guideline support amount</span>
                </label>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addSupportRequest}>
            + Add Child
          </Button>
        </CardContent>
      </Card>

      {/* Change from Current Order */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={formData.child_support_is_change}
          onChange={(e) => updateField('child_support_is_change', e.target.checked)}
          className="h-4 w-4 mt-1 text-blue-600"
        />
        <div className="flex-1">
          <span className="font-medium">3b. Change current child support order</span>
          {formData.child_support_is_change && (
            <div className="mt-3">
              <Label>Current order date</Label>
              <Input
                type="date"
                value={formData.child_support_change_date || ''}
                onChange={(e) => updateField('child_support_change_date', e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}
        </div>
      </label>

      {/* Income Declaration */}
      <div className="space-y-2">
        <Label className="font-medium">3c. Required financial documents:</Label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.child_support_income_declaration_filed}
            onChange={(e) => updateField('child_support_income_declaration_filed', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Income and Expense Declaration (FL-150) has been filed</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.child_support_financial_statement_filed}
            onChange={(e) => updateField('child_support_financial_statement_filed', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Financial Statement (FL-155) has been filed</span>
        </label>
      </div>

      {/* Reasons */}
      <div>
        <Label>3d. Reasons for the child support request:</Label>
        <Textarea
          value={formData.child_support_reasons || ''}
          onChange={(e) => updateField('child_support_reasons', e.target.value)}
          placeholder="Explain why the child support order is needed..."
          rows={4}
          className="mt-2"
        />
      </div>
    </div>
  );
}

function SpousalSupportSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  if (!formData.request_spousal_support) {
    return (
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          You did not request spousal support orders. This section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 4:</strong> Spousal or Domestic Partner Support.
        </AlertDescription>
      </Alert>

      {/* Support Amount */}
      <div>
        <Label>4a. Monthly support amount requested:</Label>
        <div className="flex items-center gap-2 mt-2">
          <span>$</span>
          <Input
            type="number"
            value={formData.spousal_support_amount_monthly || ''}
            onChange={(e) => updateField('spousal_support_amount_monthly', parseFloat(e.target.value) || undefined)}
            placeholder="Amount"
            className="max-w-xs"
          />
          <span>per month</span>
        </div>
      </div>

      {/* Change/End Current Order */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">4b. Change or end current order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.spousal_support_change}
              onChange={(e) => updateField('spousal_support_change', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span>Change current spousal support order</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.spousal_support_end}
              onChange={(e) => updateField('spousal_support_end', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span>End (terminate) current spousal support order</span>
          </label>
          {(formData.spousal_support_change || formData.spousal_support_end) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Current order date</Label>
                <Input
                  type="date"
                  value={formData.spousal_support_order_date || ''}
                  onChange={(e) => updateField('spousal_support_order_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Current amount</Label>
                <Input
                  type="number"
                  value={formData.spousal_support_current_amount || ''}
                  onChange={(e) =>
                    updateField('spousal_support_current_amount', parseFloat(e.target.value) || undefined)
                  }
                  placeholder="$ per month"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-Judgment */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.spousal_support_post_judgment}
          onChange={(e) => updateField('spousal_support_post_judgment', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span>4c. This is a post-judgment modification request (FL-157 attached)</span>
      </label>

      {/* Income Declaration */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.spousal_support_income_declaration_filed}
          onChange={(e) => updateField('spousal_support_income_declaration_filed', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span>4d. Income and Expense Declaration (FL-150) has been filed</span>
      </label>

      {/* Reasons */}
      <div>
        <Label>4e. Reasons for the spousal support request:</Label>
        <Textarea
          value={formData.spousal_support_reasons || ''}
          onChange={(e) => updateField('spousal_support_reasons', e.target.value)}
          placeholder="Explain why the spousal support order is needed..."
          rows={4}
          className="mt-2"
        />
      </div>
    </div>
  );
}

function PropertySection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  if (!formData.request_property_control) {
    return (
      <Alert>
        <Home className="h-4 w-4" />
        <AlertDescription>
          You did not request property control orders. This section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  const addDebtPayment = () => {
    updateField('property_debt_payments', [
      ...formData.property_debt_payments,
      { pay_to: '', for_description: '', amount: 0 },
    ]);
  };

  const updateDebtPayment = (index: number, field: keyof FL300DebtPayment, value: any) => {
    const newPayments = [...formData.property_debt_payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    updateField('property_debt_payments', newPayments);
  };

  const removeDebtPayment = (index: number) => {
    updateField('property_debt_payments', formData.property_debt_payments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Home className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 5:</strong> Property Control. Request exclusive use of property or debt payment orders.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.property_request_temporary_emergency}
          onChange={(e) => updateField('property_request_temporary_emergency', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span className="font-medium">Request temporary emergency orders</span>
      </label>

      {/* Exclusive Use */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5a. Exclusive use of property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Grant exclusive use to:</Label>
            <div className="mt-2 space-y-2">
              {['petitioner', 'respondent', 'other_parent_party'].map((party) => (
                <label key={party} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="property_exclusive_use_party"
                    value={party}
                    checked={formData.property_exclusive_use_party === party}
                    onChange={(e) => updateField('property_exclusive_use_party', e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="capitalize">{party.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Property type:</Label>
            <div className="mt-2 space-y-2">
              {[
                { value: 'own_buying', label: 'Property we own or are buying' },
                { value: 'lease_rent', label: 'Property we lease or rent' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="property_type"
                    value={opt.value}
                    checked={formData.property_type === opt.value}
                    onChange={(e) => updateField('property_type', e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Property description:</Label>
            <Textarea
              value={formData.property_description || ''}
              onChange={(e) => updateField('property_description', e.target.value)}
              placeholder="Describe the property (address, description)..."
              rows={3}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Debt Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5b. Payment of debts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.property_debt_payments.map((payment, index) => (
            <Card key={index} className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-medium">Payment {index + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeDebtPayment(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Pay to</Label>
                    <Input
                      value={payment.pay_to}
                      onChange={(e) => updateDebtPayment(index, 'pay_to', e.target.value)}
                      placeholder="Creditor name"
                    />
                  </div>
                  <div>
                    <Label>For</Label>
                    <Input
                      value={payment.for_description}
                      onChange={(e) => updateDebtPayment(index, 'for_description', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={payment.amount || ''}
                      onChange={(e) => updateDebtPayment(index, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="$ amount"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addDebtPayment}>
            + Add Debt Payment
          </Button>
        </CardContent>
      </Card>

      {/* Change from Current Order */}
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={formData.property_is_change}
          onChange={(e) => updateField('property_is_change', e.target.checked)}
          className="h-4 w-4 mt-1 text-blue-600"
        />
        <div className="flex-1">
          <span className="font-medium">5c. Change current property order</span>
          {formData.property_is_change && (
            <div className="mt-3">
              <Label>Current order date</Label>
              <Input
                type="date"
                value={formData.property_change_date || ''}
                onChange={(e) => updateField('property_change_date', e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}
        </div>
      </label>

      {/* Reasons */}
      <div>
        <Label>5d. Reasons for the property control request:</Label>
        <Textarea
          value={formData.property_reasons || ''}
          onChange={(e) => updateField('property_reasons', e.target.value)}
          placeholder="Explain why the property control order is needed..."
          rows={4}
          className="mt-2"
        />
      </div>
    </div>
  );
}

function AttorneyFeesSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  if (!formData.request_attorney_fees) {
    return (
      <Alert>
        <Gavel className="h-4 w-4" />
        <AlertDescription>
          You did not request attorney's fees. This section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Gavel className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 6:</strong> Attorney's Fees and Costs. Request the other party pay your attorney's fees.
        </AlertDescription>
      </Alert>

      <div>
        <Label>Amount of attorney's fees requested:</Label>
        <div className="flex items-center gap-2 mt-2">
          <span>$</span>
          <Input
            type="number"
            value={formData.attorney_fees_amount || ''}
            onChange={(e) => updateField('attorney_fees_amount', parseFloat(e.target.value) || undefined)}
            placeholder="Amount"
            className="max-w-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-medium">Required documents:</Label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.attorney_fees_income_declaration_filed}
            onChange={(e) => updateField('attorney_fees_income_declaration_filed', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Income and Expense Declaration (FL-150) has been filed</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.attorney_fees_fl319_attached}
            onChange={(e) => updateField('attorney_fees_fl319_attached', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Request for Attorney's Fees (FL-319) is attached</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.attorney_fees_fl158_attached}
            onChange={(e) => updateField('attorney_fees_fl158_attached', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span>Supporting Declaration (FL-158) is attached</span>
        </label>
      </div>
    </div>
  );
}

function OtherOrdersSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 7:</strong> Other orders requested that are not covered in Items 1-6.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.other_orders_enabled}
          onChange={(e) => updateField('other_orders_enabled', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span className="font-medium">I am requesting other orders</span>
      </label>

      {formData.other_orders_enabled && (
        <div>
          <Label>Specify other orders requested:</Label>
          <Textarea
            value={formData.other_orders_specify || ''}
            onChange={(e) => updateField('other_orders_specify', e.target.value)}
            placeholder="Describe any other orders you are requesting from the court..."
            rows={6}
            className="mt-2"
          />
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={formData.other_orders_attachment_7}
              onChange={(e) => updateField('other_orders_attachment_7', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm">Continued on Attachment 7</span>
          </label>
        </div>
      )}
    </div>
  );
}

function UrgencySection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 8:</strong> Time for Service / Urgent Matters. Request shorter service time or earlier hearing.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.urgency_enabled}
          onChange={(e) => updateField('urgency_enabled', e.target.checked)}
          className="h-4 w-4 text-blue-600"
        />
        <span className="font-medium">I am requesting shortened time for service or earlier hearing</span>
      </label>

      {formData.urgency_enabled && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Number of days for service (instead of standard 16 court days):</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={formData.urgency_service_days || ''}
                  onChange={(e) => updateField('urgency_service_days', parseInt(e.target.value) || undefined)}
                  placeholder="Days"
                  className="max-w-xs"
                />
                <span>days before hearing</span>
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.urgency_hearing_sooner}
                onChange={(e) => updateField('urgency_hearing_sooner', e.target.checked)}
                className="h-4 w-4 text-amber-600"
              />
              <span>Request hearing sooner than the court's regular calendar allows</span>
            </label>

            <div>
              <Label>Reasons for urgency:</Label>
              <Textarea
                value={formData.urgency_reasons || ''}
                onChange={(e) => updateField('urgency_reasons', e.target.value)}
                placeholder="Explain why shortened time or earlier hearing is necessary. Include specific facts showing urgency or potential harm if standard time is used..."
                rows={4}
                className="mt-2"
              />
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.urgency_attachment_8}
                  onChange={(e) => updateField('urgency_attachment_8', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="text-sm">Continued on Attachment 8</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FactsSection({
  formData,
  updateField,
}: {
  formData: FL300FormData;
  updateField: <K extends keyof FL300FormData>(field: K, value: FL300FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 9:</strong> Facts to support this request. Provide the facts and circumstances supporting your request.
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> This is your declaration under penalty of perjury. State only facts you know to be true.
          Include dates, names, and specific details that support your request.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-medium">Facts to support the orders requested:</Label>
        <Textarea
          value={formData.facts_to_support || ''}
          onChange={(e) => updateField('facts_to_support', e.target.value)}
          placeholder="State the facts that support your request. Be specific:

- When did these circumstances occur?
- Who was involved?
- What happened?
- Why are the requested orders necessary?
- How will the orders benefit the children (if applicable)?

Example: 'On January 15, 2025, respondent informed me that... Since that time, the children have... I am requesting custody orders because...'"
          rows={12}
          className="mt-2"
        />
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={formData.facts_attachment_9}
            onChange={(e) => updateField('facts_attachment_9', e.target.checked)}
            className="h-4 w-4 text-blue-600"
          />
          <span className="text-sm">Continued on Attachment 9</span>
        </label>
      </div>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Signature</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.signature_date || ''}
              onChange={(e) => updateField('signature_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Print Name</Label>
            <Input
              value={formData.signatory_name || ''}
              onChange={(e) => updateField('signatory_name', e.target.value)}
              placeholder="Your printed name"
            />
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-green-50 border-green-200">
        <Check className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          You have completed all sections of the FL-300. Click "Review & Submit" to review your entries before submission.
        </AlertDescription>
      </Alert>
    </div>
  );
}
